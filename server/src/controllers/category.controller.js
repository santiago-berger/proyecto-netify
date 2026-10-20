import { matchedData } from "express-validator";
import { Op } from "sequelize";
import { Category, Expense, Budget } from "../models/index.js";

// GET /api/categories -> categorías base del sistema + las personalizadas del usuario
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: {
        [Op.or]: [{ user_id: null }, { user_id: req.user.id }],
      },
      order: [["name", "ASC"]],
    });
    return res.status(200).json(categories);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener las categorías", error: error.message });
  }
};

// POST /api/categories -> crea una categoría personalizada del usuario
export const createCategory = async (req, res) => {
  try {
    const data = matchedData(req, { locations: ["body"] });
    const category = await Category.create({
      name: data.name,
      icon: data.icon || "tag",
      color: data.color || "#0edfdc",
      user_id: req.user.id,
    });
    return res.status(201).json({ message: "Categoría creada con éxito", category });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al crear la categoría", error: error.message });
  }
};

// DELETE /api/categories/:id -> solo puede borrar categorías propias y sin uso
export const deleteCategory = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });

    const category = await Category.findOne({
      where: { id, user_id: req.user.id },
    });
    if (!category)
      return res.status(404).json({ message: "Categoría no encontrada o no editable" });

    const enUso =
      (await Expense.count({ where: { category_id: id } })) +
      (await Budget.count({ where: { category_id: id } }));
    if (enUso > 0)
      return res.status(400).json({
        message: "No se puede eliminar: la categoría está siendo usada en gastos o presupuestos",
      });

    await category.destroy();
    return res.status(200).json({ message: "Categoría eliminada con éxito" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al eliminar la categoría", error: error.message });
  }
};
