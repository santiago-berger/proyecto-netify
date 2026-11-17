import { Info } from "lucide-react";
import { infoDate } from "../../utils/loans.js";

/*
  Aviso legal + fecha en que cada banco informó sus datos al BCRA.
  fechas: [{ entidad, fechaInformacion, desactualizado }] (una por banco)
*/
export const LoanDisclaimer = ({ disclaimer, fechas = [], umbralDias }) => (
  <div className="loan-disclaimer">
    <Info size={15} aria-hidden="true" />
    <div>
      {fechas.length > 0 && (
        <ul className="loan-dates">
          {fechas.map((f) => (
            <li key={f.entidad}>
              Datos de <b>{f.entidad}</b> informados al BCRA el {infoDate(f.fechaInformacion)}.
              {f.desactualizado && (
                <span className="chip warn loan-chip">Más de {umbralDias} días sin actualizar</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p>{disclaimer}</p>
    </div>
  </div>
);

// una fecha por banco a partir de las filas de resultados (se queda con la más reciente)
export const datesByEntity = (rows) => {
  const map = new Map();
  for (const r of rows) {
    const prev = map.get(r.entidad.nombre);
    if (!prev || r.fechaInformacion > prev.fechaInformacion) {
      map.set(r.entidad.nombre, { entidad: r.entidad.nombre, fechaInformacion: r.fechaInformacion, desactualizado: r.desactualizado });
    }
  }
  return [...map.values()].sort((a, b) => a.entidad.localeCompare(b.entidad, "es"));
};
