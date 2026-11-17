/*
  Cálculo del préstamo con sistema francés (cuota fija).
  El BCRA publica tasas EFECTIVAS anuales, así que la tasa mensual sale de
    i = (1 + CFT)^(1/12) - 1     (no de TNA / 12)
  Se usa el CFT (no la TEA) porque incluye intereses, cargos, seguros e impuestos,
  o sea, lo que la persona termina pagando.
*/

const round = (n, decimals = 2) => Math.round(n * 10 ** decimals) / 10 ** decimals;

export const monthlyRateFromAnnual = (efectivaAnualPct) => Math.pow(1 + efectivaAnualPct / 100, 1 / 12) - 1;

export function simulateFixedInstallment({ monto, plazoMeses, cftAnual }) {
  const i = monthlyRateFromAnnual(cftAnual);
  const cuota = i === 0 ? monto / plazoMeses : (monto * i) / (1 - Math.pow(1 + i, -plazoMeses));
  const costoTotal = cuota * plazoMeses;

  return {
    tasaMensualCft: round(i * 100, 4),
    cuotaMensual: round(cuota),
    costoTotal: round(costoTotal),
    costoFinanciero: round(costoTotal - monto), // intereses + cargos + impuestos
  };
}

// inversa de la fórmula: monto máximo que se puede pedir para no superar una cuota dada
//   monto = cuota * (1 - (1 + i)^-n) / i
export function maxPrincipalForInstallment({ cuotaMaxima, plazoMeses, cftAnual }) {
  const i = monthlyRateFromAnnual(cftAnual);
  const monto = i === 0 ? cuotaMaxima * plazoMeses : (cuotaMaxima * (1 - Math.pow(1 + i, -plazoMeses))) / i;
  return Math.floor(monto);
}
