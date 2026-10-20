import { body } from "express-validator";
import { User } from "../../models/index.js";

export const registerValidation = [
  body("username")
    .trim()
    .notEmpty().withMessage("El nombre de usuario es obligatorio")
    .isLength({ min: 3, max: 20 }).withMessage("El usuario debe tener entre 3 y 20 caracteres")
    .custom(async (username) => {
      const existe = await User.findOne({ where: { username } });
      if (existe) throw new Error("El nombre de usuario ya está en uso");
      return true;
    }),

  body("email")
    .trim()
    .notEmpty().withMessage("El correo es obligatorio")
    .isEmail().withMessage("El correo debe tener un formato válido")
    .custom(async (email) => {
      const existe = await User.findOne({ where: { email } });
      if (existe) throw new Error("El correo ya está registrado");
      return true;
    }),

  body("password")
    .notEmpty().withMessage("La contraseña es obligatoria")
    .isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),

  body("first_name")
    .trim()
    .notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ min: 2, max: 50 }).withMessage("El nombre debe tener entre 2 y 50 caracteres"),

  body("last_name")
    .trim()
    .notEmpty().withMessage("El apellido es obligatorio")
    .isLength({ min: 2, max: 50 }).withMessage("El apellido debe tener entre 2 y 50 caracteres"),

  body("monthly_income")
    .optional()
    .isFloat({ min: 0 }).withMessage("El ingreso mensual debe ser un número positivo"),
];

export const loginValidation = [
  body("username").trim().notEmpty().withMessage("El usuario es obligatorio"),
  body("password").notEmpty().withMessage("La contraseña es obligatoria"),
];

export const updateProfileValidation = [
  body("first_name")
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage("El nombre debe tener entre 2 y 50 caracteres"),
  body("last_name")
    .optional()
    .isLength({ min: 2, max: 50 }).withMessage("El apellido debe tener entre 2 y 50 caracteres"),
  body("monthly_income")
    .optional()
    .isFloat({ min: 0 }).withMessage("El ingreso mensual debe ser un número positivo"),
  body("avatar_url")
    .optional(),
  body("onboarded")
    .optional()
    .isBoolean().withMessage("El valor de onboarded debe ser verdadero o falso"),
];
