import { body, param, query } from "express-validator";

const REMINDER_TYPES = ["income", "payment", "other"];

export const getRemindersValidation = [
  query("month").optional().isInt({ min: 1, max: 12 }).withMessage("El mes debe estar entre 1 y 12"),
  query("year").optional().isInt({ min: 2000, max: 2100 }).withMessage("El año no es válido"),
];

export const createReminderValidation = [
  body("title")
    .trim()
    .notEmpty().withMessage("El título es obligatorio")
    .isLength({ max: 100 }).withMessage("El título es demasiado largo"),
  body("date")
    .notEmpty().withMessage("La fecha es obligatoria")
    .isISO8601().withMessage("La fecha debe tener el formato YYYY-MM-DD"),
  body("type")
    .notEmpty().withMessage("El tipo es obligatorio")
    .isIn(REMINDER_TYPES).withMessage("El tipo de recordatorio no es válido"),
  body("amount")
    .optional({ values: "null" })
    .isFloat({ gt: 0 }).withMessage("El monto debe ser un número mayor a 0"),
];

export const updateReminderValidation = [
  param("id").isInt().withMessage("El id debe ser un entero"),
  body("title")
    .optional()
    .trim()
    .notEmpty().withMessage("El título es obligatorio")
    .isLength({ max: 100 }).withMessage("El título es demasiado largo"),
  body("date").optional().isISO8601().withMessage("La fecha debe tener el formato YYYY-MM-DD"),
  body("type").optional().isIn(REMINDER_TYPES).withMessage("El tipo de recordatorio no es válido"),
  body("amount")
    .optional({ values: "null" })
    .isFloat({ gt: 0 }).withMessage("El monto debe ser un número mayor a 0"),
];

export const idParamValidation = [
  param("id").isInt().withMessage("El id debe ser un entero"),
];
