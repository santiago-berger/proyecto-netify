import { Router } from "express";
import {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
} from "../controllers/reminder.controller.js";
import {
  getRemindersValidation,
  createReminderValidation,
  updateReminderValidation,
  idParamValidation,
} from "../middlewares/validations/reminder.validation.js";
import { validate } from "../middlewares/validator.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const reminderRouter = Router();

reminderRouter.use(authMiddleware);

reminderRouter.get("/reminders", getRemindersValidation, validate, getReminders);
reminderRouter.post("/reminders", createReminderValidation, validate, createReminder);
reminderRouter.put("/reminders/:id", updateReminderValidation, validate, updateReminder);
reminderRouter.delete("/reminders/:id", idParamValidation, validate, deleteReminder);
