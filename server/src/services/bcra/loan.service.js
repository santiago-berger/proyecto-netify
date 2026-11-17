import { fetchPersonalLoans } from "./bcra.client.js";
import { BcraInvalidResponseError, BcraUnavailableError } from "./bcra.errors.js";
import { BENEFICIARIOS, mapLoans, normalizeText } from "./loan.mapper.js";
import { simulateFixedInstallment } from "./loan.calculator.js";
import { evaluateRequirements } from "./loan.eligibility.js";
import { ENTIDADES, PERFILES, PRESTAMOS } from "./loan.catalog.js";

/*
  Única puerta de entrada que usan los controllers.
  - Consulta al BCRA los préstamos personales de cada entidad del catálogo y se queda
    solo con los préstamos definidos en loan.catalog.js.
  - El tipo de beneficiario (perfil) es obligatorio: así cada préstamo aparece una sola vez.
  - Calcula los RANGOS COMUNES de monto y plazo por perfil (la intersección de lo que admite
    cada préstamo): cualquier valor dentro de esos rangos devuelve resultados de todos los
    bancos, así nunca se muestran préstamos "no disponibles".
  - Contrasta los requisitos de cada préstamo con el ingreso mensual del perfil del usuario.
  - Cachea por entidad: si un banco falla, los demás se siguen actualizando y
    el que falló sigue mostrando sus últimos datos con stale: true.
*/

export const CODIGOS_ENTIDADES = ENTIDADES.map((e) => e.codigo);
export const PERFILES_VALIDOS = Object.keys(PERFILES);
export const IDS_PRESTAMOS = PRESTAMOS.map((p) => p.id);

// el BCRA solo informa el plazo MÁXIMO de cada préstamo; el mínimo lo fija la plataforma
const PLAZO_MINIMO_MESES = 6;

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 h: el BCRA se actualiza más o menos una vez por mes
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000; // tras un fallo, no se reintenta esa entidad por 5 min
const DIAS_DESACTUALIZADO = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export const DISCLAIMER =
  "La información proviene del Régimen de Transparencia del BCRA y es informada por cada entidad financiera. " +
  "Los valores son máximos y referenciales. Esta plataforma no garantiza su exactitud, vigencia ni frecuencia de actualización. " +
  "Confirmá siempre las condiciones finales con la entidad antes de solicitar un préstamo.";

// monto o plazo fuera de los rangos comunes, o préstamo que no corresponde al perfil (el controller responde 400)
export class SimulacionInvalidaError extends Error {
  constructor(message, rangos = null) {
    super(message);
    this.name = "SimulacionInvalidaError";
    this.rangos = rangos;
  }
}

/* ---------------------------- caché por entidad ---------------------------- */

const cache = new Map(ENTIDADES.map((e) => [e.codigo, { loans: null, updatedAt: null, lastFailureAt: null }]));
let inFlight = null; // evita que varias requests simultáneas consulten al BCRA a la vez

const isFresh = (entry) => entry.loans && Date.now() - entry.updatedAt < CACHE_TTL_MS;

async function refreshEntity({ codigo, nombre }) {
  const entry = cache.get(codigo);
  if (isFresh(entry)) return;
  // falló hace poco: no hacer esperar a la persona otra vez
  if (entry.lastFailureAt && Date.now() - entry.lastFailureAt < RETRY_AFTER_FAILURE_MS) return;

  try {
    const { loans } = mapLoans(await fetchPersonalLoans(codigo));
    // por si la API ignorara el filtro, se descarta cualquier préstamo de otra entidad
    const propios = loans.filter((l) => l.entidad.codigo === codigo);
    if (propios.length === 0) {
      throw new BcraInvalidResponseError(`El BCRA no devolvió préstamos válidos para ${nombre}`);
    }
    entry.loans = propios;
    entry.updatedAt = Date.now();
    entry.lastFailureAt = null;
  } catch (err) {
    entry.lastFailureAt = Date.now();
    console.warn(`[BCRA] No se pudieron actualizar los préstamos de ${nombre}: ${err.message}`);
  }
}

// busca en la respuesta del BCRA el registro que corresponde a un préstamo del catálogo
function findLoan(producto, loansDeEntidad) {
  const nombreCorto = normalizeText(producto.nombreCorto);
  const candidatos = loansDeEntidad.filter(
    (l) => l.beneficiario.clave === producto.beneficiario && normalizeText(l.nombreCorto ?? "") === nombreCorto
  );
  if (candidatos.length === 0) return null;
  // BBVA informa el mismo préstamo dos veces (plazo 72 y plazo 1): se toma la línea de mayor plazo
  return candidatos.reduce((a, b) => (b.plazoMaximoMeses > a.plazoMaximoMeses ? b : a));
}

