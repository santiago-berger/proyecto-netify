import { matchedData } from "express-validator";
import { Op, fn, col } from "sequelize";
import { sequelize, Budget, BudgetHistory, Category, Expense } from "../models/index.js";
import { getCurrentPeriod, getMonthRange } from "../helpers/date.helper.js";

// registra un cambio de tope en el historial (dentro de la misma transacción que el cambio)
const recordBudgetChange = (budget, categoryName, { action, previous_limit = null, new_limit = null }, transaction) =>
  BudgetHistory.create(
    {
      user_id: budget.user_id,
      category_id: budget.category_id,
      category_name: categoryName ?? "Categoría eliminada",
      month: budget.month,
      year: budget.year,
      action,
      previous_limit,
      new_limit,
    },
    { transaction }
  );

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
    const category = await Category.findByPk(data.category_id);

    const budget = await sequelize.transaction(async (transaction) => {
      const created = await Budget.create({ ...data, month, year, user_id: req.user.id }, { transaction });
      await recordBudgetChange(created, category?.name, { action: "creado", new_limit: created.amount_limit }, transaction);
      return created;
    });
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

    const budget = await Budget.findOne({
      where: { id, user_id: req.user.id },
      include: [{ model: Category, as: "category" }],
    });
    if (!budget)
      return res.status(404).json({ message: "Presupuesto no encontrado" });

    const previous = Number(budget.amount_limit);
    const next = Number(data.amount_limit);
    // si el tope no cambió, no hay nada que registrar
    if (previous !== next) {
      await sequelize.transaction(async (transaction) => {
        await budget.update(data, { transaction });
        await recordBudgetChange(
          budget,
          budget.category?.name,
          { action: "modificado", previous_limit: previous, new_limit: next },
          transaction
        );
      });
    }
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
    const budget = await Budget.findOne({
      where: { id, user_id: req.user.id },
      include: [{ model: Category, as: "category" }],
    });
    if (!budget)
      return res.status(404).json({ message: "Presupuesto no encontrado" });

    await sequelize.transaction(async (transaction) => {
      await recordBudgetChange(
        budget,
        budget.category?.name,
        { action: "eliminado", previous_limit: budget.amount_limit },
        transaction
      );
      await budget.destroy({ transaction });
    });
    return res.status(200).json({ message: "Presupuesto eliminado con éxito" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al eliminar el presupuesto", error: error.message });
  }
};

// GET /api/budgets/history?month=&year=  -> cambios en los topes del mes (por defecto, el actual)
export const getBudgetHistory = async (req, res) => {
  try {
    const current = getCurrentPeriod();
    const { month = current.month, year = current.year } = matchedData(req, { locations: ["query"] });

    const rows = await BudgetHistory.findAll({
      where: { user_id: req.user.id, month, year },
      include: [{ model: Category, as: "category", attributes: ["id", "name", "color"] }],
      order: [["changed_at", "DESC"], ["id", "DESC"]],
    });

    const toNumber = (v) => (v === null ? null : Number(v));
    const history = rows.map((h) => {
      const previous = toNumber(h.previous_limit);
      const next = toNumber(h.new_limit);
      return {
        id: h.id,
        action: h.action,
        // el nombre guardado es el que tenía la categoría al momento del cambio
        category: { id: h.category_id, name: h.category_name, color: h.category?.color ?? null },
        previous_limit: previous,
        new_limit: next,
        difference: previous !== null && next !== null ? next - previous : null,
        changed_at: h.changed_at,
      };
    });

    return res.status(200).json({ month, year, history });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener el historial de presupuestos", error: error.message });
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
