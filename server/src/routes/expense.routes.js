import { Router } from "express";
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getSummary,
  getTrend,
  getExpensesByCategory,
} from "../controllers/expense.controller.js";
import {
  createExpenseValidation,
  updateExpenseValidation,
  idParamValidation,
  categoryExpensesValidation,
} from "../middlewares/validations/expense.validation.js";
import { validate } from "../middlewares/validator.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const expenseRouter = Router();

expenseRouter.use(authMiddleware); // todas las rutas de gastos son privadas

expenseRouter.get("/expenses/summary", getSummary);
expenseRouter.get("/expenses/trend", getTrend);
expenseRouter.get("/expenses/category/:id", categoryExpensesValidation, validate, getExpensesByCategory);
expenseRouter.get("/expenses", getExpenses);
expenseRouter.get("/expenses/:id", idParamValidation, validate, getExpenseById);
expenseRouter.post("/expenses", createExpenseValidation, validate, createExpense);
expenseRouter.put("/expenses/:id", updateExpenseValidation, validate, updateExpense);
expenseRouter.delete("/expenses/:id", idParamValidation, validate, deleteExpense);
