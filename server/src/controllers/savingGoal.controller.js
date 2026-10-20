import { matchedData } from "express-validator";
import { SavingGoal, SavingContribution } from "../models/index.js";

// arma la meta con su acumulado y porcentaje de avance
const buildGoalView = (goal) => {
  const saved = (goal.contributions || []).reduce(
    (acc, c) => acc + Number(c.amount),
    0
  );
  const target = Number(goal.target_amount);
  const percent = target > 0 ? Math.min(Math.round((saved / target) * 100), 100) : 0;
  return {
    id: goal.id,
    name: goal.name,
    target_amount: target,
    saved,
    percent,
    completed: saved >= target,
    contributions: goal.contributions || [],
  };
};

// GET /api/goals  (GF-11)
export const getGoals = async (req, res) => {
  try {
    const goals = await SavingGoal.findAll({
      where: { user_id: req.user.id },
      include: [{ model: SavingContribution, as: "contributions" }],
      order: [["created_at", "DESC"]],
    });
    return res.status(200).json(goals.map(buildGoalView));
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener las metas", error: error.message });
  }
};

// POST /api/goals  (GF-11)
export const createGoal = async (req, res) => {
  try {
    const data = matchedData(req, { locations: ["body"] });
    const goal = await SavingGoal.create({ ...data, user_id: req.user.id });
    return res.status(201).json({ message: "Meta creada con éxito", goal });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al crear la meta", error: error.message });
  }
};

// DELETE /api/goals/:id
export const deleteGoal = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const goal = await SavingGoal.findOne({ where: { id, user_id: req.user.id } });
    if (!goal) return res.status(404).json({ message: "Meta no encontrada" });

    await goal.destroy();
    return res.status(200).json({ message: "Meta eliminada con éxito" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al eliminar la meta", error: error.message });
  }
};

// POST /api/goals/:id/contributions  (GF-11)
export const addContribution = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const data = matchedData(req, { locations: ["body"] });

    const goal = await SavingGoal.findOne({ where: { id, user_id: req.user.id } });
    if (!goal) return res.status(404).json({ message: "Meta no encontrada" });

    const contribution = await SavingContribution.create({
      ...data,
      goal_id: goal.id,
    });
    return res
      .status(201)
      .json({ message: "Aporte registrado con éxito", contribution });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al registrar el aporte", error: error.message });
  }
};
