import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { api } from "../api/api.js";
import { Card } from "../components/ui/Card.jsx";
import { Amount } from "../components/ui/Amount.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Field } from "../components/ui/Field.jsx";
import { longDate, todayISO } from "../utils/format.js";

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const WEEK_DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const EVENT_TYPES = {
  income: { label: "Ingreso", chip: "ok" },
  payment: { label: "Pago", chip: "warn" },
  other: { label: "Otro", chip: "" },
  debt: { label: "Deuda", chip: "danger" },
};

const toISO = (year, month, day) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

// cells of the month grid, starting on Monday; null = empty cell
const buildMonthCells = (year, month) => {
  const firstWeekDay = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells = Array(firstWeekDay).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(toISO(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
};

const emptyForm = (date) => ({ title: "", date, type: "payment", amount: "" });

export default function Calendar() {
  const today = todayISO();
  const [view, setView] = useState(() => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  });
  const [selected, setSelected] = useState(today);
  const [reminders, setReminders] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm(today));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [r, d] = await Promise.all([
        api.get(`/reminders?month=${view.month}&year=${view.year}`),
        api.get("/debts"),
      ]);
      setReminders(r.data);
      setDebts(d.data.debts);
    } catch (err) {
      console.error("Error loading calendar:", err);
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

  const goToday = () => {
    const now = new Date();
    setView({ month: now.getMonth() + 1, year: now.getFullYear() });
    setSelected(today);
  };

  // reminders + unpaid debts, grouped by date
  const eventsByDate = {};
  const pushEvent = (date, event) => {
    const key = String(date).slice(0, 10);
    (eventsByDate[key] ||= []).push(event);
  };
  reminders.forEach((r) => pushEvent(r.date, { ...r, kind: "reminder" }));
  debts
    .filter((d) => !d.is_paid)
    .forEach((d) => pushEvent(d.due_date, {
      id: d.id, kind: "debt", type: "debt", title: d.creditor_name, amount: d.amount, date: d.due_date,
    }));

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm(selected));
    setErrors({});
    setOpen(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({ title: r.title, date: String(r.date).slice(0, 10), type: r.type, amount: r.amount ?? "" });
    setErrors({});
    setOpen(true);
  };

  const save = async () => {
    setErrors({});
    setSaving(true);
    try {
      const payload = { ...form, amount: form.amount === "" ? null : Number(form.amount) };
      if (editing) await api.put(`/reminders/${editing.id}`, payload);
      else await api.post("/reminders", payload);
      setOpen(false);
      setSelected(form.date);
      await load();
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        const map = {};
        data.errors.forEach((x) => { map[x.path] = x.msg; });
        setErrors(map);
      } else {
        console.error("Error saving reminder:", err);
        setErrors({ title: "No se pudo guardar el recordatorio" });
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("¿Eliminar este recordatorio?")) return;
    try {
      await api.delete(`/reminders/${id}`);
      await load();
    } catch (err) {
      console.error("Error deleting reminder:", err);
    }
  };

  if (loading) return <Spinner />;

  const cells = buildMonthCells(view.year, view.month);
  const selectedEvents = eventsByDate[selected] || [];

  return (
    <div className="page-grid">
      <Card
        title="Calendario"
        sub="Tu agenda de pagos, ingresos, préstamos y vencimientos"
        action={<button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={15} /> Nuevo recordatorio</button>}
      >
        <div className="flex between center" style={{ marginBottom: 14 }}>
          <div className="flex center gap">
            <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(-1)} style={{ padding: 7 }}><ChevronLeft size={15} /></button>
            <div className="r-title" style={{ minWidth: 140, textAlign: "center", fontWeight: 600 }}>
              {MONTH_NAMES[view.month - 1]} {view.year}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(1)} style={{ padding: 7 }}><ChevronRight size={15} /></button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={goToday}>Hoy</button>
        </div>

        <div className="calendar">
          {WEEK_DAYS.map((d) => <div key={d} className="calendar-weekday">{d}</div>)}
          {cells.map((date, i) => {
            if (!date) return <div key={`e-${i}`} className="calendar-cell empty-cell" />;
            const events = eventsByDate[date] || [];
            const classes = ["calendar-cell", date === today && "today", date === selected && "selected"].filter(Boolean).join(" ");
            return (
              <div key={date} className={classes} onClick={() => setSelected(date)}>
                <div className="calendar-day num">{Number(date.slice(8))}</div>
                <div className="calendar-events">
                  {events.slice(0, 2).map((e) => (
                    <div key={`${e.kind}-${e.id}`} className={`calendar-event ${(EVENT_TYPES[e.type] || EVENT_TYPES.other).chip || ""}`}>{e.title}</div>
                  ))}
                  {events.length > 2 && <div className="calendar-more">+{events.length - 2} más</div>}
                </div>
                {events.length > 0 && (
                  <div className="calendar-dots">
                    {events.slice(0, 3).map((e) => <span key={`${e.kind}-${e.id}`} className={`calendar-dot ${(EVENT_TYPES[e.type] || EVENT_TYPES.other).chip || ""}`} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap mt" style={{ flexWrap: "wrap" }}>
          {Object.entries(EVENT_TYPES).map(([key, t]) => (
            <span key={key} className={`chip ${t.chip}`}>{t.label}</span>
          ))}
        </div>
      </Card>

      <Card title={longDate(selected)} sub={selected === today ? "Hoy" : undefined}>
        {selectedEvents.length === 0 ? (
          <Empty icon={CalendarDays} title="Nada agendado este día" hint="Usá “Nuevo recordatorio” para agregar uno." />
        ) : (
          <div className="list">
            {selectedEvents.map((e) => (
              <div className="row" key={`${e.kind}-${e.id}`}>
                <div className="grow">
                  <div className="r-title">{e.title}</div>
                  {e.kind === "debt" && <div className="r-sub">Vencimiento de deuda · <Link to="/deudas" style={{ color: "var(--teal-200)" }}>ver deudas</Link></div>}
                </div>
                <span className={`chip ${(EVENT_TYPES[e.type] || EVENT_TYPES.other).chip || ""}`}>{(EVENT_TYPES[e.type] || EVENT_TYPES.other).label}</span>
                {e.amount != null && <div className="num" style={{ width: 100, textAlign: "right" }}><Amount value={e.amount} /></div>}
                {e.kind === "reminder" && (
                  <div className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)} style={{ padding: 7 }} title="Editar"><Pencil size={14} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(e.id)} style={{ padding: 7 }} title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {open && (
        <Modal title={editing ? "Editar recordatorio" : "Nuevo recordatorio"} onClose={() => setOpen(false)}>
          <Field label="Título" error={errors.title}>
            <input className="input" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Cobro de sueldo, cuota del préstamo…" />
          </Field>
          <div className="grid-2" style={{ gap: 0, gridColumnGap: 12 }}>
            <Field label="Fecha" error={errors.date}>
              <input className="input" type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Tipo" error={errors.type}>
              <select className="select" value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {["income", "payment", "other"].map((t) => (
                  <option key={t} value={t}>{EVENT_TYPES[t].label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Monto (opcional)" error={errors.amount}>
            <input className="input" type="number" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
          </Field>
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
