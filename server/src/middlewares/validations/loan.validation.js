import { param, query } from "express-validator";
import { CODIGOS_ENTIDADES, IDS_PRESTAMOS, PERFILES_VALIDOS } from "../../services/bcra/loan.service.js";

// validación de forma; que monto y plazo estén dentro de los rangos comunes
// lo valida el service, porque esos rangos salen de los datos del BCRA
const simulationParams = [
  query("monto")
    .isFloat({ gt: 0 }).withMessage("El monto debe ser un número mayor a 0")
    .toFloat(),
  query("plazo")
    .isInt({ min: 1 }).withMessage("El plazo debe ser una cantidad entera de meses")
    .toInt(),
  query("perfil")
    .notEmpty().withMessage("El tipo de beneficiario es obligatorio")
    .bail()
    .isIn(PERFILES_VALIDOS).withMessage(`El tipo de beneficiario debe ser uno de: ${PERFILES_VALIDOS.join(", ")}`),
];

export const simulateValidation = [
  ...simulationParams,
  query("entidad")
    .optional()
    .toInt()
    .isIn(CODIGOS_ENTIDADES).withMessage(`La entidad debe ser una de: ${CODIGOS_ENTIDADES.join(", ")}`),
];

export const loanDetailValidation = [
  param("id").isIn(IDS_PRESTAMOS).withMessage("Préstamo no encontrado"),
  ...simulationParams,
];
