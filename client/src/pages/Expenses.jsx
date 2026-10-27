import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Plus, Receipt, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, GripVertical, ArrowRight,
} from "lucide-react";
import { api } from "../api/api.js";
import { Card } from "../components/ui/Card.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";
import { ExpenseModal, PALETTE } from "../components/ExpenseModal.jsx";
import { money, todayISO } from "../utils/format.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getPreference, savePreference } from "../utils/preferences.js";

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const ORDER_PREF = "expense_category_order";

const currentPeriod = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

// groups the month's expenses by category: [{ id, name, color, total, count }]
// colorById holds the user's colors (base categories can have a personal color)
const groupByCategory = (expenses, colorById) => {
  const groups = {};
  expenses.forEach((e) => {
    const id = e.category_id;
    const color = colorById[id] || e.category?.color || "#8fa3ad";
    groups[id] ||= { id, name: e.category?.name || "Sin categoría", color, total: 0, count: 0 };
    groups[id].total += Number(e.amount);
    groups[id].count += 1;
  });
  return Object.values(groups);
};

// saved order first; categories never ordered go last, biggest spending first
const sortGroups = (groups, savedOrder) => {
  const position = (id) => {
    const i = savedOrder.indexOf(id);
    return i === -1 ? Infinity : i;
  };
  return [...groups].sort((a, b) => position(a.id) - position(b.id) || b.total - a.total);
};

// buttons inside a block must not open the category page
const stop = (handler) => (e) => {
  e.stopPropagation();
  handler?.(e);
};

