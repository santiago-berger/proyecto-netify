import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, HelpCircle, UserRound, Landmark, RefreshCw } from "lucide-react";
import { api } from "../api/api.js";
import { Card } from "../components/ui/Card.jsx";
import { Amount } from "../components/ui/Amount.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";
import { CftLink } from "../components/loans/CftLink.jsx";
import { LoanDisclaimer } from "../components/loans/LoanDisclaimer.jsx";
import { DataNotices } from "../components/loans/DataNotices.jsx";
import { IncomeUsed } from "../components/loans/IncomeUsed.jsx";
import { money } from "../utils/format.js";
import { PERFIL_LABELS, percent, plural, sentenceCase, simulationQuery } from "../utils/loans.js";

/*
  Mini página de un préstamo: la simulación, los requisitos contrastados con el perfil
  del usuario y las condiciones que impone el banco. Recibe monto/plazo/perfil por la URL,
  así "Volver" lleva al simulador con la misma simulación.
*/

const REQ_STATES = {
  cumple: { icon: CheckCircle2, className: "ok", label: "Cumplís" },
  no_cumple: { icon: XCircle, className: "danger", label: "No cumplís" },
  sin_ingreso: { icon: MinusCircle, className: "neutral", label: "Sin datos" },
  a_verificar: { icon: HelpCircle, className: "warn", label: "A verificar" },
};

