import { matchedData } from "express-validator";
import { Op, fn, col, literal } from "sequelize";
import { Expense, Category } from "../models/index.js";
import { getCurrentPeriod, getMonthRange } from "../helpers/date.helper.js";
import { getMonthlyCategoryTotals } from "../helpers/expense.helper.js";

// GET /api/expenses  (GF-4)  -> lista los gastos del usuario, con su categoría
export const getExpenses = async (req, res) => {
  try {
    const { month, year } = req.query;
    const where = { user_id: req.user.id };

    if (month && year) {
      const { start, end } = getMonthRange(Number(month), Number(year));
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

const EXPENSES_PER_PAGE = 15;

// GET /api/expenses/category/:id?page=&order=desc|asc&month=&year= -> paginated expenses of one category
export const getExpensesByCategory = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const { page = 1, order = "desc", month, year } = matchedData(req, { locations: ["query"] });
    const currentPage = Number(page);

    const category = await Category.findOne({
      where: { id, [Op.or]: [{ user_id: null }, { user_id: req.user.id }] },
    });
    if (!category) return res.status(404).json({ message: "Categoría no encontrada" });

    const where = { user_id: req.user.id, category_id: category.id };
    if (month && year) {
      const { start, end } = getMonthRange(Number(month), Number(year));
      where.date = { [Op.between]: [start, end] };
    }
    const [{ count, rows }, totalRow] = await Promise.all([
      Expense.findAndCountAll({
        where,
        order: [["date", order.toUpperCase()], ["id", order.toUpperCase()]],
        limit: EXPENSES_PER_PAGE,
        offset: (currentPage - 1) * EXPENSES_PER_PAGE,
      }),
      Expense.findOne({ where, attributes: [[fn("SUM", col("amount")), "total"]], raw: true }),
    ]);

    return res.status(200).json({
      category,
      expenses: rows,
      count,
      totalAmount: Number(totalRow?.total) || 0,
      page: currentPage,
      pages: Math.max(Math.ceil(count / EXPENSES_PER_PAGE), 1),
      perPage: EXPENSES_PER_PAGE,
    });
  } catch (error) {
    console.error("Error getting expenses by category:", error);
    return res.status(500).json({ message: "No se pudieron obtener los gastos de la categoría" });
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
    const current = getCurrentPeriod();
    const month = Number(req.query.month) || current.month;
    const year = Number(req.query.year) || current.year;

    const byCategory = await getMonthlyCategoryTotals(req.user.id, month, year);

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
