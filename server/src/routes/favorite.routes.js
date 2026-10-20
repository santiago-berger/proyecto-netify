import { Router } from "express";
import {
  getFavorites,
  addFavorite,
  removeFavorite,
} from "../controllers/favorite.controller.js";
import {
  addFavoriteValidation,
  removeFavoriteValidation,
} from "../middlewares/validations/favorite.validation.js";
import { validate } from "../middlewares/validator.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const favoriteRouter = Router();

favoriteRouter.use(authMiddleware);

favoriteRouter.get("/favorites", getFavorites);
favoriteRouter.post("/favorites", addFavoriteValidation, validate, addFavorite);
favoriteRouter.delete("/favorites/:article_id", removeFavoriteValidation, validate, removeFavorite);