/*
  Préstamos del catálogo que tienen datos del BCRA. Los que no (banco caído sin caché,
  o préstamo que el banco dejó de informar) NO se devuelven como filas: quedan
  señalados en meta.entidades / meta.prestamosSinDatos para mostrar un aviso.
*/
async function getAvailableLoans() {
  inFlight ??= Promise.all(ENTIDADES.map(refreshEntity)).finally(() => {
    inFlight = null;
  });
  await inFlight;

  const items = PRESTAMOS.map((producto) => {
    const { loans } = cache.get(producto.entidad);
    return { producto, loan: loans ? findLoan(producto, loans) : null };
  });
  const disponibles = items.filter((i) => i.loan);

  if (disponibles.length === 0) {
    throw new BcraUnavailableError("No se pudieron obtener datos del BCRA para ninguna entidad");
  }

  const entidades = ENTIDADES.map(({ codigo, nombre }) => {
    const entry = cache.get(codigo);
    return {
      codigo,
      nombre,
      disponible: Boolean(entry.loans), // false = nunca se pudo obtener
      stale: Boolean(entry.loans) && !isFresh(entry), // true = se muestran datos guardados
      updatedAt: entry.updatedAt ? new Date(entry.updatedAt).toISOString() : null,
    };
  });

  return {
    items: disponibles,
    meta: {
      fuente: "BCRA - Régimen de Transparencia (préstamos personales)",
      stale: entidades.some((e) => e.stale || !e.disponible),
      entidades,
      prestamosSinDatos: items
        .filter((i) => !i.loan)
        .map(({ producto }) => ({ id: producto.id, entidad: nombreEntidad(producto.entidad), nombre: producto.nombre })),
      umbralDesactualizadoDias: DIAS_DESACTUALIZADO,
      disclaimer: DISCLAIMER,
    },
  };
}

/* ------------------------------ rangos comunes ------------------------------ */

const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const nombreEntidad = (codigo) => ENTIDADES.find((e) => e.codigo === codigo).nombre;

// los préstamos para "todos los beneficiarios" aplican a cualquier perfil
const matchesPerfil = (producto, perfil) => producto.beneficiario === "todos" || producto.beneficiario === perfil;

/*
  Intersección de los rangos de todos los préstamos del perfil:
    monto: desde el MAYOR de los mínimos hasta el MENOR de los máximos
    plazo: desde PLAZO_MINIMO_MESES hasta el MENOR de los plazos máximos
  Devuelve null si los préstamos no tienen ningún rango en común.
*/
function commonRanges(loans) {
  if (loans.length === 0) return null;
  const monto = {
    minimo: Math.max(...loans.map((l) => l.montoMinimo)),
    maximo: Math.min(...loans.map((l) => l.montoMaximo)),
  };
  const plazoMaximo = Math.min(...loans.map((l) => l.plazoMaximoMeses));
  const plazo = { minimo: Math.min(PLAZO_MINIMO_MESES, plazoMaximo), maximo: plazoMaximo };

  if (monto.minimo > monto.maximo) return null;
  return { monto, plazoMeses: plazo };
}

// préstamos del perfil + validación de que monto y plazo estén dentro del rango común
function itemsForSimulation(items, { perfil, monto, plazo }) {
  const delPerfil = items.filter(({ producto }) => matchesPerfil(producto, perfil));
  const rangos = commonRanges(delPerfil.map((i) => i.loan));

  if (!rangos) {
    throw new SimulacionInvalidaError("Los préstamos de este perfil no tienen un rango de monto en común");
  }
  if (monto < rangos.monto.minimo || monto > rangos.monto.maximo) {
    throw new SimulacionInvalidaError(
      `El monto debe estar entre ${ars.format(rangos.monto.minimo)} y ${ars.format(rangos.monto.maximo)}`,
      rangos
    );
  }
  if (plazo < rangos.plazoMeses.minimo || plazo > rangos.plazoMeses.maximo) {
    throw new SimulacionInvalidaError(
      `El plazo debe estar entre ${rangos.plazoMeses.minimo} y ${rangos.plazoMeses.maximo} meses`,
      rangos
    );
  }
  return { delPerfil, rangos };
}

/* ------------------------------ armado de respuestas ------------------------------ */

const freshness = (loan, now) => {
  const dias = Math.max(0, Math.floor((now - new Date(`${loan.fechaInformacion}T00:00:00`)) / DAY_MS));
  return { fechaInformacion: loan.fechaInformacion, diasDesdeInformacion: dias, desactualizado: dias > DIAS_DESACTUALIZADO };
};

