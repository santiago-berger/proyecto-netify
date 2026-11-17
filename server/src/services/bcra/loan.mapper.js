/*
  Valida y normaliza cada préstamo crudo del BCRA.
  Un préstamo con datos inválidos se descarta con un motivo y no afecta al resto.
  Así, si un banco carga mal un dato, no se rompe toda la respuesta.
*/

// tipos de beneficiario que publica el BCRA -> clave interna estable
export const BENEFICIARIOS = {
  todos: "Todos los beneficiarios",
  dependencia: "Personas en relación de dependencia",
  empleado_publico: "Empleados públicos",
  monotributista: "Monotributistas",
  responsable_inscripto: "Responsables inscriptos",
  seguridad_social: "Jubilados y beneficiarios de la seguridad social",
  clientes_cuenta: "Clientes con cuenta en la entidad",
  clientes_sueldo: "Clientes que cobran el sueldo en la entidad",
};

// minúsculas, sin tildes y sin espacios repetidos, para comparar textos del BCRA
export const normalizeText = (text) =>
  String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const BENEFICIARIO_BCRA = {
  "todos los beneficiarios": "todos",
  "personas humanas en relacion de dependencia": "dependencia",
  "empleados publicos": "empleado_publico",
  "personas humanas monotributistas": "monotributista",
  "personas humanas responsables inscriptos": "responsable_inscripto",
  "beneficiarios de cuentas de la seguridad social": "seguridad_social",
  "clientes con cuenta en la entidad": "clientes_cuenta",
  "clientes que acrediten sueldos en la entidad": "clientes_sueldo",
};

const toNumber = (value) => (value === null || value === undefined || value === "" ? NaN : Number(value));
const isPositive = (n) => Number.isFinite(n) && n > 0;
const optionalNumber = (value) => {
  const n = toNumber(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const cleanString = (value) => (typeof value === "string" && value.trim() ? value.trim() : null);

// devuelve { ok: true, loan } o { ok: false, reason }
export function mapLoan(raw) {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "registro_invalido" };

  const codigoEntidad = toNumber(raw.codigoEntidad);
  const nombreEntidad = cleanString(raw.descripcionEntidad);
  if (!Number.isInteger(codigoEntidad) || !nombreEntidad) return { ok: false, reason: "entidad_invalida" };

  // solo pesos: UVA y dólares no se pueden comparar con la misma fórmula
  if (normalizeText(raw.denominacion ?? "") !== "pesos") return { ok: false, reason: "moneda_no_pesos" };

  const beneficiario = BENEFICIARIO_BCRA[normalizeText(raw.beneficiario ?? "")];
  if (!beneficiario) return { ok: false, reason: "beneficiario_desconocido" };

  const montoMinimo = toNumber(raw.montoMinimoOtorgable);
  const montoMaximo = toNumber(raw.montoMaximoOtorgable);
  const plazoMaximo = toNumber(raw.plazoMaximoOtorgable);
  const tea = toNumber(raw.tasaEfectivaAnualMaxima);
  const cft = toNumber(raw.costoFinancieroEfectivoTotalMaximo);

  if (!Number.isFinite(montoMinimo) || montoMinimo < 0 || !isPositive(montoMaximo) || montoMinimo > montoMaximo) {
    return { ok: false, reason: "montos_invalidos" };
  }
  if (!Number.isInteger(plazoMaximo) || plazoMaximo < 1) return { ok: false, reason: "plazo_invalido" };
  // el CFT incluye la TEA más cargos e impuestos: nunca puede ser menor
  if (!isPositive(tea) || !isPositive(cft) || cft < tea) return { ok: false, reason: "tasas_invalidas" };

  // la antigüedad del dato no descarta el préstamo: se informa con "desactualizado" en el service
  const fecha = new Date(`${raw.fechaInformacion}T00:00:00`);
  if (!raw.fechaInformacion || Number.isNaN(fecha.getTime())) return { ok: false, reason: "fecha_invalida" };

  const rci = optionalNumber(raw.relacionCuotaIngreso);
  const territorio = cleanString(String(raw.territorioValidez ?? ""));

  return {
    ok: true,
    loan: {
      entidad: { codigo: codigoEntidad, razonSocial: nombreEntidad },
      nombreInformado: cleanString(raw.nombreCompleto),
      nombreCorto: cleanString(raw.nombreCorto),
      beneficiario: { clave: beneficiario, descripcion: BENEFICIARIOS[beneficiario] },
      montoMinimo,
      montoMaximo,
      plazoMaximoMeses: plazoMaximo,
      tea,
      cft,
      tipoTasa: cleanString(raw.tipoTasa),
      requisitos: {
        ingresoMinimoMensual: optionalNumber(raw.ingresoMinimoMensual),
        antiguedadLaboralMinimaMeses: optionalNumber(raw.antiguedadLaboralMinimaMeses),
        edadMaxima: optionalNumber(raw.edadMaximaSolicitada) || null,
        // % máximo del ingreso que puede representar la cuota (0 o > 100 se ignora)
        relacionCuotaIngresoMaxima: rci > 0 && rci <= 100 ? rci : null,
      },
      cargoCancelacionAnticipada: optionalNumber(raw.cargoMaximoCancelacionAnticipada),
      // "0" = todo el país; otro código = válido solo en una jurisdicción
      alcance: { nacional: territorio === "0", codigoTerritorio: territorio },
      masInformacion: cleanString(raw.masInformacion),
      fechaInformacion: raw.fechaInformacion,
    },
  };
}

// mapea la lista completa y cuenta cuántos se descartaron y por qué
export function mapLoans(rawList) {
  const loans = [];
  const descartados = {};

  for (const raw of rawList) {
    const result = mapLoan(raw);
    if (!result.ok) {
      descartados[result.reason] = (descartados[result.reason] || 0) + 1;
      continue;
    }
    loans.push(result.loan);
  }

  return { loans, descartados };
}
