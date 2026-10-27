import { body, param } from "express-validator";
import { Category } from "../../models/index.js";
import { Op } from "sequelize";

export const createCategoryValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ min: 2, max: 50 }).withMessage("El nombre debe tener entre 2 y 50 caracteres")
    .custom(async (name, { req }) => {
      const existe = await Category.findOne({
        where: {
          name,
          [Op.or]: [{ user_id: null }, { user_id: req.user.id }],
        },
      });
      if (existe) throw new Error("Ya existe una categoría con ese nombre");
      return true;
    }),
  body("icon").optional().isLength({ max: 30 }).withMessage("Ícono inválido"),
  body("color").optional().isLength({ max: 7 }).withMessage("Color inválido"),
];

export const updateColorValidation = [
  param("id").isInt().withMessage("El id debe ser un entero"),
  body("color")
    .notEmpty().withMessage("El color es obligatorio")
    .matches(/^#[0-9a-fA-F]{6}$/).withMessage("El color debe tener el formato #RRGGBB"),
];

export const idParamValidation = [
  param("id").isInt().withMessage("El id debe ser un entero"),
];
