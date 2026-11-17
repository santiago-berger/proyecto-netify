import { matchedData } from "express-validator";
import { Profile } from "../models/index.js";
import * as loanService from "../services/bcra/loan.service.js";
import { BcraError } from "../services/bcra/bcra.errors.js";

// el controller no conoce la respuesta cruda del BCRA: solo traduce errores a HTTP
const handleError = (res, error, fallbackMessage) => {
  // monto/plazo fuera del rango común o préstamo de otro perfil: se devuelven los rangos válidos
  if (error instanceof loanService.SimulacionInvalidaError) {
    return res.status(400).json({ message: error.message, rangos: error.rangos });
  }
  if (error instanceof BcraError) {
    return res.status(503).json({
      message: error.message || "Los datos del BCRA no están disponibles en este momento. Probá de nuevo en unos minutos.",
      code: error.name,
    });
  }
  return res.status(500).json({ message: fallbackMessage, error: error.message });
};

// ingreso mensual del perfil del usuario logueado (null si no lo cargó)
const getUserIncome = async (userId) => {
  const profile = await Profile.findOne({ where: { user_id: userId }, attributes: ["monthly_income"] });
  const ingreso = Number(profile?.monthly_income);
  return Number.isFinite(ingreso) && ingreso > 0 ? ingreso : null;
};

// GET /api/loans/catalog -> perfiles con sus rangos de monto/plazo y entidades para el desplegable
export const getLoanCatalog = async (req, res) => {
  try {
    return res.status(200).json(await loanService.getCatalog());
  } catch (error) {
    return handleError(res, error, "Error al obtener el catálogo de préstamos");
  }
};

// GET /api/loans/simulate?monto=&plazo=&perfil=&entidad=
export const simulateLoans = async (req, res) => {
  try {
    const params = matchedData(req, { locations: ["query"] });
    const ingreso = await getUserIncome(req.user.id);
    return res.status(200).json(await loanService.simulate(params, ingreso));
  } catch (error) {
    return handleError(res, error, "Error al simular los préstamos");
  }
};

// GET /api/loans/:id?monto=&plazo=&perfil=  (mini página de detalle)
export const getLoanDetail = async (req, res) => {
  try {
    const { id, ...params } = matchedData(req, { locations: ["params", "query"] });
    const ingreso = await getUserIncome(req.user.id);
    return res.status(200).json(await loanService.getLoanDetail(id, params, ingreso));
  } catch (error) {
    return handleError(res, error, "Error al obtener el detalle del préstamo");
  }
};
