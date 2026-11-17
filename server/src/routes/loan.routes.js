import { Router } from "express";
import { getLoanCatalog, simulateLoans, getLoanDetail } from "../controllers/loan.controller.js";
import { simulateValidation, loanDetailValidation } from "../middlewares/validations/loan.validation.js";
import { validate } from "../middlewares/validator.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

export const loanRouter = Router();

loanRouter.use("/loans", authMiddleware);

loanRouter.get("/loans/catalog", getLoanCatalog);
loanRouter.get("/loans/simulate", simulateValidation, validate, simulateLoans);
// va última para que "/catalog" y "/simulate" no se tomen como un :id
loanRouter.get("/loans/:id", loanDetailValidation, validate, getLoanDetail);
