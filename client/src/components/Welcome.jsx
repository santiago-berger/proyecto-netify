import { useState } from "react";
import {
  Receipt, Wallet, CreditCard, PiggyBank, Calculator, BookOpen,
  ArrowRight, ArrowLeft, Check, Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { allModules } from "../utils/modules.js";

// las 5 preguntas: cada una activa (o no) una herramienta
const QUESTIONS = [
  { key: "presupuestos", icon: Wallet, q: "¿Querés fijar límites de gasto por categoría?", hint: "Te avisamos cuando estés por pasarte." },
  { key: "deudas", icon: CreditCard, q: "¿Tenés deudas o cuotas que seguir?", hint: "Llevá el control de vencimientos." },
  { key: "metas", icon: PiggyBank, q: "¿Estás ahorrando para alguna meta?", hint: "Un viaje, un objeto, un fondo…" },
  { key: "simulador", icon: Calculator, q: "¿Pensás sacar o comparar préstamos?", hint: "Simulá cuotas y costo total." },
  { key: "aprender", icon: BookOpen, q: "¿Te interesan tips de educación financiera?", hint: "Artículos breves del equipo." },
];

const INTRO = {
  title: "¡Bienvenido a Netify!",
  intro: "Netify te ayuda a ordenar tu economía en un solo lugar. Estas son las bases que vas a usar siempre:",
  items: [
    { icon: Receipt, title: "Registrá tus gastos", text: "Cargá cada gasto y clasificalo por categoría (podés crear las tuyas)." },
    { icon: Wallet, title: "Mirá tu resumen", text: "Gráficos y totales para entender en qué se te va la plata." },
  ],
};

const TOOL_LABELS = {
  presupuestos: { icon: Wallet, label: "Presupuestos" },
  deudas: { icon: CreditCard, label: "Deudas y vencimientos" },
  metas: { icon: PiggyBank, label: "Metas de ahorro" },
  simulador: { icon: Calculator, label: "Simulador de préstamos" },
  aprender: { icon: BookOpen, label: "Educación financiera" },
};

export const Welcome = ({ onClose }) => {
  const { updateModules } = useAuth();
  const [phase, setPhase] = useState(0); // 0 intro, 1 preguntas, 2 resultado
  const [answers, setAnswers] = useState({}); // { key: true/false }

  const answer = (key, value) => setAnswers((a) => ({ ...a, [key]: value }));
  const allAnswered = QUESTIONS.every((q) => answers[q.key] !== undefined);

  const enabled = { ...allModules(), ...answers };
  const enabledTools = Object.keys(TOOL_LABELS).filter((k) => enabled[k]);

  const finish = () => {
    updateModules(enabled);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal wide" onMouseDown={(e) => e.stopPropagation()}>

        {/* FASE 0 — intro */}
        {phase === 0 && (
          <>
            <div className="welcome-hero">
              <img src="/finanzas-icon.png" alt="Netify" />
              <div>
                <h3 style={{ margin: 0 }}>{INTRO.title}</h3>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>{INTRO.intro}</p>
              </div>
            </div>
            <div>
              {INTRO.items.map((it) => (
                <div className="welcome-step" key={it.title}>
                  <div className="welcome-ico"><it.icon size={19} /></div>
                  <div>
                    <div className="r-title">{it.title}</div>
                    <div className="r-sub">{it.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="welcome-dots">
              <span className="on" /><span /><span />
            </div>
            <div className="flex between center">
              <button className="btn btn-ghost btn-sm" onClick={finish}>Saltar</button>
              <button className="btn btn-primary" onClick={() => setPhase(1)}>
                Personalizar mi experiencia <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        {/* FASE 1 — 5 preguntas */}
        {phase === 1 && (
          <>
            <div className="flex center gap" style={{ marginBottom: 6 }}>
              <div className="welcome-ico"><Sparkles size={18} /></div>
              <div>
                <h3 style={{ margin: 0 }}>Contanos qué necesitás</h3>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
                  Con esto armamos tu plataforma a medida. Después podés cambiarla cuando quieras.
                </p>
              </div>
            </div>

            <div style={{ margin: "10px 0" }}>
              {QUESTIONS.map((q) => (
                <div className="welcome-step" key={q.key} style={{ alignItems: "center" }}>
                  <div className="welcome-ico"><q.icon size={18} /></div>
                  <div className="grow">
                    <div className="r-title">{q.q}</div>
                    <div className="r-sub">{q.hint}</div>
                  </div>
                  <div className="flex gap">
                    <button
                      className={`tab ${answers[q.key] === true ? "active" : ""}`}
                      onClick={() => answer(q.key, true)}
                    >Sí</button>
                    <button
                      className={`tab ${answers[q.key] === false ? "active" : ""}`}
                      onClick={() => answer(q.key, false)}
                    >No</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="welcome-dots">
              <span /><span className="on" /><span />
            </div>
            <div className="flex between center">
              <button className="btn btn-ghost btn-sm" onClick={() => setPhase(0)}>
                <ArrowLeft size={15} /> Volver
              </button>
              <button className="btn btn-primary" disabled={!allAnswered} onClick={() => setPhase(2)}>
                Ver mi plataforma <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}

        {/* FASE 2 — resultado / plantilla */}
        {phase === 2 && (
          <>
            <div className="welcome-hero">
              <img src="/finanzas-icon.png" alt="Netify" />
              <div>
                <h3 style={{ margin: 0 }}>Tu Netify quedó listo</h3>
                <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                  Activamos las herramientas que encajan con vos. Siempre las podés cambiar desde tu perfil.
                </p>
              </div>
            </div>

            <div style={{ margin: "6px 0 4px" }}>
              <div className="r-title" style={{ marginBottom: 8 }}>Herramientas activadas</div>
              {enabledTools.length === 0 && (
                <p className="muted" style={{ fontSize: 13 }}>Vas a arrancar con lo básico: registro de gastos y resumen.</p>
              )}
              <div className="flex gap" style={{ flexWrap: "wrap" }}>
                <span className="chip teal"><Receipt size={13} /> Gastos</span>
                <span className="chip teal"><Wallet size={13} /> Resumen</span>
                {enabledTools.map((k) => {
                  const T = TOOL_LABELS[k];
                  return <span className="chip teal" key={k}><T.icon size={13} /> {T.label}</span>;
                })}
              </div>
            </div>

            <div className="welcome-dots">
              <span /><span /><span className="on" />
            </div>
            <div className="flex between center">
              <button className="btn btn-ghost btn-sm" onClick={() => setPhase(1)}>
                <ArrowLeft size={15} /> Ajustar respuestas
              </button>
              <button className="btn btn-primary" onClick={finish}>
                <Check size={15} /> Empezar a usar Netify
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
