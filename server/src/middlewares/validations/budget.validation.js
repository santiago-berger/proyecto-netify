import { body, param } from "express-validator";
import { Category, Budget } from "../../models/index.js";

export const createBudgetValidation = [
  body("amount_limit")
    .notEmpty().withMessage("El tope es obligatorio")
    .isFloat({ gt: 0 }).withMessage("El tope debe ser un número mayor a 0"),
  body("month").isInt({ min: 1, max: 12 }).withMessage("El mes debe estar entre 1 y 12"),
  body("year").isInt({ min: 2000, max: 2100 }).withMessage("El año no es válido"),
  body("category_id")
    .isInt().withMessage("La categoría debe ser un id válido")
    .custom(async (value) => {
      const category = await Category.findByPk(value);
      if (!category) throw new Error("La categoría no existe");
      return true;
    }),
  // evita duplicar presupuesto por (usuario + categoría + mes + año)
  body("category_id").custom(async (value, { req }) => {
    const existe = await Budget.findOne({
      where: {
        user_id: req.user.id,
        category_id: value,
        month: req.body.month,
        year: req.body.year,
      },
    });
    if (existe)
      throw new Error("Ya existe un presupuesto para esa categoría en ese mes");
    return true;
  }),
];

export const updateBudgetValidation = [
  param("id").isInt().withMessage("El id debe ser un entero"),
  body("amount_limit").optional().isFloat({ gt: 0 }).withMessage("El tope debe ser mayor a 0"),
];

export const idParamValidation = [
  param("id").isInt().withMessage("El id debe ser un entero"),
];
