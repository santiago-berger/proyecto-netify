import { matchedData } from "express-validator";
import { Op } from "sequelize";
import { Category, Expense, Budget, CategoryColor } from "../models/index.js";

// GET /api/categories -> categorías base del sistema + las personalizadas del usuario
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: {
        [Op.or]: [{ user_id: null }, { user_id: req.user.id }],
      },
      order: [["name", "ASC"]],
    });

    // replace the shared color of base categories with the one this user picked
    const overrides = await CategoryColor.findAll({ where: { user_id: req.user.id } });
    const colorById = Object.fromEntries(overrides.map((o) => [o.category_id, o.color]));
    const result = categories.map((c) => ({ ...c.toJSON(), color: colorById[c.id] || c.color }));

    return res.status(200).json(result);
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

// PUT /api/categories/:id/color -> own categories are updated, base ones get a per-user color
export const updateCategoryColor = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const { color } = matchedData(req, { locations: ["body"] });

    const category = await Category.findOne({
      where: { id, [Op.or]: [{ user_id: null }, { user_id: req.user.id }] },
    });
    if (!category) return res.status(404).json({ message: "Categoría no encontrada" });

    if (category.user_id === req.user.id) {
      await category.update({ color });
    } else {
      const [override] = await CategoryColor.findOrCreate({
        where: { user_id: req.user.id, category_id: category.id },
        defaults: { color },
      });
      await override.update({ color });
    }

    return res.status(200).json({ message: "Color actualizado con éxito", category: { ...category.toJSON(), color } });
  } catch (error) {
    console.error("Error updating category color:", error);
    return res.status(500).json({ message: "No se pudo actualizar el color" });
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
