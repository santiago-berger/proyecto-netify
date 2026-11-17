import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import { connectDB } from "./src/config/database.js";
import "./src/models/index.js";
import { seedInitialData } from "./src/seeders/seed.js";

import { authRouter } from "./src/routes/auth.routes.js";
import { categoryRouter } from "./src/routes/category.routes.js";
import { expenseRouter } from "./src/routes/expense.routes.js";
import { budgetRouter } from "./src/routes/budget.routes.js";
import { debtRouter } from "./src/routes/debt.routes.js";
import { savingGoalRouter } from "./src/routes/savingGoal.routes.js";
import { articleRouter } from "./src/routes/article.routes.js";
import { favoriteRouter } from "./src/routes/favorite.routes.js";
import { reminderRouter } from "./src/routes/reminder.routes.js";
import { notificationRouter } from "./src/routes/notification.routes.js";
import { loanRouter } from "./src/routes/loan.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "gestor-de-finanzas-api" });
});

app.use("/api", authRouter);
app.use("/api", categoryRouter);
app.use("/api", expenseRouter);
app.use("/api", budgetRouter);
app.use("/api", debtRouter);
app.use("/api", savingGoalRouter);
app.use("/api", articleRouter);
app.use("/api", favoriteRouter);
app.use("/api", reminderRouter);
app.use("/api", notificationRouter);
app.use("/api", loanRouter);

app.listen(PORT, async () => {
  await connectDB();
  await seedInitialData();
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
