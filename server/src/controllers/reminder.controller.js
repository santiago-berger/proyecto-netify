import { matchedData } from "express-validator";
import { Op } from "sequelize";
import { Reminder } from "../models/index.js";
import { getMonthRange } from "../helpers/date.helper.js";

// GET /api/reminders?month=&year=  (without params returns every reminder)
export const getReminders = async (req, res) => {
  try {
    const { month, year } = matchedData(req, { locations: ["query"] });
    const where = { user_id: req.user.id };

    if (month && year) {
      const { start, end } = getMonthRange(Number(month), Number(year));
      where.date = { [Op.between]: [start, end] };
    }

    const reminders = await Reminder.findAll({ where, order: [["date", "ASC"]] });
    return res.status(200).json(reminders);
  } catch (error) {
    console.error("Error getting reminders:", error);
    return res.status(500).json({ message: "No se pudieron obtener los recordatorios" });
  }
};

// POST /api/reminders
export const createReminder = async (req, res) => {
  try {
    const data = matchedData(req, { locations: ["body"] });
    const reminder = await Reminder.create({ ...data, user_id: req.user.id });
    return res.status(201).json({ message: "Recordatorio creado con éxito", reminder });
  } catch (error) {
    console.error("Error creating reminder:", error);
    return res.status(500).json({ message: "No se pudo crear el recordatorio" });
  }
};

// PUT /api/reminders/:id
export const updateReminder = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const data = matchedData(req, { locations: ["body"] });

    const reminder = await Reminder.findOne({ where: { id, user_id: req.user.id } });
    if (!reminder) return res.status(404).json({ message: "Recordatorio no encontrado" });

    await reminder.update(data);
    return res.status(200).json({ message: "Recordatorio actualizado con éxito", reminder });
  } catch (error) {
    console.error("Error updating reminder:", error);
    return res.status(500).json({ message: "No se pudo actualizar el recordatorio" });
  }
};

// DELETE /api/reminders/:id
export const deleteReminder = async (req, res) => {
  try {
    const { id } = matchedData(req, { locations: ["params"] });
    const reminder = await Reminder.findOne({ where: { id, user_id: req.user.id } });
    if (!reminder) return res.status(404).json({ message: "Recordatorio no encontrado" });

    await reminder.destroy();
    return res.status(200).json({ message: "Recordatorio eliminado con éxito" });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return res.status(500).json({ message: "No se pudo eliminar el recordatorio" });
  }
};
