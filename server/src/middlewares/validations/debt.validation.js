import { body, param } from "express-validator";

export const createDebtValidation = [
  body("creditor_name")
    .trim()
    .notEmpty().withMessage("El acreedor es obligatorio")
    .isLength({ max: 100 }).withMessage("El nombre del acreedor es demasiado largo"),
  body("amount")
    .notEmpty().withMessage("El monto es obligatorio")
    .isFloat({ gt: 0 }).withMessage("El monto debe ser un número mayor a 0"),
  body("due_date")
    .notEmpty().withMessage("La fecha de vencimiento es obligatoria")
    .isISO8601().withMessage("La fecha debe tener el formato YYYY-MM-DD"),
  body("is_paid").optional().isBoolean().withMessage("El estado de pago debe ser verdadero o falso"),
];

export const updateDebtValidation = [
  param("id").isInt().withMessage("El id debe ser un entero"),
  body("creditor_name").optional().isLength({ max: 100 }).withMessage("Nombre demasiado largo"),
  body("amount").optional().isFloat({ gt: 0 }).withMessage("El monto debe ser mayor a 0"),
  body("due_date").optional().isISO8601().withMessage("Fecha inválida"),
  body("is_paid").optional().isBoolean().withMessage("Estado de pago inválido"),
];

export const idParamValidation = [
  param("id").isInt().withMessage("El id debe ser un entero"),
];
