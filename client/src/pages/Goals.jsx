import { useEffect, useState } from "react";
import { Plus, Trash2, PiggyBank, CircleDollarSign } from "lucide-react";
import { api } from "../api/api.js";
import { Card } from "../components/ui/Card.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Field } from "../components/ui/Field.jsx";
import { money, todayISO } from "../utils/format.js";

export default function Goals() {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [openNew, setOpenNew] = useState(false);
  const [openContrib, setOpenContrib] = useState(null);
  const [form, setForm] = useState({ name: "", target_amount: "" });
  const [contrib, setContrib] = useState({ amount: "", date: todayISO() });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null); // mensaje de avance tras un aporte

  const load = async () => {
    const { data } = await api.get("/goals");
    setGoals(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const createGoal = async () => {
    setErrors({});
    setSaving(true);
    try {
      await api.post("/goals", { ...form, target_amount: Number(form.target_amount) });
      setOpenNew(false);
      setForm({ name: "", target_amount: "" });
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

  const addContribution = async () => {
    setErrors({});
    setSaving(true);
    try {
      const goalId = openContrib.id;
      const goalName = openContrib.name;
      await api.post(`/goals/${goalId}/contributions`, {
        ...contrib, amount: Number(contrib.amount),
      });
      setOpenContrib(null);
      setContrib({ amount: "", date: todayISO() });
      const { data } = await api.get("/goals");
      setGoals(data);
      // busca la meta actualizada para informar el avance
      const g = data.find((x) => x.id === goalId);
      if (g) {
        const restante = Math.max(g.target_amount - g.saved, 0);
        setFeedback({
          name: goalName,
          percent: g.percent,
          completed: g.completed,
          restante,
        });
        setTimeout(() => setFeedback(null), 6000);
      }
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
    if (!confirm("¿Eliminar esta meta?")) return;
    await api.delete(`/goals/${id}`);
    await load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="page-grid">
      {feedback && (
        <div className="card" style={{ background: "rgba(14,223,220,.08)", border: "1px solid var(--teal-600)" }}>
          {feedback.completed ? (
            <div className="r-title" style={{ color: "var(--teal-200)" }}>
              🎉 ¡Felicitaciones! Alcanzaste tu meta “{feedback.name}” (100%).
            </div>
          ) : (
            <>
              <div className="r-title" style={{ color: "var(--teal-200)" }}>
                Aporte registrado en “{feedback.name}”. Vas {feedback.percent}% de tu meta.
              </div>
              <div className="progress mt"><span style={{ width: `${feedback.percent}%` }} /></div>
              <div className="muted mt" style={{ fontSize: 12.5 }}>
                Te faltan {money(feedback.restante)} para cumplirla.
              </div>
            </>
          )}
        </div>
      )}
      <Card
        title="Metas de ahorro"
        sub="Definí objetivos y registrá tus aportes para verlos crecer"
        action={<button className="btn btn-primary btn-sm" onClick={() => { setForm({ name: "", target_amount: "" }); setErrors({}); setOpenNew(true); }}><Plus size={15} /> Nueva meta</button>}
      >
        {goals.length === 0 ? (
          <Empty icon={PiggyBank} title="Todavía no tenés metas" hint="Creá una meta, por ejemplo “Fondo de emergencia”." />
        ) : (
          <div className="grid-2">
            {goals.map((g) => (
              <div className="card" key={g.id} style={{ background: "var(--panel-2)" }}>
                <div className="flex between center">
                  <div className="r-title">{g.name}</div>
                  <div className="flex center gap">
                    {g.completed && <span className="chip ok">¡Lograda!</span>}
                    <button className="btn btn-danger btn-sm" onClick={() => remove(g.id)} style={{ padding: 6 }}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div className="progress mt"><span style={{ width: `${g.percent}%` }} /></div>
                <div className="flex between mt" style={{ fontSize: 12.5 }}>
                  <span className="num muted">{money(g.saved)}</span>
                  <span className="num">{money(g.target_amount)}</span>
                </div>
                <button className="btn btn-ghost btn-sm mt btn-block" onClick={() => { setContrib({ amount: "", date: todayISO() }); setErrors({}); setOpenContrib(g); }}>
                  <CircleDollarSign size={14} /> Agregar aporte
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {openNew && (
        <Modal title="Nueva meta de ahorro" onClose={() => setOpenNew(false)}>
          <Field label="Nombre de la meta" error={errors.name}>
            <input className="input" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Fondo de emergencia" />
          </Field>
          <Field label="Monto objetivo" error={errors.target_amount}>
            <input className="input" type="number" value={form.target_amount}
              onChange={(e) => setForm({ ...form, target_amount: e.target.value })} placeholder="0" />
          </Field>
          <div className="flex gap mt" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => setOpenNew(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={createGoal} disabled={saving}>
              {saving ? "Guardando…" : "Crear meta"}
            </button>
          </div>
        </Modal>
      )}

      {openContrib && (
        <Modal title={`Aporte a “${openContrib.name}”`} onClose={() => setOpenContrib(null)}>
          <div className="grid-2" style={{ gap: 0, gridColumnGap: 12 }}>
            <Field label="Monto del aporte" error={errors.amount}>
              <input className="input" type="number" value={contrib.amount}
                onChange={(e) => setContrib({ ...contrib, amount: e.target.value })} placeholder="0" autoFocus />
            </Field>
            <Field label="Fecha" error={errors.date}>
              <input className="input" type="date" value={contrib.date}
                onChange={(e) => setContrib({ ...contrib, date: e.target.value })} />
            </Field>
          </div>
          <div className="flex gap mt" style={{ justifyContent: "flex-end" }}>
            <button className="btn btn-ghost" onClick={() => setOpenContrib(null)}>Cancelar</button>
            <button className="btn btn-primary" onClick={addContribution} disabled={saving}>
              {saving ? "Guardando…" : "Registrar aporte"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
