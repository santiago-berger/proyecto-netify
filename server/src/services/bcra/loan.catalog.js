/*
  Préstamos que compara el simulador: SOLO los préstamos personales sin plan especial
  relevados para cada banco. Los valores (CFT, TEA, plazos, montos, requisitos) NO están
  acá: se consultan en vivo a la API del BCRA. Este archivo solo dice CUÁLES préstamos
  tomar de cada respuesta.

  Cada préstamo se identifica en la respuesta del BCRA por:
    codigoEntidad + nombreCorto + beneficiario
  (el nombreCompleto no alcanza: Patagonia informa "PATAGONIA SIMPLE" para la línea
  tradicional y para la línea "PLUS", que es un plan especial).
*/

export const ENTIDADES = [
  { codigo: 17, nombre: "BBVA" },
  { codigo: 34, nombre: "Banco Patagonia" },
  { codigo: 44, nombre: "Banco Hipotecario" },
  { codigo: 315, nombre: "Banco de Formosa" },
];

export const PRESTAMOS = [
  {
    id: "formosa-hb",
    entidad: 315,
    nombreCorto: "PRESTAMO PERSONAL HB",
    beneficiario: "dependencia",
    nombre: "Préstamo personal con acreditación de haberes",
    canal: "HomeBanking (app del banco)",
  },
  {
    id: "formosa-presencial",
    entidad: 315,
    nombreCorto: "PRESTAMO PERSONAL PRES",
    beneficiario: "dependencia",
    nombre: "Préstamo personal con acreditación de haberes",
    canal: "Presencial",
  },
  {
    id: "formosa-sin-acreditacion",
    entidad: 315,
    nombreCorto: "PP SIN ACREDITACION HAB",
    beneficiario: "monotributista",
    nombre: "Préstamo personal sin acreditación de haberes",
  },
  {
    id: "hipotecario-mercado-abierto",
    entidad: 44,
    nombreCorto: "PMO. PERS MA",
    beneficiario: "dependencia",
    nombre: "Préstamo personal Mercado Abierto",
    nota:
      "Abierto a cualquier persona del público general que cumpla los requisitos laborales y crediticios, " +
      "tenga o no una cuenta sueldo en el Banco Hipotecario.",
  },
  {
    id: "patagonia-simple",
    entidad: 34,
    nombreCorto: "PP TRADICIONAL",
    beneficiario: "todos",
    nombre: "Préstamo personal Patagonia Simple",
  },
  {
    id: "bbva-dependencia",
    entidad: 17,
    nombreCorto: "PRESTAMO PERSONAL",
    beneficiario: "dependencia",
    nombre: "Préstamo personal",
  },
  {
    id: "bbva-monotributistas",
    entidad: 17,
    nombreCorto: "PRESTAMO PERSONAL",
    beneficiario: "monotributista",
    nombre: "Préstamo personal",
  },
];

// perfiles que puede elegir la persona (los préstamos para "todos" aplican a cualquiera)
export const PERFILES = {
  dependencia: "Personas en relación de dependencia",
  monotributista: "Monotributistas",
};
