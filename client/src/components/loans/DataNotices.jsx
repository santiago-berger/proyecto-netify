import { AlertTriangle } from "lucide-react";
import { longDate } from "../../utils/format.js";

/*
  Avisos sobre el estado de los datos del BCRA (no son filas de la tabla):
  - un banco no respondió y se muestran sus últimos datos guardados (stale)
  - un banco o préstamo no tiene datos en este momento y no se incluye en la comparación
*/
export const DataNotices = ({ meta }) => {
  if (!meta?.stale && !meta?.prestamosSinDatos?.length) return null;

  const guardados = meta.entidades.filter((e) => e.stale);
  const sinDatos = [...new Set(meta.prestamosSinDatos.map((p) => p.entidad))];

  return (
    <div className="loan-notice" role="status">
      <AlertTriangle size={15} aria-hidden="true" />
      <div>
        {guardados.map((e) => (
          <div key={e.codigo}>
            No pudimos actualizar los datos de <b>{e.nombre}</b> con el BCRA. Mostramos los consultados el{" "}
            {longDate(new Date(e.updatedAt))}.
          </div>
        ))}
        {sinDatos.length > 0 && (
          <div>
            Los préstamos de <b>{sinDatos.join(", ")}</b> no están disponibles en este momento y no se incluyen en la
            comparación.
          </div>
        )}
      </div>
    </div>
  );
};
