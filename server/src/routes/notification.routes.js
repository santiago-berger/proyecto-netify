import { Router } from "express";
import { getNotifications } from "../controllers/notification.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const notificationRouter = Router();

notificationRouter.use(authMiddleware);

notificationRouter.get("/notifications", getNotifications);
