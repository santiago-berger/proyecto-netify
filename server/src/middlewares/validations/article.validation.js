import { param } from "express-validator";
import { Article } from "../../models/index.js";

export const articleIdValidation = [
  param("id")
    .isInt().withMessage("El id debe ser un entero")
    .custom(async (value) => {
      const article = await Article.findByPk(value);
      if (!article) throw new Error("El artículo no existe");
      return true;
    }),
];
