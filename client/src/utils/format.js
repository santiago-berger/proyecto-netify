// formatea números como pesos argentinos, sin espacio después del signo: $1.169.900
export const money = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0).replace(/\s/g, "");

// convierte "2026-09-14" en un Date local (sin corrimiento de zona horaria)
const parseLocal = (d) => {
  if (d instanceof Date) return d;
  const [y, m, day] = String(d).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, day);
};

// whole days from date a to date b (negative if b is before a)
export const daysBetween = (a, b) =>
  Math.round((parseLocal(b) - parseLocal(a)) / 86400000);

export const shortDate = (d) =>
  parseLocal(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });

export const longDate = (d) =>
  parseLocal(d).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });

// fecha y hora de un timestamp: "16 nov, 14:32"
export const dateTime = (d) =>
  new Date(d).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export const MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

// local date, not UTC: toISOString would jump to the next day after 21:00 in Argentina
export const todayISO = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};
