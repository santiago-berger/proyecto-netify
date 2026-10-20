// Herramientas que se pueden activar/desactivar según la plantilla del usuario.
// "Resumen" y "Gastos" son siempre visibles (base de la app).
export const TOOLS = [
  { key: "presupuestos", label: "Presupuestos" },
  { key: "deudas", label: "Deudas y vencimientos" },
  { key: "metas", label: "Metas de ahorro" },
  { key: "simulador", label: "Simulador de préstamos" },
  { key: "aprender", label: "Educación financiera" },
];

const KEY = "netify_modules";

// devuelve un objeto { presupuestos:true, deudas:false, ... } o null si nunca se configuró
export const getModules = () => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveModules = (mods) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(mods));
  } catch {
    /* ignore */
  }
};

// todos activados (valor por defecto cuando no hay preferencia)
export const allModules = () =>
  TOOLS.reduce((acc, t) => ({ ...acc, [t.key]: true }), {});
