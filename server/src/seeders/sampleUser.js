/*
  Usuario simulado con un año de datos para probar la app con información realista.
  Ejecutar desde la carpeta server:  node src/seeders/sampleUser.js
  Si el usuario ya existe, se borra con todos sus datos y se vuelve a crear.
*/
import { Op } from "sequelize";
import { sequelize } from "../config/database.js";
import {
  User,
  Profile,
  Category,
  Expense,
  Budget,
  Debt,
  SavingGoal,
  SavingContribution,
  Article,
  Favorite,
  Reminder,
  CategoryColor,
} from "../models/index.js";
import { hashPassword } from "../helpers/bcrypt.helper.js";
import { toLocalISODate, addDays } from "../helpers/date.helper.js";
import { seedInitialData } from "./seed.js";

const SAMPLE_USER = {
  username: "lucia",
  email: "lucia.fernandez@correo.com",
  password: "lucia1234",
  first_name: "Lucía",
  last_name: "Fernández",
  monthly_income: 1200000,
};

const MONTHS_OF_HISTORY = 12;
const MONTHLY_INFLATION = 0.025;

// deterministic pseudo-random numbers so every run creates the same data
const createRandom = (seed) => () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};
const random = createRandom(42);
const between = (min, max) => Math.round(min + random() * (max - min));
const roundTo = (value, step = 100) => Math.round(value / step) * step;

const dateIn = (year, month, day) => {
  const lastDay = new Date(year, month, 0).getDate();
  return toLocalISODate(new Date(year, month - 1, Math.min(day, lastDay)));
};

// recurring and variable expenses of a month; amounts are expressed in today's prices
const monthTemplate = () => [
  { category: "Vivienda", description: "Alquiler", day: 1, amount: 380000 },
  { category: "Vivienda", description: "Expensas", day: 5, amount: 65000 },
  { category: "Servicios", description: "Luz", day: 9, amount: between(28000, 42000) },
  { category: "Servicios", description: "Gas", day: 11, amount: between(15000, 30000) },
  { category: "Servicios", description: "Internet", day: 12, amount: 32000 },
  { category: "Servicios", description: "Plan de celular", day: 14, amount: 18500 },
  { category: "Salud", description: "Prepaga", day: 3, amount: 95000 },
  { category: "Educación", description: "Curso de inglés", day: 6, amount: 45000 },
  { category: "Ocio", description: "Netflix", day: 15, amount: 9800 },
  { category: "Ocio", description: "Spotify", day: 16, amount: 4500 },
  { category: "Gimnasio", description: "Cuota del gimnasio", day: 2, amount: 38000 },
  ...[4, 11, 18, 25].map((day) => ({ category: "Alimentos", description: "Supermercado", day, amount: between(42000, 68000) })),
  ...[7, 21].map((day) => ({ category: "Alimentos", description: "Verdulería", day, amount: between(9000, 16000) })),
  ...[10, 24].map((day) => ({ category: "Alimentos", description: "Delivery", day, amount: between(14000, 26000) })),
  ...[1, 10, 20].map((day) => ({ category: "Transporte", description: "Carga SUBE", day, amount: between(8000, 12000) })),
  { category: "Transporte", description: "Uber", day: between(8, 26), amount: between(7000, 15000) },
  { category: "Ocio", description: "Salida con amigos", day: between(5, 13), amount: between(18000, 35000) },
  { category: "Ocio", description: "Cine", day: between(14, 27), amount: between(9000, 14000) },
  { category: "Salud", description: "Farmacia", day: between(8, 25), amount: between(8000, 22000) },
  { category: "Mascotas", description: "Alimento para Toby", day: 8, amount: between(28000, 34000) },
];

// occasional expenses, keyed by how many months ago they happened
const ONE_OFF_EXPENSES = {
  10: [{ category: "Otros", description: "Regalo de cumpleaños de mamá", day: 17, amount: 45000 }],
  8: [{ category: "Mascotas", description: "Vacunas de Toby", day: 19, amount: 38000 }],
  7: [{ category: "Ocio", description: "Recital", day: 22, amount: 85000 }],
  5: [{ category: "Otros", description: "Zapatillas", day: 13, amount: 120000 }],
  4: [{ category: "Salud", description: "Dentista", day: 20, amount: 60000 }],
  2: [{ category: "Educación", description: "Libros de la facultad", day: 9, amount: 52000 }],
  1: [{ category: "Mascotas", description: "Veterinaria", day: 23, amount: 42000 }],
  0: [{ category: "Ocio", description: "Disfraz de Halloween", day: 13, amount: 28000 }],
};

