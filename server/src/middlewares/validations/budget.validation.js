import { body, param, query } from "express-validator";
import { Category, Budget } from "../../models/index.js";
import { getCurrentPeriod } from "../../helpers/date.helper.js";

export const createBudgetValidation = [
  body("amount_limit")
    .notEmpty().withMessage("El tope es obligatorio")
    .isFloat({ gt: 0 }).withMessage("El tope debe ser un número mayor a 0"),
  body("category_id")
    .isInt().withMessage("La categoría debe ser un id válido")
    .custom(async (value) => {
      const category = await Category.findByPk(value);
      if (!category) throw new Error("La categoría no existe");
      return true;
    }),
  // evita duplicar presupuesto por (usuario + categoría) dentro del mes actual
  body("category_id").custom(async (value, { req }) => {
    const { month, year } = getCurrentPeriod();
    const existe = await Budget.findOne({
      where: {
        user_id: req.user.id,
        category_id: value,
        month,
        year,
      },
    });
    if (existe)
      throw new Error("Ya tenés un presupuesto para esa categoría este mes");
    return true;
  }),
];

export const updateBudgetValidation = [
  param("id").isInt().withMessage("El id debe ser un entero"),
  body("amount_limit")
    .notEmpty().withMessage("El tope es obligatorio")
    .isFloat({ gt: 0 }).withMessage("El tope debe ser mayor a 0"),
];

// historial: mes y año opcionales (por defecto, el período actual)
export const budgetHistoryValidation = [
  query("month").optional().isInt({ min: 1, max: 12 }).withMessage("El mes debe estar entre 1 y 12").toInt(),
  query("year").optional().isInt({ min: 2000, max: 2100 }).withMessage("El año no es válido").toInt(),
];

export const idParamValidation = [
  param("id").isInt().withMessage("El id debe ser un entero"),
];
