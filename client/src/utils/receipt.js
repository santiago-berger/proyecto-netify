const MONTHS = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
  ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8,
  sep: 9, set: 9, oct: 10, nov: 11, dic: 12,
};
const toNumber = (s) => Number(String(s).replace(/\./g, "").replace(",", "."));

const parseAmount = (text) => {
  const keyLines = text.split("\n").filter((l) => /total|pagaste|monto|importe|transferiste|enviaste/i.test(l));
  const grab = (str) =>
    [...str.matchAll(/\$?\s?(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2}|\d{1,3}(?:\.\d{3})+)/g)]
      .map((m) => toNumber(m[1])).filter((n) => !isNaN(n) && n > 0);
  let candidates = keyLines.flatMap(grab);
  if (candidates.length === 0) candidates = grab(text);
  return candidates.length ? Math.max(...candidates) : "";
};

const parseDate = (text) => {
  let m = text.match(/(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  m = text.toLowerCase().match(/(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)\.?(?:\s+(?:de\s+)?(\d{4}))?/);
  if (m && MONTHS[m[2]]) {
    const y = m[3] || new Date().getFullYear();
    return `${y}-${String(MONTHS[m[2]]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }
  return "";
};

const parseDescription = (text) => {
  const patterns = [/le pagaste a\s+(.+)/i, /pagaste a\s+(.+)/i, /transferiste a\s+(.+)/i, /enviaste dinero a\s+(.+)/i, /pago a\s+(.+)/i];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) { const l = m[1].split("\n")[0].trim(); if (l.length >= 2) return l.slice(0, 80); }
  }
  return "Gasto desde captura";
};

export const parseReceipt = (rawText) => {
  const text = rawText || "";
  return { amount: parseAmount(text) || "", date: parseDate(text) || "", description: parseDescription(text) };
};