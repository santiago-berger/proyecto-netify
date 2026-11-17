import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Field } from "../components/ui/Field.jsx";

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: "", last_name: "", username: "", email: "",
    password: "", monthly_income: "",
  });
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    setGeneral("");
    setLoading(true);
    try {
      // el ingreso se envía tal cual: el backend valida que esté cargado y sea mayor a 0
      await register(form);
      // inicia sesión automáticamente tras registrarse
      await login(form.username, form.password);
      navigate("/");
    } catch (err) {
      const data = err.response?.data;
      if (data?.errors) {
        const map = {};
        data.errors.forEach((x) => { map[x.path] = x.msg; });
        setErrors(map);
      } else {
        setGeneral(data?.message || "No se pudo registrar");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <aside
        className="auth-aside"
        style={{
          background: "url('/fondo.png') left/contain no-repeat",
        }}
      >
      </aside>

      <div className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <h2>Crear cuenta</h2>
          <p className="muted">Completá tus datos para empezar.</p>

          <div className="grid-2" style={{ gap: 0, gridColumnGap: 12 }}>
            <Field label="Nombre" error={errors.first_name}>
              <input className="input" value={form.first_name} onChange={set("first_name")} />
            </Field>
            <Field label="Apellido" error={errors.last_name}>
              <input className="input" value={form.last_name} onChange={set("last_name")} />
            </Field>
          </div>

          <Field label="Usuario" error={errors.username}>
            <input className="input" value={form.username} onChange={set("username")} />
          </Field>
          <Field label="Correo electrónico" error={errors.email}>
            <input className="input" type="email" value={form.email} onChange={set("email")} />
          </Field>
          <div className="grid-2" style={{ gap: 0, gridColumnGap: 12 }}>
            <Field label="Contraseña" error={errors.password}>
              <input className="input" type="password" value={form.password} onChange={set("password")} placeholder="mínimo 6" />
            </Field>
            <Field label="Ingreso mensual" error={errors.monthly_income}>
              <input className="input" type="number" min="1" inputMode="numeric" value={form.monthly_income}
                onChange={set("monthly_income")} placeholder="Ej: 850000" />
            </Field>
          </div>

          {general && <div className="field-error" style={{ marginBottom: 12 }}>{general}</div>}

          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Creando cuenta…" : "Crear cuenta"}
          </button>

          <div className="auth-alt">
            ¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
