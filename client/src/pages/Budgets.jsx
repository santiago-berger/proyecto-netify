import { useEffect, useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import { api } from "../api/api.js";
import { Card } from "../components/ui/Card.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Field } from "../components/ui/Field.jsx";
import { Progress } from "../components/ui/Progress.jsx";
import { money } from "../utils/format.js";

const now = new Date();

export default function Budgets() {
  const [loading, setLoading] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [status, setStatus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    category_id: "", amount_limit: "",
    month: now.getMonth() + 1, year: now.getFullYear(),
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [b, s, c] = await Promise.all([
      api.get("/budgets"),
      api.get("/budgets/status"),
      api.get("/categories"),
    ]);
    setBudgets(b.data);
    setStatus(s.data.status);
    setCategories(c.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm({
      category_id: categories[0]?.id || "", amount_limit: "",
      month: now.getMonth() + 1, year: now.getFullYear(),
    });
    setErrors({});
    setOpen(true);
  };

  const save = async () => {
    setErrors({});
    setSaving(true);
    try {
      await api.post("/budgets", {
        ...form,
        amount_limit: Number(form.amount_limit),
        category_id: Number(form.category_id),
        month: Number(form.month),
        year: Number(form.year),
      });
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

  return (
    <div className="page-grid">
      <Card
        title="Presupuestos por categoría"
        sub="Fijá un tope mensual y seguí cuánto llevás gastado"
        action={<button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={15} /> Nuevo presupuesto</button>}
      >
        {budgets.length === 0 ? (
          <Empty icon={Wallet} title="Sin presupuestos" hint="Definí un tope por categoría para controlar tus gastos." />
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
                      <button className="btn btn-danger btn-sm" onClick={() => remove(b.id)} style={{ padding: 6 }}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="flex between mt" style={{ fontSize: 12.5 }}>
                    <span className="muted num">{money(spent)} gastado</span>
                    <span className="num">{money(b.amount_limit)}</span>
                  </div>
                  <div className="progress mt"><Progress percent={percent} state={state} /></div>
                  <div className="right muted num" style={{ fontSize: 12, marginTop: 6 }}>{percent}%</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {open && (
        <Modal title="Nuevo presupuesto" onClose={() => setOpen(false)}>
          <Field label="Categoría" error={errors.category_id}>
            <select className="select" value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Tope mensual" error={errors.amount_limit}>
            <input className="input" type="number" value={form.amount_limit}
              onChange={(e) => setForm({ ...form, amount_limit: e.target.value })} placeholder="0" />
          </Field>
          <div className="grid-2" style={{ gap: 0, gridColumnGap: 12 }}>
            <Field label="Mes" error={errors.month}>
              <select className="select" value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </Field>
            <Field label="Año" error={errors.year}>
              <input className="input" type="number" value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })} />
            </Field>
          </div>
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
