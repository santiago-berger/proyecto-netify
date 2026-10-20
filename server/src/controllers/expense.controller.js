import { matchedData } from "express-validator";
import { Op, fn, col, literal } from "sequelize";
import { Expense, Category } from "../models/index.js";

// GET /api/expenses  (GF-4)  -> lista los gastos del usuario, con su categoría
export const getExpenses = async (req, res) => {
  try {
    const { month, year } = req.query;
    const where = { user_id: req.user.id };

    if (month && year) {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const end = new Date(Number(year), Number(month), 0)
        .toISOString()
        .slice(0, 10);
      where.date = { [Op.between]: [start, end] };
    }

    const expenses = await Expense.findAll({
      where,
      include: [{ model: Category, as: "category" }],
      order: [["date", "DESC"]],
    });
    return res.status(200).json(expenses);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener los gastos", error: error.message });
  }
};

// GET /api/expenses/:id
export const getExpenseById = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const expense = await Expense.findOne({
      where: { id, user_id: req.user.id },
      include: [{ model: Category, as: "category" }],
    });
    if (!expense)
      return res.status(404).json({ message: "Gasto no encontrado" });
    return res.status(200).json(expense);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener el gasto", error: error.message });
  }
};

// POST /api/expenses  (GF-4, GF-5)
export const createExpense = async (req, res) => {
  try {
    const data = matchedData(req, { locations: ["body"] });
    const expense = await Expense.create({ ...data, user_id: req.user.id });
    return res
      .status(201)
      .json({ message: "Gasto registrado con éxito", expense });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al registrar el gasto", error: error.message });
  }
};

// PUT /api/expenses/:id
export const updateExpense = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const data = matchedData(req, { locations: ["body"] });

    const expense = await Expense.findOne({
      where: { id, user_id: req.user.id },
    });
    if (!expense)
      return res.status(404).json({ message: "Gasto no encontrado" });

    await expense.update(data);
    return res
      .status(200)
      .json({ message: "Gasto actualizado con éxito", expense });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al actualizar el gasto", error: error.message });
  }
};

// DELETE /api/expenses/:id  -> borrado lógico (paranoid)
export const deleteExpense = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const expense = await Expense.findOne({
      where: { id, user_id: req.user.id },
    });
    if (!expense)
      return res.status(404).json({ message: "Gasto no encontrado" });

    await expense.destroy();
    return res.status(200).json({ message: "Gasto eliminado con éxito" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al eliminar el gasto", error: error.message });
  }
};

// GET /api/expenses/summary  (GF-6)  -> total del mes y total por categoría
export const getSummary = async (req, res) => {
  try {
    const now = new Date();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const year = Number(req.query.year) || now.getFullYear();

    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const end = new Date(year, month, 0).toISOString().slice(0, 10);

    const rows = await Expense.findAll({
      where: {
        user_id: req.user.id,
        date: { [Op.between]: [start, end] },
      },
      attributes: [
        "category_id",
        [fn("SUM", col("amount")), "total"],
      ],
      include: [{ model: Category, as: "category", attributes: ["name", "color", "icon"] }],
      group: ["category_id", "category.id"],
      raw: true,
      nest: true,
    });

    const byCategory = rows.map((r) => ({
      category: r.category?.name || "Sin categoría",
      color: r.category?.color || "#8CB9CC",
      icon: r.category?.icon || "circle",
      total: Number(r.total) || 0,
    }));

    const total = byCategory.reduce((acc, c) => acc + c.total, 0);

    return res.status(200).json({ month, year, total, byCategory });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener el resumen", error: error.message });
  }
};

// GET /api/expenses/trend  -> total gastado por mes en el año (para el gráfico de línea)
export const getTrend = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();

    const rows = await Expense.findAll({
      where: {
        user_id: req.user.id,
        date: { [Op.between]: [`${year}-01-01`, `${year}-12-31`] },
      },
      attributes: [
        [fn("MONTH", col("date")), "month"],
        [fn("SUM", col("amount")), "total"],
      ],
      group: [literal("MONTH(`date`)")],
      raw: true,
    });

    const totals = Array.from({ length: 12 }, (_, i) => {
      const found = rows.find((r) => Number(r.month) === i + 1);
      return { month: i + 1, total: found ? Number(found.total) : 0 };
    });

    return res.status(200).json({ year, totals });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener la tendencia", error: error.message });
  }
};
