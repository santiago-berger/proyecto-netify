import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { HelpCircle, Check, AlertTriangle, Minus, UserRound, RefreshCw, Landmark } from "lucide-react";
import { api } from "../api/api.js";
import { Card } from "../components/ui/Card.jsx";
import { Amount } from "../components/ui/Amount.jsx";
import { Field } from "../components/ui/Field.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";
import { CftLink } from "../components/loans/CftLink.jsx";
import { EligibilityBadge } from "../components/loans/EligibilityBadge.jsx";
import { LoanDisclaimer, datesByEntity } from "../components/loans/LoanDisclaimer.jsx";
import { DataNotices } from "../components/loans/DataNotices.jsx";
import { IncomeUsed } from "../components/loans/IncomeUsed.jsx";
import { money } from "../utils/format.js";
import { PERFIL_LABELS, clampTo, percent, plural, simulationQuery } from "../utils/loans.js";

/*
  Simulador de préstamos personales con datos del BCRA (Régimen de Transparencia).
  - El usuario elige monto, plazo y tipo de beneficiario dentro de los RANGOS COMUNES
    que devuelve el backend: así todos los préstamos del perfil tienen resultado.
  - La tabla compara CFT, cuota estimada y costo total, de menor a mayor costo.
  - Requisitos y condiciones de cada préstamo se ven en su mini página (botón "?").
  - Los parámetros viven en la URL: volver desde el detalle conserva la simulación.
*/

const DEFAULTS = { perfil: "dependencia", monto: 1000000, plazo: 24 };

// compara parámetros por valor, sin importar el orden en que estén en la URL
const sameParams = (a, b) =>
  JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

