import { matchedData } from "express-validator";
import { User, Profile } from "../models/index.js";
import { hashPassword, comparePassword } from "../helpers/bcrypt.helper.js";
import { generateToken } from "../helpers/jwt.helper.js";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  maxAge: 1000 * 60 * 60, // 1 hora
};

// POST /api/auth/register  (GF-1)
export const register = async (req, res) => {
  try {
    const { username, email, password, first_name, last_name, monthly_income } =
      matchedData(req);

    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: "user",
    });

    await Profile.create({
      user_id: user.id,
      first_name,
      last_name,
      monthly_income: monthly_income ?? 0,
    });

    return res.status(201).json({ message: "Usuario registrado con éxito" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al registrar el usuario", error: error.message });
  }
};

// POST /api/auth/login  (GF-2)
export const login = async (req, res) => {
  try {
    const { username, password } = matchedData(req);

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    res.cookie("token", token, cookieOptions);

    return res.status(200).json({
      message: "Login exitoso",
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al iniciar sesión", error: error.message });
  }
};

// POST /api/auth/logout  (GF-15)
export const logout = async (req, res) => {
  res.clearCookie("token");
  return res.status(200).json({ message: "Logout exitoso" });
};

// GET /api/auth/me  -> usuario logueado + perfil  (GF-3)
export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] },
      include: [{ model: Profile, as: "profile" }],
    });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });
    return res.status(200).json(user);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener el perfil", error: error.message });
  }
};

// PUT /api/auth/profile  (GF-3)
export const updateProfile = async (req, res) => {
  try {
    const data = matchedData(req, { locations: ["body"] });

    const profile = await Profile.findOne({ where: { user_id: req.user.id } });
    if (!profile)
      return res.status(404).json({ message: "Perfil no encontrado" });

    await profile.update(data);
    return res
      .status(200)
      .json({ message: "Perfil actualizado con éxito", profile });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al actualizar el perfil", error: error.message });
  }
};
