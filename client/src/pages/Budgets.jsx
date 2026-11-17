import { useEffect, useState } from "react";
import { Plus, Trash2, Wallet, Pencil, PlusCircle, TrendingUp, TrendingDown, XCircle } from "lucide-react";
import { api } from "../api/api.js";
import { Card } from "../components/ui/Card.jsx";
import { Amount } from "../components/ui/Amount.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Field } from "../components/ui/Field.jsx";
import { Progress } from "../components/ui/Progress.jsx";
import { HistoryList } from "../components/ui/HistoryList.jsx";
import { dateTime, money } from "../utils/format.js";

// un registro del historial de topes -> fila de la lista
const toHistoryItem = (h) => {
  const name = h.category.name;
  if (h.action === "creado") {
    return {
      key: h.id, icon: PlusCircle, tone: "teal",
      title: `${name}: presupuesto creado`,
      sub: dateTime(h.changed_at),
      right: <><div className="muted history-caption">Tope inicial</div><Amount value={h.new_limit} className="num" /></>,
    };
  }
  if (h.action === "eliminado") {
    return {
      key: h.id, icon: XCircle, tone: "danger",
      title: `${name}: presupuesto eliminado`,
      sub: dateTime(h.changed_at),
      right: <><div className="muted history-caption">Tope que tenía</div><Amount value={h.previous_limit} className="num" /></>,
    };
  }
  const raised = h.difference > 0;
  return {
    // subir el tope habilita más gasto (ámbar); bajarlo es ajustar el control (verde)
    key: h.id, icon: raised ? TrendingUp : TrendingDown, tone: raised ? "warn" : "ok",
    title: `${name}: tope ${raised ? "aumentado" : "reducido"}`,
    sub: dateTime(h.changed_at),
    right: (
      <>
        <div className="num">
          <Amount value={h.previous_limit} className="muted" /> → <Amount value={h.new_limit} />
        </div>
        <div className={`history-caption ${raised ? "text-warn" : "text-ok"}`}>
          {raised ? "+" : "−"}{money(Math.abs(h.difference))}
        </div>
      </>
    ),
  };
};

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default function Budgets() {
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [status, setStatus] = useState([]);
  const [history, setHistory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [period, setPeriod] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ category_id: "", amount_limit: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [b, s, c, h] = await Promise.all([
      api.get("/budgets"),
      api.get("/budgets/status"),
      api.get("/categories"),
      api.get("/budgets/history"),
    ]);
    setBudgets(b.data.budgets);
    setPeriod({ month: b.data.month, year: b.data.year });
    setStatus(s.data.status);
    setHistory(h.data.history);
    setCategories(c.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // a category can only have one budget per month
  const usedCategoryIds = budgets.map((b) => b.category_id);
  const freeCategories = categories.filter((c) => !usedCategoryIds.includes(c.id));

  const openNew = () => {
    setEditing(null);
    setForm({ category_id: freeCategories[0]?.id || "", amount_limit: "" });
    setErrors({});
    setOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({ category_id: b.category_id, amount_limit: b.amount_limit });
    setErrors({});
    setOpen(true);
  };

  const save = async () => {
    setErrors({});
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/budgets/${editing.id}`, { amount_limit: Number(form.amount_limit) });
      } else {
        await api.post("/budgets", {
          amount_limit: Number(form.amount_limit),
          category_id: Number(form.category_id),
        });
      }
      setOpen(false);
      await load();
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

  const remove = async (id) => {
    if (!confirm("¿Eliminar este presupuesto?")) return;
    await api.delete(`/budgets/${id}`);
    await load();
  };

  if (loading) return <Spinner />;

  const statusByBudget = Object.fromEntries(status.map((s) => [s.budget_id, s]));
  const periodLabel = period ? `${MONTH_NAMES[period.month - 1]} ${period.year}` : "";

  return (
    <div className="page-grid">
      <Card
        title={`Presupuestos de ${periodLabel}`}
        sub="Fijá un tope por categoría para este mes y seguí cuánto llevás gastado"
        action={
          <button className="btn btn-primary btn-sm" onClick={openNew} disabled={freeCategories.length === 0}
            title={freeCategories.length === 0 ? "Ya todas tus categorías tienen presupuesto este mes" : undefined}>
            <Plus size={15} /> Nuevo presupuesto
          </button>
        }
      >
        {budgets.length === 0 ? (
          <Empty icon={Wallet} title={`Sin presupuestos para ${periodLabel}`} hint="Definí un tope por categoría para controlar tus gastos de este mes." />
        ) : (
          <div className="grid-2">
            {budgets.map((b) => {
              const st = statusByBudget[b.id];
              const spent = st?.spent ?? 0;
              const percent = st?.percent ?? 0;
              const state = st?.state ?? "ok";
              const chip = state === "excedido" ? "danger" : state === "alerta" ? "warn" : "ok";
              const label = state === "excedido" ? "Excedido" : state === "alerta" ? "Cerca del límite" : "En control";
              return (
                <div className="card" key={b.id} style={{ background: "var(--panel-2)" }}>
                  <div className="flex between center">
                    <div className="r-title">{b.category?.name}</div>
                    <div className="flex center gap">
                      <span className={`chip ${chip}`}>{label}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)} style={{ padding: 6 }} title="Editar tope"><Pencil size={13} /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(b.id)} style={{ padding: 6 }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="flex between mt" style={{ fontSize: 12.5 }}>
                    <span className="muted num"><Amount value={spent} /> gastado</span>
                    <span className="num"><Amount value={b.amount_limit} /></span>
                  </div>
                  <div className="mt"><Progress percent={percent} state={state} /></div>
                  <div className="right muted num" style={{ fontSize: 12, marginTop: 6 }}>{percent}%</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Historial de cambios" sub={`Altas, ajustes y bajas de los topes de ${periodLabel}`}>
        <HistoryList
          items={history.map(toHistoryItem)}
          emptyTitle="Todavía no hay cambios este mes"
          emptyHint="Cada vez que crees, edites o elimines un presupuesto va a quedar registrado acá."
        />
      </Card>

      {open && (
        <Modal title={editing ? `Editar presupuesto de ${editing.category?.name}` : `Nuevo presupuesto · ${periodLabel}`} onClose={() => setOpen(false)}>
          {!editing && (
            <Field label="Categoría" error={errors.category_id}>
              <select className="select" value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                {freeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
          <Field label={`Tope para ${periodLabel}`} error={errors.amount_limit}>
            <input className="input" type="number" value={form.amount_limit}
              onChange={(e) => setForm({ ...form, amount_limit: e.target.value })} placeholder="0" />
          </Field>
          <p className="muted" style={{ fontSize: 12.5, marginTop: 0 }}>
            El presupuesto vale solo para este mes. El mes que viene vas a poder fijar uno nuevo.
          </p>
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
