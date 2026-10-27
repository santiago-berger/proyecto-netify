import { useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { api } from "../api/api.js";
import { Modal } from "./ui/Modal.jsx";
import { Field } from "./ui/Field.jsx";
import { todayISO } from "../utils/format.js";

// soft but clearly different hues
export const PALETTE = ["#3fc9c5", "#6f9fe0", "#9a8be6", "#c79bd8", "#e08fae", "#e3967e", "#d9b26a", "#86c99c", "#b9c46c", "#8fa3ad"];

// create / edit form for an expense, shared by "Gastos" and the category detail page
export const ExpenseModal = ({ expense, initialDate, initialCategoryId, categories, onCategoriesChange, onClose, onSaved }) => {
  const [form, setForm] = useState(() => (expense
    ? { amount: expense.amount, description: expense.description, date: expense.date, category_id: expense.category_id }
    : { amount: "", description: "", date: initialDate || todayISO(), category_id: initialCategoryId || categories[0]?.id || "" }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // creación rápida de categoría personalizada
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", color: PALETTE[0] });
  const [catError, setCatError] = useState("");

  const save = async () => {
    setErrors({});
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount), category_id: Number(form.category_id) };
      if (expense) await api.put(`/expenses/${expense.id}`, payload);
      else await api.post("/expenses", payload);
      await onSaved(form);
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        const map = {};
        data.errors.forEach((x) => { map[x.path] = x.msg; });
        setErrors(map);
      } else {
        console.error("Error saving expense:", err);
        setErrors({ description: "No se pudo guardar el gasto" });
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
      onCategoriesChange(c.data);
      setForm((f) => ({ ...f, category_id: data.category.id }));
      setAddingCat(false);
      setNewCat({ name: "", color: PALETTE[0] });
    } catch (err) {
      setCatError(err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || "No se pudo crear");
    }
  };

  return (
    <Modal title={expense ? "Editar gasto" : "Nuevo gasto"} onClose={onClose}>
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
                  border: newCat.color === col ? "2px solid var(--text)" : "1px solid var(--charcoal)" }} />
            ))}
          </div>
          {catError && <span className="field-error" style={{ marginTop: 6 }}>{catError}</span>}
        </div>
      )}

      <div className="flex gap mt" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </Modal>
  );
};
