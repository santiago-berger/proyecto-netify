import { body, param } from "express-validator";
import { Category } from "../../models/index.js";

const amount = body("amount")
  .notEmpty().withMessage("El monto es obligatorio")
  .isFloat({ gt: 0 }).withMessage("El monto debe ser un número mayor a 0");

const description = body("description")
  .trim()
  .notEmpty().withMessage("La descripción es obligatoria")
  .isLength({ max: 150 }).withMessage("La descripción no puede superar los 150 caracteres");

const date = body("date")
  .notEmpty().withMessage("La fecha es obligatoria")
  .isISO8601().withMessage("La fecha debe tener el formato YYYY-MM-DD");

const categoryExists = body("category_id")
  .notEmpty().withMessage("La categoría es obligatoria")
  .isInt().withMessage("La categoría debe ser un id válido")
  .custom(async (value) => {
    const category = await Category.findByPk(value);
    if (!category) throw new Error("La categoría no existe");
    return true;
  });

export const createExpenseValidation = [amount, description, date, categoryExists];

export const updateExpenseValidation = [
  param("id").isInt().withMessage("El id debe ser un entero"),
  body("amount").optional().isFloat({ gt: 0 }).withMessage("El monto debe ser mayor a 0"),
  body("description").optional().isLength({ max: 150 }).withMessage("Descripción demasiado larga"),
  body("date").optional().isISO8601().withMessage("Fecha inválida"),
  body("category_id")
    .optional()
    .isInt().withMessage("Categoría inválida")
    .custom(async (value) => {
      const category = await Category.findByPk(value);
      if (!category) throw new Error("La categoría no existe");
      return true;
    }),
];

export const idParamValidation = [
  param("id").isInt().withMessage("El id debe ser un entero"),
];
