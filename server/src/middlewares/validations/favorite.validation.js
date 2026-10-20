import { body, param } from "express-validator";
import { Article } from "../../models/index.js";

export const addFavoriteValidation = [
  body("article_id")
    .isInt().withMessage("El id del artículo debe ser un entero")
    .custom(async (value) => {
      const article = await Article.findByPk(value);
      if (!article) throw new Error("El artículo no existe");
      return true;
    }),
];

export const removeFavoriteValidation = [
  param("article_id").isInt().withMessage("El id del artículo debe ser un entero"),
];
