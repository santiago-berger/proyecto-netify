import { Router } from "express";
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  addContribution,
  getGoalsHistory,
} from "../controllers/savingGoal.controller.js";
import {
  createGoalValidation,
  updateGoalValidation,
  contributionValidation,
  goalsHistoryValidation,
  idParamValidation,
} from "../middlewares/validations/savingGoal.validation.js";
import { validate } from "../middlewares/validator.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const savingGoalRouter = Router();

savingGoalRouter.use(authMiddleware);

savingGoalRouter.get("/goals", getGoals);
savingGoalRouter.get("/goals/history", goalsHistoryValidation, validate, getGoalsHistory);
savingGoalRouter.post("/goals", createGoalValidation, validate, createGoal);
savingGoalRouter.put("/goals/:id", updateGoalValidation, validate, updateGoal);
savingGoalRouter.delete("/goals/:id", idParamValidation, validate, deleteGoal);
savingGoalRouter.post("/goals/:id/contributions", contributionValidation, validate, addContribution);
