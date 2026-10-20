import { verifyToken } from "../helpers/jwt.helper.js";

// protege rutas privadas: exige un token válido en la cookie
export const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ message: "No autenticado" });
    }

    const decoded = verifyToken(token);
    req.user = decoded; // { id, username, role }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }
};