export default function Expenses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  // when coming back from a category page, keep the month the user was looking at
  const [view, setView] = useState(() => {
    const { month, year } = location.state || {};
    return month && year ? { month, year } : currentPeriod();
  });
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [order, setOrder] = useState(() => getPreference(user?.id, ORDER_PREF, []));
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [colorPickerFor, setColorPickerFor] = useState(null);
  const colorTimer = useRef(null);
  const [modal, setModal] = useState(null); // { initialDate } while creating

  const load = async () => {
    try {
      const [e, c] = await Promise.all([
        api.get(`/expenses?month=${view.month}&year=${view.year}`),
        api.get("/categories"),
      ]);
      setExpenses(e.data);
      setCategories(c.data);
    } catch (err) {
      console.error("Error loading expenses:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [view.month, view.year]);

  const changeMonth = (delta) => {
    setView(({ month, year }) => {
      const date = new Date(year, month - 1 + delta, 1);
      return { month: date.getMonth() + 1, year: date.getFullYear() };
    });
  };

  const now = currentPeriod();
  const isCurrent = view.month === now.month && view.year === now.year;

  // when browsing another month, the new expense defaults to the 1st of that month
  const openNew = () => {
    const initialDate = isCurrent ? todayISO() : `${view.year}-${String(view.month).padStart(2, "0")}-01`;
    setModal({ initialDate });
  };

  // jump to the month of the saved expense so the user sees it
  const onSaved = async (form) => {
    setModal(null);
    const [y, m] = form.date.split("-").map(Number);
    if (y !== view.year || m !== view.month) setView({ month: m, year: y });
    else await load();
  };

  const changeColor = async (categoryId, color) => {
    try {
      await api.put(`/categories/${categoryId}/color`, { color });
      setCategories((list) => list.map((c) => (c.id === categoryId ? { ...c, color } : c)));
      setColorPickerFor(null);
    } catch (err) {
      console.error("Error changing category color:", err);
    }
  };

  // the native color input fires on every mouse move: wait until the user stops
  const changeColorDebounced = (categoryId, color) => {
    clearTimeout(colorTimer.current);
    colorTimer.current = setTimeout(() => changeColor(categoryId, color), 400);
  };

  if (loading) return <Spinner />;

  const colorById = Object.fromEntries(categories.map((c) => [c.id, c.color]));
  const groups = sortGroups(groupByCategory(expenses, colorById), order);
  const total = groups.reduce((acc, g) => acc + g.total, 0);
  const periodLabel = `${MONTH_NAMES[view.month - 1]} ${view.year}`;

  // keeps the order of categories not shown this month after the visible ones
  const saveOrder = (visibleIds) => {
    const next = [...visibleIds, ...order.filter((id) => !visibleIds.includes(id))];
    setOrder(next);
    savePreference(user?.id, ORDER_PREF, next);
  };

  const move = (index, delta) => {
    const ids = groups.map((g) => g.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    saveOrder(ids);
  };

  const dropOn = (targetId) => {
    if (dragId === null || dragId === targetId) return;
    const ids = groups.map((g) => g.id).filter((id) => id !== dragId);
    ids.splice(ids.indexOf(targetId), 0, dragId);
    saveOrder(ids);
  };

  const endDrag = () => { setDragId(null); setOverId(null); };

  return (
    <div className="page-grid">
      <Card
        title="Mis gastos"
        sub="Tus gastos del mes agrupados por categoría. Tocá un bloque para ver sus gastos o arrastralo para ordenarlo."
        action={<button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={15} /> Nuevo gasto</button>}
      >
        <div className="flex between center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div className="flex center gap">
            <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(-1)} style={{ padding: 7 }} title="Mes anterior"><ChevronLeft size={15} /></button>
            <div className="r-title" style={{ minWidth: 140, textAlign: "center", fontWeight: 600 }}>{periodLabel}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(1)} style={{ padding: 7 }} title="Mes siguiente"><ChevronRight size={15} /></button>
            {!isCurrent && <button className="btn btn-ghost btn-sm" onClick={() => setView(currentPeriod())}>Mes actual</button>}
          </div>
          <div className="right">
            <div className="muted" style={{ fontSize: 12 }}>Total del mes</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 600 }}>{money(total)}</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {expenses.length} {expenses.length === 1 ? "gasto" : "gastos"} en {groups.length} {groups.length === 1 ? "categoría" : "categorías"}
            </div>
          </div>
        </div>
      </Card>

      {groups.length === 0 ? (
        <Card>
          <Empty icon={Receipt} title={`No registraste gastos en ${periodLabel}`} hint="Usá “Nuevo gasto” para cargar uno." />
        </Card>
      ) : (
        <div className="expense-blocks">
          {groups.map((g, index) => {
            const share = total ? Math.round((g.total / total) * 100) : 0;
            const classes = ["expense-block", "clickable", dragId === g.id && "dragging", overId === g.id && dragId !== g.id && "drag-over"].filter(Boolean).join(" ");
            return (
              <div
                key={g.id}
                className={classes}
                style={{ borderTopColor: g.color }}
                draggable
                onClick={() => navigate(`/gastos/categoria/${g.id}?month=${view.month}&year=${view.year}`)}
                onDragStart={(e) => { setDragId(g.id); e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={(e) => { e.preventDefault(); setOverId(g.id); }}
                onDrop={(e) => { e.preventDefault(); dropOn(g.id); endDrag(); }}
                onDragEnd={endDrag}
              >
                <div className="expense-block-head">
                  <GripVertical size={16} className="drag-handle" onClick={stop()} />
                  <button type="button" className="cat-dot cat-dot-btn" style={{ background: g.color }}
                    onClick={stop(() => setColorPickerFor(colorPickerFor === g.id ? null : g.id))} title="Cambiar color" />
                  <div className="grow" style={{ minWidth: 0, flex: 1 }}>
                    <div className="r-title" style={{ fontWeight: 600 }}>{g.name}</div>
                    <div className="r-sub">{g.count} {g.count === 1 ? "gasto" : "gastos"} · {share}% del mes</div>
                  </div>
                  <div className="num" style={{ fontWeight: 600, fontSize: 16 }}>{money(g.total)}</div>
                </div>

                {colorPickerFor === g.id && (
                  <div className="color-picker" onClick={stop()}>
                    {PALETTE.map((col) => (
                      <button key={col} type="button" className={`swatch ${g.color.toLowerCase() === col ? "active" : ""}`}
                        style={{ background: col }} onClick={() => changeColor(g.id, col)} title={col} />
                    ))}
                    <label className="swatch swatch-custom" title="Elegir otro color">
                      <input type="color" defaultValue={g.color} onChange={(e) => changeColorDebounced(g.id, e.target.value)} />
                    </label>
                  </div>
                )}

                <div className="progress" style={{ height: 5, margin: "12px 0 10px" }}>
                  <span style={{ width: `${share}%`, background: g.color }} />
                </div>

                <div className="flex between center">
                  <span className="block-link">Ver gastos <ArrowRight size={13} /></span>
                  <div className="flex" style={{ gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={stop(() => move(index, -1))} disabled={index === 0} style={{ padding: 6 }} title="Mover antes"><ChevronUp size={13} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={stop(() => move(index, 1))} disabled={index === groups.length - 1} style={{ padding: 6 }} title="Mover después"><ChevronDown size={13} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ExpenseModal
          initialDate={modal.initialDate}
          categories={categories}
          onCategoriesChange={setCategories}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
