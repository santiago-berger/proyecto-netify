import { useState, useMemo, useEffect } from "react";
import { Plus, Trash2, Calculator, Trophy, Info, RotateCcw } from "lucide-react";
import { Card } from "../components/ui/Card.jsx";
import { Field } from "../components/ui/Field.jsx";
import { money } from "../utils/format.js";

/*
  Simulador de préstamos (sistema francés, cuota fija).
  Fórmula de la cuota:  cuota = C * i / (1 - (1 + i)^-n)
    C = capital,  i = tasa mensual (TNA/12),  n = cantidad de cuotas
  Los escenarios los carga el usuario (nombre + TNA + plazo) y se ordenan
  de MENOR a MAYOR costo total, como pide el requerimiento.
  Las tasas son referenciales: el usuario debe confirmarlas con cada entidad.
*/

const calc = (capital, tna, meses) => {
  const C = Number(capital);
  const n = Number(meses);
  const i = Number(tna) / 100 / 12;
  if (!C || !n) return { cuota: 0, total: 0, interes: 0 };
  const cuota = i === 0 ? C / n : (C * i) / (1 - Math.pow(1 + i, -n));
  const total = cuota * n;
  return { cuota, total, interes: total - C };
};

const uid = () => Math.random().toString(36).slice(2, 8);

const DEFAULT_SCENARIOS = [
  { id: uid(), name: "Banco A", tna: 85, meses: 12 },
  { id: uid(), name: "Banco B", tna: 110, meses: 12 },
  { id: uid(), name: "Financiera", tna: 140, meses: 18 },
];

export default function LoanSimulator() {
  // los datos se guardan en el navegador para no perderlos al recargar
  const [capital, setCapital] = useState(() => {
    const g = localStorage.getItem("simulador_capital");
    return g ? Number(g) : 500000;
  });
  const [scenarios, setScenarios] = useState(() => {
    const g = localStorage.getItem("simulador_escenarios");
    return g ? JSON.parse(g) : DEFAULT_SCENARIOS;
  });

  useEffect(() => {
    localStorage.setItem("simulador_capital", String(capital));
  }, [capital]);
  useEffect(() => {
    localStorage.setItem("simulador_escenarios", JSON.stringify(scenarios));
  }, [scenarios]);

  const reset = () => {
    localStorage.removeItem("simulador_capital");
    localStorage.removeItem("simulador_escenarios");
    setCapital(500000);
    setScenarios(DEFAULT_SCENARIOS.map((s) => ({ ...s, id: uid() })));
  };

  const results = useMemo(() => {
    return scenarios
      .map((s) => ({ ...s, ...calc(capital, s.tna, s.meses) }))
      .sort((a, b) => a.total - b.total);
  }, [scenarios, capital]);

  const best = results[0];

  const update = (id, key, value) =>
    setScenarios((arr) => arr.map((s) => (s.id === id ? { ...s, [key]: value } : s)));
  const add = () =>
    setScenarios((arr) => [...arr, { id: uid(), name: `Opción ${arr.length + 1}`, tna: 100, meses: 12 }]);
  const remove = (id) => setScenarios((arr) => arr.filter((s) => s.id !== id));

  return (
    <div className="page-grid">
      <div>
        <h2 style={{ fontSize: 20, marginBottom: 4 }}>Simulador de préstamos</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Cargá el monto que necesitás y compará distintas opciones. Se ordenan
          automáticamente de <b>menor a mayor costo total</b>.
        </p>
      </div>

      <Card>
        <div className="grid-2" style={{ alignItems: "end", gap: 0, gridColumnGap: 18 }}>
          <Field label="¿Cuánto querés pedir? (capital)">
            <input className="input" type="number" value={capital}
              onChange={(e) => setCapital(e.target.value)} placeholder="0" />
          </Field>
          <div style={{ marginBottom: 14 }} className="flex gap">
            <button className="btn btn-ghost btn-sm" onClick={add}><Plus size={15} /> Agregar opción</button>
            <button className="btn btn-ghost btn-sm" onClick={reset} title="Volver a los valores por defecto"><RotateCcw size={14} /> Reiniciar</button>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Opción</th>
                <th>TNA (%)</th>
                <th>Plazo (meses)</th>
                <th className="right">Cuota</th>
                <th className="right">Costo total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => {
                const r = calc(capital, s.tna, s.meses);
                return (
                  <tr key={s.id}>
                    <td style={{ minWidth: 120 }}>
                      <input className="input" value={s.name}
                        onChange={(e) => update(s.id, "name", e.target.value)} />
                    </td>
                    <td style={{ width: 100 }}>
                      <input className="input" type="number" value={s.tna}
                        onChange={(e) => update(s.id, "tna", e.target.value)} />
                    </td>
                    <td style={{ width: 110 }}>
                      <input className="input" type="number" value={s.meses}
                        onChange={(e) => update(s.id, "meses", e.target.value)} />
                    </td>
                    <td className="right num">{money(r.cuota)}</td>
                    <td className="right num">{money(r.total)}</td>
                    <td className="right">
                      <button className="btn btn-danger btn-sm" onClick={() => remove(s.id)} style={{ padding: 7 }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {best && best.total > 0 && (
        <Card title="Ranking por costo total" sub="De la opción más conveniente a la más cara">
          <div className="list">
            {results.map((r, idx) => (
              <div className="row" key={r.id}>
                <div className="icon-badge" style={idx === 0 ? { background: "rgba(255,228,94,.12)", color: "var(--coin)" } : {}}>
                  {idx === 0 ? <Trophy size={17} /> : <span className="num">{idx + 1}</span>}
                </div>
                <div className="grow">
                  <div className="r-title">{r.name} {idx === 0 && <span className="chip coin" style={{ marginLeft: 6 }}>Más conveniente</span>}</div>
                  <div className="r-sub">Cuota de {money(r.cuota)} · {r.meses} meses · TNA {r.tna}%</div>
                </div>
                <div className="right">
                  <div className="num" style={{ fontWeight: 600 }}>{money(r.total)}</div>
                  <div className="r-sub">Intereses: {money(r.interes)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt flex gap" style={{ alignItems: "flex-start", color: "var(--muted)", fontSize: 12.5 }}>
            <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              El cálculo usa el sistema francés de cuota fija sobre la TNA que ingreses.
              Las tasas son referenciales y de carga manual: confirmá siempre el CFT
              (Costo Financiero Total) real con cada entidad antes de tomar un préstamo.
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
