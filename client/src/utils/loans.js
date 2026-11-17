import { api } from "../api/api.js";
import { longDate } from "./format.js";

// título del artículo de Educación financiera sobre el CFT (server/src/seeders/seed.js)
export const CFT_ARTICLE_TITLE = "Qué es el CFT y cómo funciona";

// el id del artículo depende de la base de datos: se busca una sola vez por sesión
let cftArticlePromise = null;
export const findCftArticleId = () => {
  cftArticlePromise ??= api
    .get(`/articles?topic=${encodeURIComponent("Préstamos")}`)
    .then(({ data }) => data.find((a) => a.title === CFT_ARTICLE_TITLE)?.id ?? null)
    .catch(() => {
      cftArticlePromise = null; // si falló, se reintenta la próxima vez
      return null;
    });
  return cftArticlePromise;
};

// tipos de beneficiario que puede elegir el usuario
export const PERFIL_LABELS = { dependencia: "En relación de dependencia", monotributista: "Monotributista" };

// 86.82 -> "86,82%"
export const percent = (n) =>
  `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(Number(n) || 0)}%`;

// "PRESTAMOS SOLICITADOS POR HOME BANKING" -> "Préstamos solicitados por home banking"
export const sentenceCase = (text) => {
  if (!text) return "";
  const lower = text.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

export const plural = (n, singular, pluralForm) => `${n} ${n === 1 ? singular : pluralForm}`;

// datos del BCRA para el pie de página: "informados el 31 de agosto de 2026"
export const infoDate = (fechaInformacion) => longDate(fechaInformacion);

// query string de la simulación (lo comparten el simulador y la mini página de detalle)
export const simulationQuery = ({ monto, plazo, perfil, entidad }) => {
  const params = new URLSearchParams({ monto, plazo, perfil });
  if (entidad) params.set("entidad", entidad);
  return params.toString();
};

// lleva un valor al rango [min, max]
export const clampTo = (value, { minimo, maximo }) => Math.min(Math.max(value, minimo), maximo);
