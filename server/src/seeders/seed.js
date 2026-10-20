import { sequelize } from "../config/database.js";
import {
  User,
  Profile,
  Category,
  Expense,
  Article,
} from "../models/index.js";
import { hashPassword } from "../helpers/bcrypt.helper.js";

/* Categorías básicas (GF-5). Colores dentro de la paleta azul/gris. */
const CATEGORIES = [
  { name: "Alimentos", icon: "utensils", color: "#0edfdc" },
  { name: "Transporte", icon: "bus", color: "#0bb8b6" },
  { name: "Vivienda", icon: "home", color: "#6fe9e7" },
  { name: "Servicios", icon: "plug", color: "#0a9694" },
  { name: "Salud", icon: "heart-pulse", color: "#4bd6d3" },
  { name: "Educación", icon: "graduation-cap", color: "#2bbfbc" },
  { name: "Ocio", icon: "gamepad-2", color: "#a8f2f0" },
  { name: "Otros", icon: "ellipsis", color: "#7f9c9a" },
];

/*
  Artículos de educación financiera. El contenido está redactado con base
  en material de educación financiera de fuentes confiables:
  - Banco Central de la República Argentina (BCRA) - "Saber es Central"
  - Comisión Nacional de Valores (CNV) - Educación del inversor
  - OCDE / Red Internacional de Educación Financiera (INFE)
*/
const ARTICLES = [
  {
    title: "La regla 50/30/20 para organizar tu sueldo",
    summary:
      "Un método simple para repartir tus ingresos entre necesidades, gustos y ahorro.",
    topic: "Presupuesto",
    content:
      "La regla 50/30/20 es una guía práctica para distribuir tu ingreso mensual. Propone destinar el 50% a necesidades (alquiler, servicios, comida y transporte), el 30% a gustos o gastos personales (salidas, streaming, ropa) y el 20% al ahorro o al pago de deudas. La idea no es seguirla al pie de la letra, sino tener un punto de partida para ver si estás gastando de más en alguna parte. Si tus necesidades ya se llevan el 70% del ingreso, es una señal de que conviene revisar los gastos fijos antes de sumar nuevas deudas. Anotar cada gasto durante un mes es el primer paso para saber en qué categoría estás parado.",
  },
  {
    title: "Cómo armar un fondo de emergencia",
    summary:
      "Por qué conviene tener un colchón de dinero y cómo empezar a juntarlo de a poco.",
    topic: "Ahorro",
    content:
      "Un fondo de emergencia es una reserva de dinero pensada para imprevistos: un problema de salud, la rotura de un electrodoméstico o la pérdida de un ingreso. La recomendación general es juntar el equivalente a entre tres y seis meses de tus gastos básicos. Puede sonar mucho, pero lo importante es arrancar: fijate una meta chica y automatizá un aporte apenas cobrás, antes de gastar en otra cosa. Guardá ese dinero separado de la cuenta que usás todos los días para no tentarte. Tener este colchón evita que, ante cualquier sorpresa, tengas que recurrir a un préstamo caro o al saldo financiado de la tarjeta.",
  },
  {
    title: "Cómo salir de las deudas: el método bola de nieve",
    summary:
      "Una estrategia para ordenar el pago de varias deudas y no perder la motivación.",
    topic: "Deudas",
    content:
      "Cuando tenés varias deudas, ordenarlas ayuda a no sentirte abrumado. El método 'bola de nieve' propone pagar primero la deuda más chica (haciendo el pago mínimo en las demás) y, una vez saldada, volcar ese dinero a la siguiente deuda más chica. Cada deuda que cancelás libera dinero y suma motivación, como una bola de nieve que crece. Existe también el método 'avalancha', que prioriza la deuda con la tasa de interés más alta: matemáticamente ahorra más intereses, aunque cuesta más sostenerlo. Cualquiera de los dos es mejor que pagar sin un plan. La clave es dejar de sumar deuda nueva mientras cancelás la vieja.",
  },
  {
    title: "Entender el costo real de la tarjeta de crédito",
    summary:
      "Qué pasa cuando pagás solo el mínimo y cómo usar la tarjeta a tu favor.",
    topic: "Deudas",
    content:
      "La tarjeta de crédito es una herramienta útil si se usa con cuidado. El punto clave es la fecha de vencimiento: si pagás el total del resumen, no pagás intereses. Si pagás solo el mínimo, el resto queda financiado a una tasa que suele ser muy alta, y esa deuda puede crecer mes a mes. Antes de comprar en cuotas, conviene mirar si tienen interés o si son 'sin interés', y sumar todas las cuotas que ya tenés comprometidas para los próximos meses. Una buena práctica es no gastar con la tarjeta más de lo que sabés que vas a poder pagar en su totalidad al vencimiento.",
  },
];

// datos de ejemplo para el usuario demo (gastos del mes actual)
const buildDemoExpenses = (categories) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const byName = (n) => categories.find((c) => c.name === n)?.id;
  return [
    { amount: 45000, description: "Supermercado", date: `${y}-${m}-03`, category_id: byName("Alimentos") },
    { amount: 12000, description: "Colectivo y subte", date: `${y}-${m}-05`, category_id: byName("Transporte") },
    { amount: 85000, description: "Alquiler", date: `${y}-${m}-01`, category_id: byName("Vivienda") },
    { amount: 30000, description: "Luz y gas", date: `${y}-${m}-08`, category_id: byName("Servicios") },
    { amount: 18000, description: "Salida con amigos", date: `${y}-${m}-12`, category_id: byName("Ocio") },
    { amount: 22000, description: "Farmacia", date: `${y}-${m}-15`, category_id: byName("Salud") },
    { amount: 15000, description: "Curso online", date: `${y}-${m}-18`, category_id: byName("Educación") },
  ];
};

export const seedInitialData = async () => {
  try {
    // Categorías
    const catCount = await Category.count();
    if (catCount === 0) {
      await Category.bulkCreate(CATEGORIES);
      console.log("Categorías base cargadas.");
    }

    // Artículos
    const artCount = await Article.count();
    if (artCount === 0) {
      await Article.bulkCreate(ARTICLES);
      console.log("Artículos de educación financiera cargados.");
    }

    // Usuario demo + perfil + gastos de ejemplo
    const demo = await User.findOne({ where: { username: "demo" } });
    if (!demo) {
      const password = await hashPassword("demo1234");
      const user = await User.create({
        username: "demo",
        email: "demo@finanzas.com",
        password,
        role: "user",
      });
      await Profile.create({
        user_id: user.id,
        first_name: "Usuario",
        last_name: "Demo",
        monthly_income: 400000,
      });
      const categories = await Category.findAll();
      await Expense.bulkCreate(
        buildDemoExpenses(categories).map((e) => ({ ...e, user_id: user.id }))
      );
      console.log("Usuario demo creado (usuario: demo / contraseña: demo1234).");
    }
  } catch (error) {
    console.error("Error al cargar datos iniciales:", error.message);
  }
};

// permite ejecutar el seed de forma manual con: npm run seed
if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  const run = async () => {
    await sequelize.authenticate();
    await sequelize.sync();
    await seedInitialData();
    console.log("Seed finalizado.");
    process.exit(0);
  };
  run();
}