export default function LoanSimulator() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState(null);
  const [catalogError, setCatalogError] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCatalog = async () => {
    setCatalogError(null);
    try {
      const { data } = await api.get("/loans/catalog");
      setCatalog(data);
    } catch (err) {
      setCatalogError(err.response?.data?.message || "No pudimos cargar los préstamos. Probá de nuevo en unos minutos.");
    }
  };
  useEffect(() => { loadCatalog(); }, []);

  // parámetros actuales (la URL es la fuente de verdad)
  const perfiles = catalog?.perfiles ?? [];
  const perfil = perfiles.some((p) => p.clave === searchParams.get("perfil")) ? searchParams.get("perfil") : DEFAULTS.perfil;
  const rangos = perfiles.find((p) => p.clave === perfil)?.rangos ?? null;
  const monto = Number(searchParams.get("monto"));
  const plazo = Number(searchParams.get("plazo"));
  const entidad = searchParams.get("entidad") ?? "";

  // el texto del input de monto va aparte para poder tipear valores intermedios
  const [montoText, setMontoText] = useState(searchParams.get("monto") ?? "");

  // bancos con algún préstamo para el perfil elegido (para el desplegable)
  const entidadesDelPerfil = useMemo(
    () =>
      (catalog?.entidades ?? []).filter((e) =>
        e.prestamos.some((p) => p.beneficiario.clave === "todos" || p.beneficiario.clave === perfil)
      ),
    [catalog, perfil]
  );

  // lleva los parámetros de la URL a valores válidos para el perfil (al cargar y al cambiar de perfil)
  useEffect(() => {
    if (!rangos) return;
    const next = {
      perfil,
      monto: String(clampTo(monto > 0 ? monto : DEFAULTS.monto, rangos.monto)),
      plazo: String(clampTo(Number.isInteger(plazo) && plazo > 0 ? plazo : DEFAULTS.plazo, rangos.plazoMeses)),
    };
    if (entidad && entidadesDelPerfil.some((e) => String(e.codigo) === entidad)) next.entidad = entidad;

    if (!sameParams(Object.fromEntries(searchParams.entries()), next)) {
      setSearchParams(next, { replace: true });
      setMontoText(next.monto);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangos, perfil, entidadesDelPerfil]);

  const updateParams = (changes) => {
    const next = { perfil, monto: String(monto), plazo: String(plazo), ...(entidad && { entidad }), ...changes };
    if (!next.entidad) delete next.entidad;
    setSearchParams(next, { replace: true });
  };

  const montoError =
    rangos && montoText !== String(monto)
      ? `Ingresá un monto entre ${money(rangos.monto.minimo)} y ${money(rangos.monto.maximo)}`
      : null;

  const onMontoChange = (value) => {
    setMontoText(value);
    const n = Number(value);
    // solo se simula con un monto válido; si no, queda el error en el campo y la última simulación
    if (value !== "" && n >= rangos.monto.minimo && n <= rangos.monto.maximo) updateParams({ monto: String(n) });
  };

  const paramsReady =
    rangos &&
    searchParams.get("perfil") === perfil &&
    monto >= rangos.monto.minimo && monto <= rangos.monto.maximo &&
    plazo >= rangos.plazoMeses.minimo && plazo <= rangos.plazoMeses.maximo;
  const query = paramsReady ? simulationQuery({ monto, plazo, perfil, entidad }) : null;

  // simula cada vez que cambian los parámetros (con una pequeña espera mientras se tipea o se arrastra)
  useEffect(() => {
    if (!query) return;
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/loans/simulate?${query}`);
        if (!active) return;
        setResult(data);
        setError(null);
      } catch (err) {
        if (active) setError(err.response?.data?.message || "No pudimos simular los préstamos. Probá de nuevo en unos minutos.");
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  if (catalogError) {
    return (
      <div className="page-grid">
        <Header />
        <Card>
          <Empty icon={Landmark} title="Los datos del BCRA no están disponibles" hint={catalogError} />
          <div className="flex" style={{ justifyContent: "center" }}>
            <button className="btn btn-primary btn-sm" onClick={loadCatalog}><RefreshCw size={14} /> Reintentar</button>
          </div>
        </Card>
      </div>
    );
  }
  if (!catalog || !rangos) return <Spinner />;

  const rows = result?.resultados ?? [];
  const bancos = catalog.entidades.filter((e) => e.disponible).map((e) => e.nombre);

  /*
    Las filas siguen ordenadas por costo total; solo cambia qué fila se destaca:
    - menorCosto: la más barata (lo que se destacaba antes)
    - recomendado: la más barata que el usuario cumple según su ingreso (la primera con ✓)
    Con una sola fila no hay nada que comparar y no se destaca ninguna.
  */
  const ingresoCargado = Boolean(result?.usuario.ingresoCargado);
  const comparando = rows.length > 1;
  const menorCosto = comparando ? rows[0] : null;
  const recomendado = comparando && ingresoCargado ? rows.find((r) => r.cumpleRequisitosDeIngreso === true) ?? null : null;
  const ningunoCumple = ingresoCargado && rows.length > 0 && rows.every((r) => r.cumpleRequisitosDeIngreso === false);
  const describe = (r) => `${r.entidad.nombre} · ${r.nombre}${r.canal ? ` (${r.canal})` : ""}`;

  return (
    <div className="page-grid">
      <Header bancos={bancos} />

      <Card>
        <div className="sim-form">
          <Field label="¿Cuánto querés pedir?" error={montoError}>
            <input className="input" type="number" inputMode="numeric" min={rangos.monto.minimo} max={rangos.monto.maximo}
              value={montoText} onChange={(e) => onMontoChange(e.target.value)} aria-describedby="monto-hint" />
            {!montoError && (
              <span className="field-hint" id="monto-hint">
                Entre {money(rangos.monto.minimo)} y {money(rangos.monto.maximo)}
              </span>
            )}
          </Field>

          <Field label={`¿En cuántas cuotas? · ${plural(plazo || rangos.plazoMeses.minimo, "mes", "meses")}`}>
            <input className="range" type="range" min={rangos.plazoMeses.minimo} max={rangos.plazoMeses.maximo} step="1"
              value={plazo || rangos.plazoMeses.minimo} onChange={(e) => updateParams({ plazo: e.target.value })}
              aria-valuetext={plural(plazo, "mes", "meses")} />
            <div className="range-labels">
              <span>{rangos.plazoMeses.minimo} meses</span>
              <span>{rangos.plazoMeses.maximo} meses</span>
            </div>
          </Field>

          <Field label="Tipo de beneficiario">
            <div className="seg-control" role="radiogroup" aria-label="Tipo de beneficiario">
              {perfiles.map((p) => (
                <button key={p.clave} type="button" role="radio" aria-checked={p.clave === perfil}
                  onClick={() => p.clave !== perfil && updateParams({ perfil: p.clave })}>
                  {PERFIL_LABELS[p.clave] ?? p.descripcion}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Banco">
            <select className="select" value={entidad} onChange={(e) => updateParams({ entidad: e.target.value })}>
              <option value="">Todos los bancos</option>
              {entidadesDelPerfil.map((e) => (
                <option key={e.codigo} value={e.codigo}>{e.nombre}</option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <DataNotices meta={result?.meta ?? catalog.meta} />

      {result && !result.usuario.ingresoCargado && (
        <div className="loan-notice info">
          <UserRound size={15} aria-hidden="true" />
          <div>
            Cargá tu ingreso mensual en tu perfil para saber si cumplís los requisitos de cada préstamo.{" "}
            <Link to="/perfil">Ir a mi perfil</Link>
          </div>
        </div>
      )}

      <Card
        title="Comparación de préstamos"
        sub={`${money(monto)} a ${plural(plazo, "mes", "meses")} · de menor a mayor costo total`}
        className={`loan-results ${loading ? "is-loading" : ""}`}
      >
        {error ? (
          <Empty icon={Landmark} title="No pudimos simular los préstamos" hint={error} />
        ) : !result ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <Empty icon={Landmark} title="No hay préstamos para mostrar" hint="Probá con otro banco o tipo de beneficiario." />
        ) : (
          <>
            {ingresoCargado && <IncomeUsed ingreso={result.usuario.ingresoMensual} />}
            {recomendado && (
              <div className="loan-notice info loan-summary">
                <Check size={15} aria-hidden="true" />
                <div>
                  Con tu ingreso, el préstamo más conveniente al que accedés es <b>{describe(recomendado)}</b>.
                </div>
              </div>
            )}
            {ningunoCumple && (
              <div className="loan-notice loan-summary">
                <AlertTriangle size={15} aria-hidden="true" />
                <div>
                  Con tu ingreso no cumplís los requisitos de {rows.length === 1 ? "este préstamo" : "ninguno de estos préstamos"} con
                  este monto y plazo. Probá con un plazo mayor o un monto menor.
                </div>
              </div>
            )}

            <div style={{ overflowX: "auto" }}>
              <table className="table loan-table">
                <thead>
                  <tr>
                    <th>Banco · Préstamo</th>
                    <th className="right"><CftLink /></th>
                    <th className="right">Cuota estimada</th>
                    <th className="right">Costo total</th>
                    <th><span className="sr-only">Detalles</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className={r === recomendado ? "recommended" : ""}>
                      <td>
                        <div className="loan-name">
                          <EligibilityBadge value={r.cumpleRequisitosDeIngreso} />
                          <div>
                            <div className="r-title">
                              {r.entidad.nombre}
                              {r === recomendado && (
                                <span className="chip teal loan-chip"
                                  title="Según tu ingreso. La antigüedad laboral y la edad se confirman con el banco.">
                                  Más conveniente para vos
                                </span>
                              )}
                              {r === menorCosto && r !== recomendado && (
                                <span className="chip coin loan-chip subtle" title="El préstamo con el menor costo total">
                                  Menor costo
                                </span>
                              )}
                            </div>
                            <div className="r-sub">{r.nombre}{r.canal && ` · ${r.canal}`}</div>
                          </div>
                        </div>
                      </td>
                      <td className="right num">{percent(r.cft)}</td>
                      <td className="right num"><Amount value={r.calculo.cuotaMensual} /></td>
                      <td className="right num" style={{ fontWeight: 600 }}><Amount value={r.calculo.costoTotal} /></td>
                      <td className="right">
                        <Link to={`/simulador/${r.id}?${query}`} className="details-btn" data-tip="Ver detalles"
                          aria-label={`Ver detalles de ${r.entidad.nombre}: ${r.nombre}${r.canal ? ` (${r.canal})` : ""}`}>
                          <HelpCircle size={16} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="loan-legend">
              <span><span className="elig-badge ok"><Check size={11} strokeWidth={2.5} /></span> Cumplís los requisitos de ingreso</span>
              <span><span className="elig-badge warn"><AlertTriangle size={11} strokeWidth={2.5} /></span> No cumplís alguno</span>
              {!result.usuario.ingresoCargado && (
                <span><span className="elig-badge neutral"><Minus size={11} strokeWidth={2.5} /></span> Sin ingreso cargado</span>
              )}
              <span><HelpCircle size={14} /> Requisitos y condiciones de cada préstamo</span>
            </div>
            <p className="field-hint" style={{ margin: "10px 0 0" }}>
              La cuota se estima con el CFT máximo que informa cada banco, en el sistema francés de cuota fija.
            </p>
          </>
        )}
      </Card>

      {result && (
        <LoanDisclaimer
          disclaimer={result.meta.disclaimer}
          fechas={datesByEntity(rows)}
          umbralDias={result.meta.umbralDesactualizadoDias}
        />
      )}
    </div>
  );
}

const Header = ({ bancos = [] }) => (
  <div>
    <h2 style={{ fontSize: 20, marginBottom: 4 }}>Simulador de préstamos</h2>
    <p className="muted" style={{ marginTop: 0 }}>
      Compará préstamos personales
      {bancos.length > 0 && <> de {bancos.slice(0, -1).join(", ")}{bancos.length > 1 && " y "}{bancos.at(-1)}</>}{" "}
      con los datos oficiales que cada banco informa al BCRA.
    </p>
  </div>
);
