import { Router } from "express";
import {
  getDebts,
  createDebt,
  updateDebt,
  deleteDebt,
  getUpcomingDebts,
} from "../controllers/debt.controller.js";
import {
  createDebtValidation,
  updateDebtValidation,
  idParamValidation,
} from "../middlewares/validations/debt.validation.js";
import { validate } from "../middlewares/validator.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const debtRouter = Router();

debtRouter.use(authMiddleware);

debtRouter.get("/debts/upcoming", getUpcomingDebts);
debtRouter.get("/debts", getDebts);
debtRouter.post("/debts", createDebtValidation, validate, createDebt);
debtRouter.put("/debts/:id", updateDebtValidation, validate, updateDebt);
debtRouter.delete("/debts/:id", idParamValidation, validate, deleteDebt);
