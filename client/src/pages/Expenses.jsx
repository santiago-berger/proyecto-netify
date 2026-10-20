import Tesseract from "tesseract.js";
import { parseReceipt } from "../utils/receipt.js";
import { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, Receipt, Check, X, ScanLine } from "lucide-react";
import { api } from "../api/api.js";
import { Card } from "../components/ui/Card.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";
import { Modal } from "../components/ui/Modal.jsx";
import { Field } from "../components/ui/Field.jsx";
import { money, shortDate, todayISO } from "../utils/format.js";

const emptyForm = { amount: "", description: "", date: todayISO(), category_id: "" };
const PALETTE = ["#0edfdc", "#7c5cff", "#ffb020", "#ff5c8a", "#3ddc84", "#4d9dff", "#c86bfa", "#8fa3ad"];

export default function Expenses() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // creación rápida de categoría personalizada
  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", color: PALETTE[0] });
  const [catError, setCatError] = useState("");

  const receiptRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanError, setScanError] = useState("");

  const load = async () => {
    const [e, c] = await Promise.all([api.get("/expenses"), api.get("/categories")]);
    setExpenses(e.data);
    setCategories(c.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ ...emptyForm, category_id: categories[0]?.id || "" });
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
    await api.delete(`/expenses/${id}`);
    await load();
  };

  const onPickReceipt = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanError("");
    setScanning(true);
    setScanProgress(0);
    try {
      const { data } = await Tesseract.recognize(file, "spa", {
        logger: (m) => { if (m.status === "recognizing text") setScanProgress(Math.round(m.progress * 100)); },
      });
      const d = parseReceipt(data.text);
      setEditing(null);
      setForm((f) => ({
        ...f,
        amount: d.amount || "",
        description: d.description || "",
        date: d.date || todayISO(),
        category_id: categories[0]?.id || f.category_id || "",
      }));
      setScanning(false);
      setOpen(true);
    } catch {
      setScanning(false);
      setScanError("No se pudo leer la imagen. Probá con una captura más nítida.");
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="page-grid">
      <Card
        title="Mis gastos"
        sub="Registrá y organizá cada gasto por categoría"
        action={
          <div className="flex gap">
            <button className="btn btn-ghost btn-sm" onClick={() => receiptRef.current?.click()}>
              <ScanLine size={15} /> Escanear captura
            </button>
            <button className="btn btn-primary btn-sm" onClick={openNew}><Plus size={15} /> Nuevo gasto</button>
          </div>
        }
      >
        {scanError && <div className="field-error" style={{ marginBottom: 12 }}>{scanError}</div>}

        {expenses.length === 0 ? (
          <Empty icon={Receipt} title="Todavía no cargaste gastos" hint="Usá “Nuevo gasto” o escaneá una captura." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Descripción</th><th>Categoría</th><th>Fecha</th>
                  <th className="right">Monto</th><th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.description}</td>
                    <td>
                      <span className="chip teal" style={e.category?.color ? { color: e.category.color, borderColor: e.category.color + "55", background: e.category.color + "1a" } : {}}>
                        {e.category?.name}
                      </span>
                    </td>
                    <td className="muted">{shortDate(e.date)}</td>
                    <td className="right num">{money(e.amount)}</td>
                    <td className="right">
                      <div className="flex gap" style={{ justifyContent: "flex-end" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)} style={{ padding: 7 }}><Pencil size={14} /></button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(e.id)} style={{ padding: 7 }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <input ref={receiptRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPickReceipt} />

      {scanning && (
        <div className="modal-backdrop">
          <div className="modal" style={{ textAlign: "center" }}>
            <h3 style={{ marginBottom: 6 }}>Leyendo la captura…</h3>
            <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>Detectando monto, fecha y concepto.</p>
            <div className="progress mt"><span style={{ width: `${scanProgress}%` }} /></div>
            <div className="muted num mt" style={{ fontSize: 12 }}>{scanProgress}%</div>
          </div>
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