import { useEffect, useRef, useState } from "react";
import { Save, Camera, SlidersHorizontal, Check } from "lucide-react";
import { api } from "../api/api.js";
import { Card } from "../components/ui/Card.jsx";
import { Amount } from "../components/ui/Amount.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Field } from "../components/ui/Field.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { TOOLS } from "../utils/modules.js";

export default function Profile() {
  const { user, reload, modules, updateModules } = useAuth();
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ first_name: "", last_name: "", monthly_income: "", avatar_url: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [prefsOk, setPrefsOk] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await api.get("/auth/me");
      setForm({
        first_name: data.profile?.first_name || "",
        last_name: data.profile?.last_name || "",
        monthly_income: data.profile?.monthly_income || "",
        avatar_url: data.profile?.avatar_url || "",
      });
      setLoading(false);
    };
    load();
  }, []);

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, avatar_url: "La imagen no puede superar los 2 MB" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setErrors((prev) => ({ ...prev, avatar_url: undefined }));
      setForm((f) => ({ ...f, avatar_url: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setErrors({});
    setOk(false);
    setSaving(true);
    try {
      await api.put("/auth/profile", {
        first_name: form.first_name,
        last_name: form.last_name,
        monthly_income: Number(form.monthly_income) || 0,
        avatar_url: form.avatar_url,
      });
      setOk(true);
      await reload();
      setTimeout(() => setOk(false), 3000);
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

  const toggleTool = (key) => {
    updateModules({ ...modules, [key]: !modules?.[key] });
    setPrefsOk(true);
    setTimeout(() => setPrefsOk(false), 2000);
  };

  if (loading) return <Spinner />;

  const initial = (form.first_name[0] || user?.username?.[0] || "U").toUpperCase();

  return (
    <div className="page-grid" style={{ maxWidth: 720 }}>
      {/* encabezado del perfil */}
      <Card>
        <div className="flex center gap" style={{ marginBottom: 4 }}>
          <div
            style={{ position: "relative", width: 84, height: 84, cursor: "pointer", flexShrink: 0 }}
            onClick={() => fileRef.current?.click()}
            title="Cambiar foto"
          >
            <div className="avatar" style={{ width: 84, height: 84, fontSize: 30, overflow: "hidden" }}>
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Foto de perfil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                initial
              )}
            </div>
            <span style={{
              position: "absolute", bottom: 0, right: 0, width: 28, height: 28,
              borderRadius: "50%", background: "var(--teal-600)", color: "#04191a",
              display: "grid", placeItems: "center", border: "2px solid var(--panel)",
            }}>
              <Camera size={14} />
            </span>
          </div>
          <div className="grow">
            <h2 style={{ fontSize: 20 }}>{form.first_name} {form.last_name}</h2>
            <div className="muted" style={{ fontSize: 13 }}>@{user?.username} · {user?.email}</div>
            <div className="chip teal" style={{ marginTop: 8 }}>Ingreso ref.: <Amount value={form.monthly_income} /></div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPickImage} />
        </div>
        {errors.avatar_url && <div className="field-error">{errors.avatar_url}</div>}
      </Card>

      {/* datos personales */}
      <Card title="Datos personales" sub="Actualizá tu información">
        <div className="grid-2" style={{ gap: 0, gridColumnGap: 12 }}>
          <Field label="Nombre" error={errors.first_name}>
            <input className="input" value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </Field>
          <Field label="Apellido" error={errors.last_name}>
            <input className="input" value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </Field>
        </div>
        <Field label="Ingreso mensual" error={errors.monthly_income}>
          <input className="input" type="number" value={form.monthly_income}
            onChange={(e) => setForm({ ...form, monthly_income: e.target.value })} />
        </Field>

        <div className="flex center gap mt">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            <Save size={15} /> {saving ? "Guardando…" : "Guardar cambios"}
          </button>
          {ok && <span className="chip ok">Cambios guardados</span>}
        </div>
      </Card>

      {/* preferencias: herramientas visibles (plantilla) */}
      <Card
        title="Herramientas de tu plataforma"
        sub="Activá o desactivá las secciones según lo que necesites"
        action={<SlidersHorizontal size={17} className="muted" />}
      >
        <div className="list">
          {TOOLS.map((t) => {
            const on = !!modules?.[t.key];
            return (
              <div className="row" key={t.key}>
                <div className="grow r-title" style={{ fontWeight: 500 }}>{t.label}</div>
                <button
                  className={`btn btn-sm ${on ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => toggleTool(t.key)}
                >
                  {on ? <><Check size={14} /> Activada</> : "Desactivada"}
                </button>
              </div>
            );
          })}
        </div>
        {prefsOk && <div className="chip ok mt">Preferencias actualizadas</div>}
        <div className="muted mt" style={{ fontSize: 12.5 }}>
          “Resumen” y “Gastos” están siempre disponibles porque son la base de la app.
        </div>
      </Card>
    </div>
  );
}
