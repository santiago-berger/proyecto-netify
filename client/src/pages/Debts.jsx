import { useEffect, useState } from "react";
import { Plus, Trash2, Check, RotateCcw, CreditCard, Pencil } from "lucide-react";
import { api } from "../api/axios.js";
import { Card } from "../components/ui/Card.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Field } from "../components/ui/Field.jsx";
import { money, shortDate, todayISO } from "../utils/format.js";

const emptyForm = { creditor_name: "", amount: "", due_date: todayISO() };

export default function Debts() {
  const [loading, setLoading] = useState(true);
  const [debts, setDebts] = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const { data } = await api.get("/debts");
    setDebts(data.debts);
    setTotalPending(data.totalPending);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setErrors({}); setOpen(true); };

  const openEdit = (d) => {
    setEditing(d);
    setForm({ creditor_name: d.creditor_name, amount: d.amount, due_date: String(d.due_date).slice(0, 10) });
    setErrors({});
    setOpen(true);
  };

  const save = async () => {
    setErrors({});
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editing) await api.put(`/debts/${editing.id}`, payload);
      else await api.post("/debts", payload);
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

  const togglePaid = async (d) => {
    await api.put(`/debts/${d.id}`, { is_paid: !d.is_paid });
    await load();
  };
  const remove = async (id) => {
    if (!confirm("¿Eliminar esta deuda?")) return;
    await api.delete(`/debts/${id}`);
    await load();
  };

  if (loading) return <Spinner />;

  const isOverdue = (d) => !d.is_paid && new Date(d.due_date) < new Date(todayISO());

  return (
    <div className="page-grid">
      <div className="grid-4">
        <div className="hero" style={{ gridColumn: "span 2" }}>
          <div className="label">Total adeudado</div>
          <div className="value num">{money(totalPending)}</div>
          <div className="foot">{debts.filter((d) => !d.is_paid).length} deudas pendientes</div>
        </div>
        <div className="stat">
          <div className="label">Pagadas</div>
          <div className="value num">{debts.filter((d) => d.is_paid).length}</div>
        </div>
        <div className="stat">
          <div className="label">Vencidas</div>
          <div className="value num">{debts.filter(isOverdue).length}</div>
        </div>
      </div>

      <Card
        title="Panel de deudas"
        sub="Seguí a quién le debés y cuándo vence cada pago"
        action={<button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={15} /> Nueva deuda</button>}
      >
        {debts.length === 0 ? (
          <Empty icon={CreditCard} title="Sin deudas registradas" hint="Buenas noticias. Si tenés alguna, registrala acá." />
        ) : (
          <div className="list">
            {debts.map((d) => (
              <div className="row" key={d.id}>
                <div className="grow">
                  <div className="r-title" style={{ textDecoration: d.is_paid ? "line-through" : "none", opacity: d.is_paid ? 0.6 : 1 }}>
                    {d.creditor_name}
                  </div>
                  <div className="r-sub">Vence el {shortDate(d.due_date)}</div>
                </div>
                {d.is_paid ? <span className="chip ok">Pagada</span>
                  : isOverdue(d) ? <span className="chip danger">Vencida</span>
                  : <span className="chip warn">Pendiente</span>}
                <div className="num" style={{ width: 100, textAlign: "right" }}>{money(d.amount)}</div>
                <div className="flex gap">
                  <button className="btn btn-ghost btn-sm" onClick={() => togglePaid(d)} style={{ padding: 7 }} title={d.is_paid ? "Marcar como pendiente" : "Marcar como pagada"}>
                    {d.is_paid ? <RotateCcw size={14} /> : <Check size={14} />}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(d)} style={{ padding: 7 }} title="Editar"><Pencil size={14} /></button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(d.id)} style={{ padding: 7 }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {open && (
        <Modal title={editing ? "Editar deuda" : "Nueva deuda"} onClose={() => setOpen(false)}>
          <Field label="Acreedor (a quién le debés)" error={errors.creditor_name}>
            <input className="input" value={form.creditor_name}
              onChange={(e) => setForm({ ...form, creditor_name: e.target.value })} placeholder="Ej: Banco, Luis, tarjeta…" />
          </Field>
          <div className="grid-2" style={{ gap: 0, gridColumnGap: 12 }}>
            <Field label="Monto" error={errors.amount}>
              <input className="input" type="number" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
            </Field>
            <Field label="Vencimiento" error={errors.due_date}>
              <input className="input" type="date" value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
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
