import { matchedData } from "express-validator";
import { Op, fn, col } from "sequelize";
import { Budget, Category, Expense } from "../models/index.js";
import { getCurrentPeriod, getMonthRange } from "../helpers/date.helper.js";

// GET /api/budgets  (GF-7) -> only the budgets of the current month
export const getBudgets = async (req, res) => {
  try {
    const { month, year } = getCurrentPeriod();
    const budgets = await Budget.findAll({
      where: { user_id: req.user.id, month, year },
      include: [{ model: Category, as: "category" }],
      order: [["created_at", "ASC"]],
    });
    return res.status(200).json({ month, year, budgets });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener los presupuestos", error: error.message });
  }
};

// POST /api/budgets  (GF-7)
export const createBudget = async (req, res) => {
  try {
    const data = matchedData(req, { locations: ["body"] });
    const { month, year } = getCurrentPeriod();
    const budget = await Budget.create({ ...data, month, year, user_id: req.user.id });
    return res
      .status(201)
      .json({ message: "Presupuesto creado con éxito", budget });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al crear el presupuesto", error: error.message });
  }
};

// PUT /api/budgets/:id
export const updateBudget = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const data = matchedData(req, { locations: ["body"] });

    const budget = await Budget.findOne({ where: { id, user_id: req.user.id } });
    if (!budget)
      return res.status(404).json({ message: "Presupuesto no encontrado" });

    await budget.update(data);
    return res
      .status(200)
      .json({ message: "Presupuesto actualizado con éxito", budget });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al actualizar el presupuesto", error: error.message });
  }
};

// DELETE /api/budgets/:id
export const deleteBudget = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const budget = await Budget.findOne({ where: { id, user_id: req.user.id } });
    if (!budget)
      return res.status(404).json({ message: "Presupuesto no encontrado" });

    await budget.destroy();
    return res.status(200).json({ message: "Presupuesto eliminado con éxito" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al eliminar el presupuesto", error: error.message });
  }
};

// GET /api/budgets/status  (GF-8) -> compara gasto vs tope y calcula estado
export const getBudgetStatus = async (req, res) => {
  try {
    const current = getCurrentPeriod();
    const month = Number(req.query.month) || current.month;
    const year = Number(req.query.year) || current.year;

    const { start, end } = getMonthRange(month, year);

    const budgets = await Budget.findAll({
      where: { user_id: req.user.id, month, year },
      include: [{ model: Category, as: "category" }],
    });

    const status = [];
    for (const budget of budgets) {
      const spentRow = await Expense.findOne({
        where: {
          user_id: req.user.id,
          category_id: budget.category_id,
          date: { [Op.between]: [start, end] },
        },
        attributes: [[fn("SUM", col("amount")), "total"]],
        raw: true,
      });

      const spent = Number(spentRow?.total) || 0;
      const limit = Number(budget.amount_limit);
      const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      let state = "ok";
      if (percent >= 100) state = "excedido";
      else if (percent >= 80) state = "alerta";

      status.push({
        budget_id: budget.id,
        category: budget.category?.name,
        color: budget.category?.color,
        limit,
        spent,
        percent,
        state,
      });
    }

    return res.status(200).json({ month, year, status });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener el estado de los presupuestos", error: error.message });
  }
};