export default function LoanDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const query = searchParams.toString();
  const backTo = `/simulador?${query}`;

  useEffect(() => {
    let active = true;
    setError(null);
    api
      .get(`/loans/${encodeURIComponent(id)}?${query}`)
      .then(({ data }) => active && setData(data))
      .catch((err) => active && setError(err.response?.data?.message || "No pudimos cargar el préstamo."));
    return () => {
      active = false;
    };
  }, [id, query, reloadKey]);

  if (error) {
    return (
      <div className="page-grid">
        <BackLink to={backTo} />
        <Card>
          <Empty icon={Landmark} title="No pudimos mostrar este préstamo" hint={error} />
          <div className="flex gap" style={{ justifyContent: "center" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setReloadKey((k) => k + 1)}><RefreshCw size={14} /> Reintentar</button>
            <Link className="btn btn-primary btn-sm" to={backTo}>Volver al simulador</Link>
          </div>
        </Card>
      </div>
    );
  }
  if (!data) return <Spinner />;

  const { prestamo, evaluacion, parametros, rangos, meta, usuario } = data;
  const { calculo, condiciones } = prestamo;
  const sugerencia = evaluacion.sugerencia;
  const puedeUsarSugerencia = sugerencia && sugerencia.montoMaximoSegunIngreso >= rangos.monto.minimo;

  const simularCon = (monto) =>
    navigate(`/simulador/${id}?${simulationQuery({ ...parametros, monto, entidad: searchParams.get("entidad") })}`, { replace: true });

  return (
    <div className="page-grid">
      <BackLink to={backTo} />

      <div>
        <div className="muted" style={{ fontSize: 12.5, fontWeight: 500 }}>{prestamo.entidad.nombre}</div>
        <h2 style={{ fontSize: 20, margin: "2px 0 4px" }}>
          {prestamo.nombre}
          {prestamo.canal && <span className="chip teal loan-chip">{prestamo.canal}</span>}
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {money(parametros.monto)} a {plural(parametros.plazo, "mes", "meses")} · {PERFIL_LABELS[parametros.perfil]}
        </p>
      </div>

      <DataNotices meta={meta} />

      <div className="grid-3">
        <div className="stat">
          <div className="label"><CftLink /> anual máximo</div>
          <div className="value num">{percent(prestamo.cft)}</div>
          <div className="r-sub muted">Equivale a {percent(calculo.tasaMensualCft)} por mes</div>
        </div>
        <div className="stat">
          <div className="label">Cuota estimada</div>
          <div className="value num"><Amount value={calculo.cuotaMensual} /></div>
          <div className="r-sub muted">{plural(parametros.plazo, "cuota fija", "cuotas fijas")}</div>
        </div>
        <div className="stat">
          <div className="label">Costo total</div>
          <div className="value num"><Amount value={calculo.costoTotal} /></div>
          <div className="r-sub muted">Intereses, cargos e impuestos: <Amount value={calculo.costoFinanciero} /></div>
        </div>
      </div>

      <Card title="¿Cumplís los requisitos?" sub={eligibilitySummary(evaluacion.cumpleRequisitosDeIngreso)}>
        {usuario.ingresoCargado && <IncomeUsed ingreso={usuario.ingresoMensual} />}
        {!usuario.ingresoCargado && (
          <div className="loan-notice info" style={{ marginBottom: 12 }}>
            <UserRound size={15} aria-hidden="true" />
            <div>
              Cargá tu ingreso mensual en tu perfil para saber si cumplís los requisitos de ingreso.{" "}
              <Link to="/perfil">Ir a mi perfil</Link>
            </div>
          </div>
        )}

        <div className="list">
          {evaluacion.requisitos.map((r) => {
            const { icon: Icon, className, label } = REQ_STATES[r.estado];
            return (
              <div className="row" key={r.codigo}>
                <div className={`icon-badge req-icon ${className}`}><Icon size={17} aria-hidden="true" /></div>
                <div className="grow">
                  <div className="r-title">{r.nombre}</div>
                  <div className="r-sub">{r.mensaje}</div>
                </div>
                <span className={`chip ${className === "neutral" ? "" : className}`}>{label}</span>
              </div>
            );
          })}
        </div>

        {sugerencia && (
          <div className="loan-suggestion">
            <span>{sugerencia.mensaje}</span>
            {puedeUsarSugerencia && (
              <button className="btn btn-primary btn-sm" onClick={() => simularCon(sugerencia.montoMaximoSegunIngreso)}>
                Simular con {money(sugerencia.montoMaximoSegunIngreso)}
              </button>
            )}
          </div>
        )}

        <p className="field-hint" style={{ margin: "14px 0 0" }}>{evaluacion.aclaracion}</p>
      </Card>

      <Card title="Condiciones del préstamo" sub={`Informadas por ${prestamo.entidad.nombre} al BCRA`}>
        {condiciones.nota && <p className="muted" style={{ marginTop: 0, maxWidth: "72ch" }}>{condiciones.nota}</p>}
        <div className="list">
          <Condition label="Tasa de interés">
            TEA {percent(condiciones.tea)}{condiciones.tipoTasa && ` · tasa ${condiciones.tipoTasa.toLowerCase()}`}
          </Condition>
          <Condition label="Destinatarios">{prestamo.beneficiario.descripcion}</Condition>
          {prestamo.canal && <Condition label="Cómo se solicita">{prestamo.canal}</Condition>}
          <Condition label="Montos que otorga el banco">
            De {money(condiciones.montoMinimo)} a {money(condiciones.montoMaximo)}
          </Condition>
          <Condition label="Plazo máximo">{plural(condiciones.plazoMaximoMeses, "mes", "meses")}</Condition>
          {condiciones.cargoCancelacionAnticipada !== null && (
            <Condition label="Cancelación anticipada">
              {condiciones.cargoCancelacionAnticipada === 0
                ? "Sin cargo"
                : `Cargo de hasta ${percent(condiciones.cargoCancelacionAnticipada)}`}
            </Condition>
          )}
          <Condition label="Alcance">
            {condiciones.alcance.nacional ? "Todo el país" : "Solo en algunas jurisdicciones"}
          </Condition>
          {condiciones.masInformacion && (
            <Condition label="Más información">{sentenceCase(condiciones.masInformacion)}</Condition>
          )}
          {condiciones.nombreInformado && (
            <Condition label="Nombre informado al BCRA">{condiciones.nombreInformado}</Condition>
          )}
        </div>
      </Card>

      <LoanDisclaimer
        disclaimer={meta.disclaimer}
        fechas={[{ entidad: prestamo.entidad.nombre, fechaInformacion: prestamo.fechaInformacion, desactualizado: prestamo.desactualizado }]}
        umbralDias={meta.umbralDesactualizadoDias}
      />
    </div>
  );
}

const eligibilitySummary = (cumple) =>
  cumple === true
    ? "Según tu ingreso, cumplís los requisitos que podemos verificar"
    : cumple === false
      ? "Según tu ingreso, no cumplís alguno de los requisitos"
      : "Algunos requisitos se pueden verificar con tu ingreso mensual";

const BackLink = ({ to }) => (
  <Link className="btn btn-ghost btn-sm" to={to} style={{ width: "fit-content" }}>
    <ArrowLeft size={15} /> Volver a la simulación
  </Link>
);

const Condition = ({ label, children }) => (
  <div className="row cond-row">
    <div className="cond-label">{label}</div>
    <div className="grow">{children}</div>
  </div>
);