const identity = (producto) => ({
  id: producto.id,
  entidad: { codigo: producto.entidad, nombre: nombreEntidad(producto.entidad) },
  nombre: producto.nombre,
  canal: producto.canal ?? null,
  beneficiario: { clave: producto.beneficiario, descripcion: BENEFICIARIOS[producto.beneficiario] },
});

const userIncome = (ingresoMensual) => ({
  ingresoMensual: ingresoMensual ?? null,
  ingresoCargado: Boolean(ingresoMensual && ingresoMensual > 0),
});

/* ------------------------------ API pública ------------------------------ */

// datos para armar el formulario: perfiles con sus rangos y entidades para el desplegable
export async function getCatalog() {
  const { items, meta } = await getAvailableLoans();

  return {
    meta,
    perfiles: PERFILES_VALIDOS.map((clave) => ({
      clave,
      descripcion: PERFILES[clave],
      rangos: commonRanges(items.filter(({ producto }) => matchesPerfil(producto, clave)).map((i) => i.loan)),
    })),
    entidades: meta.entidades.map((e) => ({
      ...e,
      prestamos: items
        .filter((i) => i.producto.entidad === e.codigo)
        .map(({ producto, loan }) => ({ ...identity(producto), fechaInformacion: loan.fechaInformacion })),
    })),
  };
}

// tabla de comparación: CFT, cuota y costo total por préstamo, de menor a mayor costo total
export async function simulate(params, ingresoMensual) {
  const { items, meta } = await getAvailableLoans();
  const { delPerfil, rangos } = itemsForSimulation(items, params);
  const now = new Date();

  const resultados = delPerfil
    // el filtro por entidad no cambia los rangos: el mismo monto/plazo sirve para un banco o para todos
    .filter(({ producto }) => params.entidad === undefined || producto.entidad === params.entidad)
    .map(({ producto, loan }) => {
      const calculo = simulateFixedInstallment({ monto: params.monto, plazoMeses: params.plazo, cftAnual: loan.cft });
      const { cumpleRequisitosDeIngreso } = evaluateRequirements({
        loan,
        calculo,
        ingresoMensual,
        plazoMeses: params.plazo,
        montoMinimoSimulable: rangos.monto.minimo,
      });
      return {
        ...identity(producto),
        cft: loan.cft,
        calculo,
        cumpleRequisitosDeIngreso, // true (✓) | false (⚠) | null (no cargó su ingreso)
        ...freshness(loan, now),
      };
    })
    .sort((a, b) => a.calculo.costoTotal - b.calculo.costoTotal || a.cft - b.cft);

  return { meta, parametros: params, rangos, usuario: userIncome(ingresoMensual), resultados };
}

// mini página de detalle: simulación + requisitos contrastados con el perfil + condiciones del préstamo
export async function getLoanDetail(id, params, ingresoMensual) {
  const producto = PRESTAMOS.find((p) => p.id === id);
  if (!matchesPerfil(producto, params.perfil)) {
    throw new SimulacionInvalidaError(`Este préstamo no corresponde al perfil "${PERFILES[params.perfil]}"`);
  }

  const { items, meta } = await getAvailableLoans();
  const item = items.find((i) => i.producto.id === id);
  if (!item) {
    throw new BcraUnavailableError(`Los datos de este préstamo de ${nombreEntidad(producto.entidad)} no están disponibles en este momento`);
  }
  const { rangos } = itemsForSimulation(items, params);
  const { loan } = item;

  const calculo = simulateFixedInstallment({ monto: params.monto, plazoMeses: params.plazo, cftAnual: loan.cft });

  return {
    meta,
    parametros: params,
    rangos,
    usuario: userIncome(ingresoMensual),
    prestamo: {
      ...identity(producto),
      cft: loan.cft,
      calculo,
      // condiciones que impone el banco
      condiciones: {
        tea: loan.tea,
        tipoTasa: loan.tipoTasa,
        montoMinimo: loan.montoMinimo,
        montoMaximo: loan.montoMaximo,
        plazoMaximoMeses: loan.plazoMaximoMeses,
        cargoCancelacionAnticipada: loan.cargoCancelacionAnticipada,
        alcance: loan.alcance,
        masInformacion: loan.masInformacion,
        nota: producto.nota ?? null,
        nombreInformado: loan.nombreInformado,
      },
      ...freshness(loan, new Date()),
    },
    evaluacion: evaluateRequirements({
      loan,
      calculo,
      ingresoMensual,
      plazoMeses: params.plazo,
      montoMinimoSimulable: rangos.monto.minimo,
    }),
  };
}
