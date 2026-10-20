import { Router } from "express";
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetStatus,
} from "../controllers/budget.controller.js";
import {
  createBudgetValidation,
  updateBudgetValidation,
  idParamValidation,
} from "../middlewares/validations/budget.validation.js";
import { validate } from "../middlewares/validator.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const budgetRouter = Router();

budgetRouter.use(authMiddleware);

budgetRouter.get("/budgets/status", getBudgetStatus);
budgetRouter.get("/budgets", getBudgets);
budgetRouter.post("/budgets", createBudgetValidation, validate, createBudget);
budgetRouter.put("/budgets/:id", updateBudgetValidation, validate, updateBudget);
budgetRouter.delete("/budgets/:id", idParamValidation, validate, deleteBudget);
