// formatea números como pesos argentinos
export const money = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

// convierte "2026-09-14" en un Date local (sin corrimiento de zona horaria)
const parseLocal = (d) => {
  if (d instanceof Date) return d;
  const [y, m, day] = String(d).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, day);
};

export const shortDate = (d) =>
  parseLocal(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });

export const longDate = (d) =>
  parseLocal(d).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

export const MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export const todayISO = () => new Date().toISOString().slice(0, 10);
