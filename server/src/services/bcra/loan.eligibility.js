import { maxPrincipalForInstallment } from "./loan.calculator.js";

/*
  Contrasta los requisitos que informa el banco con el ingreso mensual del perfil.
  - Verificables con el perfil: ingreso mínimo y relación cuota/ingreso (esta última
    depende del monto y plazo simulados).
  - No verificables (el perfil no los guarda): antigüedad laboral y edad máxima.
    Se informan como "a_verificar", sin veredicto.
  La evaluación es orientativa: el banco hace su propio análisis crediticio.
*/

const ars = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

export const ACLARACION_ELEGIBILIDAD =
  "La evaluación es orientativa: compara el ingreso mensual cargado en tu perfil con los requisitos que informa el banco. " +
  "Cada entidad realiza su propio análisis crediticio y puede considerar el ingreso neto o bruto.";

// estados: "cumple" | "no_cumple" | "sin_ingreso" (no cargó su ingreso) | "a_verificar" (el perfil no tiene el dato)
export function evaluateRequirements({ loan, calculo, ingresoMensual, plazoMeses, montoMinimoSimulable }) {
  const ingresoCargado = Number.isFinite(ingresoMensual) && ingresoMensual > 0;
  const req = loan.requisitos;
  const requisitos = [];
  let sugerencia = null;

  if (req.ingresoMinimoMensual > 0) {
    const requerido = req.ingresoMinimoMensual;
    requisitos.push(
      ingresoCargado
        ? {
            codigo: "INGRESO_MINIMO",
            nombre: "Ingreso mínimo mensual",
            estado: ingresoMensual >= requerido ? "cumple" : "no_cumple",
            requerido,
            valorUsuario: ingresoMensual,
            mensaje: `Requiere ${ars.format(requerido)} · tu ingreso: ${ars.format(ingresoMensual)}`,
          }
        : {
            codigo: "INGRESO_MINIMO",
            nombre: "Ingreso mínimo mensual",
            estado: "sin_ingreso",
            requerido,
            valorUsuario: null,
            mensaje: `Requiere un ingreso de al menos ${ars.format(requerido)}`,
          }
    );
  }

  if (req.relacionCuotaIngresoMaxima) {
    const maximo = req.relacionCuotaIngresoMaxima;
    if (ingresoCargado) {
      const porcentaje = Math.round((calculo.cuotaMensual / ingresoMensual) * 1000) / 10;
      const cumple = porcentaje <= maximo;
      requisitos.push({
        codigo: "RELACION_CUOTA_INGRESO",
        nombre: "Relación cuota/ingreso",
        estado: cumple ? "cumple" : "no_cumple",
        requerido: maximo,
        valorUsuario: porcentaje,
        mensaje: `Tu cuota es el ${pct.format(porcentaje)}% de tu ingreso (máx. ${pct.format(maximo)}%)`,
      });

      // este requisito depende de lo simulado: se sugiere hasta cuánto pedir a ese plazo
      if (!cumple) {
        const montoMaximoSegunIngreso = maxPrincipalForInstallment({
          cuotaMaxima: (ingresoMensual * maximo) / 100,
          plazoMeses,
          cftAnual: loan.cft,
        });
        sugerencia = {
          montoMaximoSegunIngreso,
          mensaje:
            montoMaximoSegunIngreso >= montoMinimoSimulable
              ? `Con tu ingreso, a ${plazoMeses} meses podrías pedir hasta ${ars.format(montoMaximoSegunIngreso)} en este préstamo. También podés probar con un plazo mayor.`
              : "Probá con un plazo mayor o un monto menor.",
        };
      }
    } else {
      requisitos.push({
        codigo: "RELACION_CUOTA_INGRESO",
        nombre: "Relación cuota/ingreso",
        estado: "sin_ingreso",
        requerido: maximo,
        valorUsuario: null,
        mensaje: `La cuota no puede superar el ${pct.format(maximo)}% de tu ingreso`,
      });
    }
  }

  if (req.antiguedadLaboralMinimaMeses > 0) {
    const meses = req.antiguedadLaboralMinimaMeses;
    requisitos.push({
      codigo: "ANTIGUEDAD_LABORAL",
      nombre: "Antigüedad laboral mínima",
      estado: "a_verificar",
      requerido: meses,
      valorUsuario: null,
      mensaje: `${meses} ${meses === 1 ? "mes" : "meses"} · confirmalo con el banco`,
    });
  }

  if (req.edadMaxima) {
    requisitos.push({
      codigo: "EDAD_MAXIMA",
      nombre: "Edad máxima",
      estado: "a_verificar",
      requerido: req.edadMaxima,
      valorUsuario: null,
      mensaje: `${req.edadMaxima} años · confirmalo con el banco`,
    });
  }

  const verificados = requisitos.filter((r) => r.estado === "cumple" || r.estado === "no_cumple");

  return {
    ingresoCargado,
    // null = no se puede saber porque no cargó su ingreso
    cumpleRequisitosDeIngreso: ingresoCargado ? verificados.every((r) => r.estado === "cumple") : null,
    requisitos,
    sugerencia,
    aclaracion: ACLARACION_ELEGIBILIDAD,
  };
}