const buildExpenses = (userId, categoryIds, today) => {
  const expenses = [];

  for (let monthsAgo = MONTHS_OF_HISTORY - 1; monthsAgo >= 0; monthsAgo--) {
    const ref = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
    const year = ref.getFullYear();
    const month = ref.getMonth() + 1;
    // older months were cheaper: undo the monthly inflation
    const priceFactor = 1 / Math.pow(1 + MONTHLY_INFLATION, monthsAgo);
    const items = [...monthTemplate(), ...(ONE_OFF_EXPENSES[monthsAgo] || [])];

    items.forEach((item) => {
      const date = dateIn(year, month, item.day);
      if (date > toLocalISODate(today)) return; // no future expenses
      expenses.push({
        user_id: userId,
        category_id: categoryIds[item.category],
        description: item.description,
        amount: roundTo(item.amount * priceFactor),
        date,
      });
    });
  }

  return expenses;
};

const buildBudgets = (userId, categoryIds, expenses, today) => {
  const budgets = [];

  // current month plus the two previous ones
  for (let monthsAgo = 2; monthsAgo >= 0; monthsAgo--) {
    const ref = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
    const year = ref.getFullYear();
    const month = ref.getMonth() + 1;
    const prefix = `${year}-${String(month).padStart(2, "0")}`;

    const spentIn = (category) => expenses
      .filter((e) => e.category_id === categoryIds[category] && e.date.startsWith(prefix))
      .reduce((acc, e) => acc + e.amount, 0);

    // factors chosen so the current month shows every state: exceeded, close to the limit and ok
    const limits = [
      { category: "Alimentos", factor: 0.9 },
      { category: "Ocio", factor: 1.12 },
      { category: "Transporte", factor: 1.6 },
      { category: "Mascotas", factor: 1.4 },
      { category: "Servicios", factor: 1.3 },
    ];

    limits.forEach(({ category, factor }) => {
      const spent = spentIn(category);
      if (!spent) return;
      budgets.push({
        user_id: userId,
        category_id: categoryIds[category],
        month,
        year,
        amount_limit: roundTo(spent * factor, 1000),
      });
    });
  }

  return budgets;
};

const buildDebts = (userId, today) => {
  const day = (offset) => toLocalISODate(addDays(today, offset));
  const debts = [
    { creditor_name: "Tarjeta Visa", amount: 245000, due_date: day(3), is_paid: false },
    { creditor_name: "Préstamo Banco Nación (cuota 7/12)", amount: 86000, due_date: day(-5), is_paid: false },
    { creditor_name: "Mercado Pago (cuota del celular)", amount: 54000, due_date: day(-12), is_paid: false },
    { creditor_name: "Juan (préstamo personal)", amount: 60000, due_date: day(18), is_paid: false },
    { creditor_name: "Préstamo Banco Nación (cuota 8/12)", amount: 86000, due_date: day(25), is_paid: false },
    { creditor_name: "Tarjeta Mastercard", amount: 132000, due_date: day(9), is_paid: false },
  ];

  // past card statements, already paid
  for (let monthsAgo = 1; monthsAgo <= 5; monthsAgo++) {
    debts.push({
      creditor_name: "Tarjeta Visa",
      amount: roundTo(between(180000, 260000) / Math.pow(1 + MONTHLY_INFLATION, monthsAgo)),
      due_date: day(3 - monthsAgo * 30),
      is_paid: true,
    });
  }
  for (let cuota = 1; cuota <= 6; cuota++) {
    debts.push({
      creditor_name: `Préstamo Banco Nación (cuota ${cuota}/12)`,
      amount: 86000,
      due_date: day(-5 - (7 - cuota) * 30),
      is_paid: true,
    });
  }

  return debts.map((d) => ({ ...d, user_id: userId }));
};

const GOALS = [
  { name: "Fondo de emergencia", target_amount: 2000000, monthly: 120000, months: 9, withdrawal: { monthsAgo: 3, amount: 150000 } },
  { name: "Vacaciones en Bariloche", target_amount: 1500000, monthly: 110000, months: 8 },
  { name: "Notebook nueva", target_amount: 1300000, monthly: 70000, months: 4 },
  { name: "Bicicleta", target_amount: 450000, monthly: 90000, months: 5 },
];

const buildContributions = (goalId, goal, today) => {
  const contributions = [];
  for (let monthsAgo = goal.months - 1; monthsAgo >= 0; monthsAgo--) {
    const ref = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
    const date = dateIn(ref.getFullYear(), ref.getMonth() + 1, 2);
    if (date > toLocalISODate(today)) continue;
    contributions.push({ goal_id: goalId, amount: goal.monthly, date });
  }
  if (goal.withdrawal) {
    const ref = new Date(today.getFullYear(), today.getMonth() - goal.withdrawal.monthsAgo, 1);
    // withdrawals are stored as negative contributions
    contributions.push({ goal_id: goalId, amount: -goal.withdrawal.amount, date: dateIn(ref.getFullYear(), ref.getMonth() + 1, 18) });
  }
  return contributions;
};

