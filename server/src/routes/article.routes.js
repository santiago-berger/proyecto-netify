import { Router } from "express";
import { getArticles, getArticleById } from "../controllers/article.controller.js";
import { articleIdValidation } from "../middlewares/validations/article.validation.js";
import { validate } from "../middlewares/validator.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const articleRouter = Router();

articleRouter.use(authMiddleware);

articleRouter.get("/articles", getArticles);
articleRouter.get("/articles/:id", articleIdValidation, validate, getArticleById);
