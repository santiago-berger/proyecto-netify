import { Op } from "sequelize";
import { Debt, Reminder } from "../models/index.js";
import { toLocalISODate, addDays } from "../helpers/date.helper.js";

const DEBT_SOON_DAYS = 3;
const REMINDER_SOON_DAYS = 1;
const LEVEL_ORDER = { danger: 0, warn: 1, info: 2 };

// GET /api/notifications -> built on the fly from debts and reminders (nothing is stored)
export const getNotifications = async (req, res) => {
  try {
    const now = new Date();
    const today = toLocalISODate(now);
    const debtLimit = toLocalISODate(addDays(now, DEBT_SOON_DAYS));
    const reminderLimit = toLocalISODate(addDays(now, REMINDER_SOON_DAYS));

    const [overdueDebts, soonDebts, soonReminders] = await Promise.all([
      Debt.findAll({
        where: { user_id: req.user.id, is_paid: false, due_date: { [Op.lt]: today } },
        order: [["due_date", "ASC"]],
      }),
      Debt.findAll({
        where: { user_id: req.user.id, is_paid: false, due_date: { [Op.between]: [today, debtLimit] } },
        order: [["due_date", "ASC"]],
      }),
      Reminder.findAll({
        where: { user_id: req.user.id, date: { [Op.between]: [today, reminderLimit] } },
        order: [["date", "ASC"]],
      }),
    ]);

    // the id includes the date so a rescheduled item shows up as a new notification
    const notifications = [
      ...overdueDebts.map((d) => ({
        id: `debt-overdue-${d.id}-${d.due_date}`,
        kind: "debt_overdue",
        level: "danger",
        title: d.creditor_name,
        amount: Number(d.amount),
        date: d.due_date,
        link: "/deudas",
      })),
      ...soonDebts.map((d) => ({
        id: `debt-soon-${d.id}-${d.due_date}`,
        kind: "debt_soon",
        level: "warn",
        title: d.creditor_name,
        amount: Number(d.amount),
        date: d.due_date,
        link: "/deudas",
      })),
      ...soonReminders.map((r) => ({
        id: `reminder-${r.id}-${r.date}`,
        kind: "reminder",
        level: "info",
        title: r.title,
        amount: r.amount === null ? null : Number(r.amount),
        date: r.date,
        link: "/calendario",
      })),
    ].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || String(a.date).localeCompare(String(b.date)));

    return res.status(200).json({ today, notifications });
  } catch (error) {
    console.error("Error getting notifications:", error);
    return res.status(500).json({ message: "No se pudieron obtener las notificaciones" });
  }
};