const buildReminders = (userId, today) => {
  const day = (offset) => toLocalISODate(addDays(today, offset));
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const firstOfNext = dateIn(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1);
  const fifthOfNext = dateIn(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 5);

  return [
    { title: "Pagar la luz", date: day(0), type: "payment", amount: 38000 },
    { title: "Cobro de freelance (diseño web)", date: day(1), type: "income", amount: 250000 },
    { title: "Cuota del préstamo Banco Nación", date: day(25), type: "loan", amount: 86000 },
    { title: "Cobro del sueldo", date: firstOfNext, type: "income", amount: SAMPLE_USER.monthly_income },
    { title: "Pagar alquiler", date: firstOfNext, type: "payment", amount: 380000 },
    { title: "Pagar expensas", date: fifthOfNext, type: "payment", amount: 65000 },
    { title: "Renovar el seguro de la bici", date: day(6), type: "payment", amount: 15000 },
    { title: "Cumpleaños de Sofi (comprar regalo)", date: day(4), type: "other", amount: null },
    { title: "Turno con el contador", date: day(12), type: "other", amount: null },
    { title: "Devolución de Juan", date: day(-8), type: "income", amount: 30000 },
  ].map((r) => ({ ...r, user_id: userId }));
};

// removes the sample user and everything that belongs to it
const removeSampleUser = async () => {
  const existing = await User.findOne({ where: { username: SAMPLE_USER.username }, paranoid: false });
  if (!existing) return;

  const userId = existing.id;
  const goals = await SavingGoal.findAll({ where: { user_id: userId } });
  await SavingContribution.destroy({ where: { goal_id: { [Op.in]: goals.map((g) => g.id) } } });
  await SavingGoal.destroy({ where: { user_id: userId } });
  await Expense.destroy({ where: { user_id: userId }, force: true });
  await Budget.destroy({ where: { user_id: userId } });
  await Debt.destroy({ where: { user_id: userId } });
  await Reminder.destroy({ where: { user_id: userId } });
  await Favorite.destroy({ where: { user_id: userId } });
  await CategoryColor.destroy({ where: { user_id: userId } });
  await Category.destroy({ where: { user_id: userId } });
  await Profile.destroy({ where: { user_id: userId } });
  await existing.destroy({ force: true });
  console.log("Usuario simulado anterior eliminado.");
};

export const seedSampleUser = async () => {
  const today = new Date();

  await removeSampleUser();

  const user = await User.create({
    username: SAMPLE_USER.username,
    email: SAMPLE_USER.email,
    password: await hashPassword(SAMPLE_USER.password),
    role: "user",
  });
  await Profile.create({
    user_id: user.id,
    first_name: SAMPLE_USER.first_name,
    last_name: SAMPLE_USER.last_name,
    monthly_income: SAMPLE_USER.monthly_income,
    onboarded: true,
  });

  // own categories of this user, on top of the base ones
  await Category.bulkCreate([
    { name: "Mascotas", icon: "paw-print", color: "#ffb020", user_id: user.id },
    { name: "Gimnasio", icon: "dumbbell", color: "#ff5c8a", user_id: user.id },
  ]);
  const categories = await Category.findAll({
    where: { [Op.or]: [{ user_id: null }, { user_id: user.id }] },
  });
  const categoryIds = Object.fromEntries(categories.map((c) => [c.name, c.id]));

  // personal colors for two base categories
  await CategoryColor.bulkCreate([
    { user_id: user.id, category_id: categoryIds["Ocio"], color: "#c86bfa" },
    { user_id: user.id, category_id: categoryIds["Transporte"], color: "#4d9dff" },
  ]);

  const expenses = buildExpenses(user.id, categoryIds, today);
  await Expense.bulkCreate(expenses);
  await Budget.bulkCreate(buildBudgets(user.id, categoryIds, expenses, today));
  await Debt.bulkCreate(buildDebts(user.id, today));
  await Reminder.bulkCreate(buildReminders(user.id, today));

  for (const goal of GOALS) {
    const created = await SavingGoal.create({ name: goal.name, target_amount: goal.target_amount, user_id: user.id });
    await SavingContribution.bulkCreate(buildContributions(created.id, goal, today));
  }

  const articles = await Article.findAll({ limit: 2, order: [["id", "ASC"]] });
  await Favorite.bulkCreate(articles.map((a) => ({ user_id: user.id, article_id: a.id })));

  console.log(`Usuario simulado creado con ${expenses.length} gastos (usuario: ${SAMPLE_USER.username} / contraseña: ${SAMPLE_USER.password}).`);
};

const run = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    await seedInitialData(); // base categories and articles must exist first
    await seedSampleUser();
    process.exit(0);
  } catch (error) {
    console.error("Error al crear el usuario simulado:", error);
    process.exit(1);
  }
};

run();
