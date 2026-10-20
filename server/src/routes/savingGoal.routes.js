import { Router } from "express";
import {
  getGoals,
  createGoal,
  deleteGoal,
  addContribution,
} from "../controllers/savingGoal.controller.js";
import {
  createGoalValidation,
  contributionValidation,
  idParamValidation,
} from "../middlewares/validations/savingGoal.validation.js";
import { validate } from "../middlewares/validator.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const savingGoalRouter = Router();

savingGoalRouter.use(authMiddleware);

savingGoalRouter.get("/goals", getGoals);
savingGoalRouter.post("/goals", createGoalValidation, validate, createGoal);
savingGoalRouter.delete("/goals/:id", idParamValidation, validate, deleteGoal);
savingGoalRouter.post("/goals/:id/contributions", contributionValidation, validate, addContribution);
