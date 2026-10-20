import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Field } from "../components/ui/Field.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo iniciar sesión");
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
          <h2>Iniciar sesión</h2>
          <p className="muted">Ingresá con tu cuenta para continuar.</p>

          <Field label="Usuario">
            <input
              className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="tu usuario"
              autoFocus
            />
          </Field>
          <Field label="Contraseña">
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </Field>

          {error && <div className="field-error" style={{ marginBottom: 12 }}>{error}</div>}

          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "Ingresando…" : "Ingresar"}
          </button>

          <div className="auth-alt">
            ¿No tenés cuenta? <Link to="/registro">Registrate</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
