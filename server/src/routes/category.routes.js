import { Router } from "express";
import {
  getCategories,
  createCategory,
  updateCategoryColor,
  deleteCategory,
} from "../controllers/category.controller.js";
import {
  createCategoryValidation,
  updateColorValidation,
  idParamValidation,
} from "../middlewares/validations/category.validation.js";
import { validate } from "../middlewares/validator.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const categoryRouter = Router();

categoryRouter.use(authMiddleware);

categoryRouter.get("/categories", getCategories);
categoryRouter.post("/categories", createCategoryValidation, validate, createCategory);
categoryRouter.put("/categories/:id/color", updateColorValidation, validate, updateCategoryColor);
categoryRouter.delete("/categories/:id", idParamValidation, validate, deleteCategory);
