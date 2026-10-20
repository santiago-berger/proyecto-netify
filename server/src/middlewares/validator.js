import { validationResult } from "express-validator";

// si express-validator acumuló errores, corta con 400
export const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Errores de validación",
      errors: errors.array(),
    });
  }

  next();
};
