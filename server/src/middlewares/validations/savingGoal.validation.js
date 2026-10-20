import { body, param } from "express-validator";

export const createGoalValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("El nombre de la meta es obligatorio")
    .isLength({ max: 100 }).withMessage("El nombre es demasiado largo"),
  body("target_amount")
    .notEmpty().withMessage("El monto objetivo es obligatorio")
    .isFloat({ gt: 0 }).withMessage("El objetivo debe ser un número mayor a 0"),
];

export const contributionValidation = [
  param("id").isInt().withMessage("El id de la meta debe ser un entero"),
  body("amount")
    .notEmpty().withMessage("El monto del aporte es obligatorio")
    .isFloat({ gt: 0 }).withMessage("El aporte debe ser un número mayor a 0"),
  body("date")
    .notEmpty().withMessage("La fecha es obligatoria")
    .isISO8601().withMessage("La fecha debe tener el formato YYYY-MM-DD"),
];

export const idParamValidation = [
  param("id").isInt().withMessage("El id debe ser un entero"),
];
