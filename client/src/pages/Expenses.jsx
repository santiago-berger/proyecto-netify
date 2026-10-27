import { useEffect, useState } from "react";
import {
  Plus, Pencil, Trash2, Receipt, Check, X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, GripVertical,
} from "lucide-react";
import { api } from "../api/api.js";
import { Card } from "../components/ui/Card.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Field } from "../components/ui/Field.jsx";
import { money, shortDate, todayISO } from "../utils/format.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getPreference, savePreference } from "../utils/preferences.js";

const emptyForm = { amount: "", description: "", date: todayISO(), category_id: "" };
const PALETTE = ["#0edfdc", "#7c5cff", "#ffb020", "#ff5c8a", "#3ddc84", "#4d9dff", "#c86bfa", "#8fa3ad"];
const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const ORDER_PREF = "expense_category_order";
const PREVIEW_ROWS = 5;

const currentPeriod = () => {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
};

// groups the month's expenses by category: [{ id, name, color, total, expenses }]
const groupByCategory = (expenses) => {
  const groups = {};
  expenses.forEach((e) => {
    const id = e.category_id;
    groups[id] ||= { id, name: e.category?.name || "Sin categoría", color: e.category?.color || "#8fa3ad", total: 0, expenses: [] };
    groups[id].total += Number(e.amount);
    groups[id].expenses.push(e);
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

export default function Expenses() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(currentPeriod);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [order, setOrder] = useState(() => getPreference(user?.id, ORDER_PREF, []));
  const [expanded, setExpanded] = useState({});
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // creación rápida de categoría personalizada
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", color: PALETTE[0] });
  const [catError, setCatError] = useState("");

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

  const openNew = (categoryId) => {
    setEditing(null);
    // when browsing another month, the new expense defaults to the 1st of that month
    const date = isCurrent ? todayISO() : `${view.year}-${String(view.month).padStart(2, "0")}-01`;
    setForm({ ...emptyForm, date, category_id: categoryId || categories[0]?.id || "" });
    setErrors({}); setAddingCat(false);
    setOpen(true);
  };
  const openEdit = (e) => {
    setEditing(e);
    setForm({ amount: e.amount, description: e.description, date: e.date, category_id: e.category_id });
    setErrors({}); setAddingCat(false);
    setOpen(true);
  };

  const save = async () => {
    setErrors({});
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount), category_id: Number(form.category_id) };
      if (editing) await api.put(`/expenses/${editing.id}`, payload);
      else await api.post("/expenses", payload);
      setOpen(false);
      // jump to the month of the saved expense so the user sees it
      const [y, m] = form.date.split("-").map(Number);
      if (y !== view.year || m !== view.month) setView({ month: m, year: y });
      else await load();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        const map = {};
        data.errors.forEach((x) => { map[x.path] = x.msg; });
        setErrors(map);
      }
    } finally {
      setSaving(false);
    }
  };

  const createCategory = async () => {
    setCatError("");
    if (newCat.name.trim().length < 2) { setCatError("Poné un nombre válido"); return; }
    try {
      const { data } = await api.post("/categories", { name: newCat.name.trim(), color: newCat.color, icon: "tag" });
      const c = await api.get("/categories");
      setCategories(c.data);
      setForm((f) => ({ ...f, category_id: data.category.id }));
      setAddingCat(false);
      setNewCat({ name: "", color: PALETTE[0] });
    } catch (err) {
      setCatError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || "No se pudo crear");
    }
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      await load();
    } catch (err) {
      console.error("Error deleting expense:", err);
    }
  };

  if (loading) return <Spinner />;

  const groups = sortGroups(groupByCategory(expenses), order);
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
        sub="Tus gastos del mes agrupados por categoría. Arrastrá los bloques para ordenarlos."
        action={<button className="btn btn-primary btn-sm" onClick={() => openNew()}><Plus size={15} /> Nuevo gasto</button>}
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
            const showAll = expanded[g.id];
            const rows = showAll ? g.expenses : g.expenses.slice(0, PREVIEW_ROWS);
            const classes = ["expense-block", dragId === g.id && "dragging", overId === g.id && dragId !== g.id && "drag-over"].filter(Boolean).join(" ");
            return (
              <div
                key={g.id}
                className={classes}
                style={{ borderTopColor: g.color }}
                draggable
                onDragStart={(e) => { setDragId(g.id); e.dataTransfer.effectAllowed = "move"; }}
                onDragOver={(e) => { e.preventDefault(); setOverId(g.id); }}
                onDrop={(e) => { e.preventDefault(); dropOn(g.id); endDrag(); }}
                onDragEnd={endDrag}
              >
                <div className="expense-block-head">
                  <GripVertical size={16} className="drag-handle" />
                  <span className="cat-dot" style={{ background: g.color }} />
                  <div className="grow" style={{ minWidth: 0, flex: 1 }}>
                    <div className="r-title" style={{ fontWeight: 600 }}>{g.name}</div>
                    <div className="r-sub">{g.expenses.length} {g.expenses.length === 1 ? "gasto" : "gastos"} · {share}% del mes</div>
                  </div>
                  <div className="num" style={{ fontWeight: 600, fontSize: 16 }}>{money(g.total)}</div>
                </div>

                <div className="progress" style={{ height: 5, margin: "10px 0 4px" }}>
                  <span style={{ width: `${share}%`, background: g.color }} />
                </div>

                <div className="list">
                  {rows.map((e) => (
                    <div className="row" key={e.id} style={{ padding: "9px 0" }}>
                      <div className="grow">
                        <div className="r-title">{e.description}</div>
                        <div className="r-sub">{shortDate(e.date)}</div>
                      </div>
                      <div className="num">{money(e.amount)}</div>
                      <div className="flex" style={{ gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)} style={{ padding: 6 }} title="Editar"><Pencil size={13} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(e.id)} style={{ padding: 6 }} title="Eliminar"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex between center" style={{ marginTop: 8 }}>
                  <div className="flex" style={{ gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openNew(g.id)} style={{ padding: "6px 10px" }}><Plus size={13} /> Agregar</button>
                    {g.expenses.length > PREVIEW_ROWS && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setExpanded((x) => ({ ...x, [g.id]: !showAll }))} style={{ padding: "6px 10px" }}>
                        {showAll ? "Ver menos" : `Ver todos (${g.expenses.length})`}
                      </button>
                    )}
                  </div>
                  <div className="flex" style={{ gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => move(index, -1)} disabled={index === 0} style={{ padding: 6 }} title="Mover antes"><ChevronUp size={13} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => move(index, 1)} disabled={index === groups.length - 1} style={{ padding: 6 }} title="Mover después"><ChevronDown size={13} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <Modal title={editing ? "Editar gasto" : "Nuevo gasto"} onClose={() => setOpen(false)}>
          <Field label="Descripción" error={errors.description}>
            <input className="input" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ej: Supermercado" />
          </Field>
          <div className="grid-2" style={{ gap: 0, gridColumnGap: 12 }}>
            <Field label="Monto" error={errors.amount}>
              <input className="input" type="number" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Fecha" error={errors.date}>
              <input className="input" type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
          </div>

          {!addingCat ? (
            <Field label="Categoría" error={errors.category_id}>
              <div className="flex gap">
                <select className="select" value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAddingCat(true); setCatError(""); }} title="Crear categoría personalizada">
                  <Plus size={15} />
                </button>
              </div>
            </Field>
          ) : (
            <div className="field">
              <label>Nueva categoría personalizada</label>
              <div className="flex gap">
                <input className="input" autoFocus value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  placeholder="Ej: Mascotas" />
                <button type="button" className="btn btn-primary btn-sm" onClick={createCategory} style={{ padding: 9 }}><Check size={15} /></button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddingCat(false)} style={{ padding: 9 }}><X size={15} /></button>
              </div>
              <div className="flex gap" style={{ marginTop: 8 }}>
                {PALETTE.map((col) => (
                  <button key={col} type="button" onClick={() => setNewCat({ ...newCat, color: col })}
                    style={{ width: 22, height: 22, borderRadius: 6, background: col, cursor: "pointer",
                      border: newCat.color === col ? "2px solid #fff" : "1px solid #24393b" }} />
                ))}
              </div>
              {catError && <span className="field-error" style={{ marginTop: 6 }}>{catError}</span>}
            </div>
          )}

          <div className="flex gap mt" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}