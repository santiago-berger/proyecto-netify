import { Op, fn, col } from "sequelize";
import { Expense, Category } from "../models/index.js";
import { getMonthRange } from "./date.helper.js";

// total spent per category in a month: [{ category, color, icon, total }]
export const getMonthlyCategoryTotals = async (userId, month, year) => {
  const { start, end } = getMonthRange(month, year);

  const rows = await Expense.findAll({
    where: {
      user_id: userId,
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

  return rows.map((r) => ({
    category: r.category?.name || "Sin categoría",
    color: r.category?.color || "#8CB9CC",
    icon: r.category?.icon || "circle",
    total: Number(r.total) || 0,
  }));
};

const TOP_CATEGORY_SHARE = 0.4;
const LEISURE_SHARE = 0.2;
const MANY_CATEGORIES = 6;

// simple saving tips from the month breakdown; the key identifies each tip for "read" tracking
export const buildSavingTips = (byCategory) => {
  const total = byCategory.reduce((acc, c) => acc + c.total, 0);
  if (!total) return [];

  const tips = [];
  const top = [...byCategory].sort((a, b) => b.total - a.total)[0];
  if (top.total / total >= TOP_CATEGORY_SHARE) {
    tips.push({
      key: `top-${top.category}`,
      text: `Estás concentrando el ${Math.round((top.total / total) * 100)}% de tus gastos en “${top.category}”. Revisá si podés recortar algo ahí.`,
    });
  }

  const leisure = byCategory.find((c) => /ocio|entreten/i.test(c.category));
  if (leisure && leisure.total / total >= LEISURE_SHARE) {
    tips.push({
      key: "leisure",
      text: `Ocio representa el ${Math.round((leisure.total / total) * 100)}% del mes. Ponerle un presupuesto puede ayudarte a ahorrar.`,
    });
  }

  if (byCategory.length >= MANY_CATEGORIES) {
    tips.push({
      key: "many-categories",
      text: "Tenés gastos repartidos en muchas categorías: fijar topes por categoría te va a dar más control.",
    });
  }

  return tips;
};
