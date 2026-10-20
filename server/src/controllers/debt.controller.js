import { matchedData } from "express-validator";
import { Op, fn, col } from "sequelize";
import { Debt } from "../models/index.js";

// GET /api/debts  (GF-9)
export const getDebts = async (req, res) => {
  try {
    const debts = await Debt.findAll({
      where: { user_id: req.user.id },
      order: [["due_date", "ASC"]],
    });

    const pendingRow = await Debt.findOne({
      where: { user_id: req.user.id, is_paid: false },
      attributes: [[fn("SUM", col("amount")), "total"]],
      raw: true,
    });

    return res.status(200).json({
      debts,
      totalPending: Number(pendingRow?.total) || 0,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener las deudas", error: error.message });
  }
};

// POST /api/debts  (GF-9)
export const createDebt = async (req, res) => {
  try {
    const data = matchedData(req, { locations: ["body"] });
    const debt = await Debt.create({ ...data, user_id: req.user.id });
    return res.status(201).json({ message: "Deuda registrada con éxito", debt });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al registrar la deuda", error: error.message });
  }
};

// PUT /api/debts/:id
export const updateDebt = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const data = matchedData(req, { locations: ["body"] });

    const debt = await Debt.findOne({ where: { id, user_id: req.user.id } });
    if (!debt) return res.status(404).json({ message: "Deuda no encontrada" });

    await debt.update(data);
    return res.status(200).json({ message: "Deuda actualizada con éxito", debt });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al actualizar la deuda", error: error.message });
  }
};

// DELETE /api/debts/:id
export const deleteDebt = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const debt = await Debt.findOne({ where: { id, user_id: req.user.id } });
    if (!debt) return res.status(404).json({ message: "Deuda no encontrada" });

    await debt.destroy();
    return res.status(200).json({ message: "Deuda eliminada con éxito" });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al eliminar la deuda", error: error.message });
  }
};

// GET /api/debts/upcoming  (GF-10) -> vencimientos de los próximos 7 días
export const getUpcomingDebts = async (req, res) => {
  try {
    const today = new Date();
    const in7 = new Date();
    in7.setDate(today.getDate() + 7);

    const start = today.toISOString().slice(0, 10);
    const end = in7.toISOString().slice(0, 10);

    const upcoming = await Debt.findAll({
      where: {
        user_id: req.user.id,
        is_paid: false,
        due_date: { [Op.between]: [start, end] },
      },
      order: [["due_date", "ASC"]],
    });

    const overdue = await Debt.findAll({
      where: {
        user_id: req.user.id,
        is_paid: false,
        due_date: { [Op.lt]: start },
      },
      order: [["due_date", "ASC"]],
    });

    return res.status(200).json({ upcoming, overdue });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error al obtener los vencimientos", error: error.message });
  }
};
