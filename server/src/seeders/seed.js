import { sequelize } from "../config/database.js";
import {
  User,
  Profile,
  Category,
  Expense,
  Article,
} from "../models/index.js";
import { hashPassword } from "../helpers/bcrypt.helper.js";

/* Categorías básicas (GF-5). Colores pastel y desaturados, distinguibles entre sí. */
const CATEGORIES = [
  { name: "Alimentos", icon: "utensils", color: "#3fc9c5" },
  { name: "Transporte", icon: "bus", color: "#6f9fe0" },
  { name: "Vivienda", icon: "home", color: "#9a8be6" },
  { name: "Servicios", icon: "plug", color: "#d9b26a" },
  { name: "Salud", icon: "heart-pulse", color: "#86c99c" },
  { name: "Educación", icon: "graduation-cap", color: "#e08fae" },
  { name: "Ocio", icon: "gamepad-2", color: "#c79bd8" },
  { name: "Otros", icon: "ellipsis", color: "#8fa3ad" },
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
  {
    title: "TNA, TEA y CFT: cómo leer el costo de un préstamo",
    summary:
      "Las tres siglas que aparecen en cualquier préstamo y cuál conviene mirar para comparar.",
    topic: "Préstamos",
    content:
      "Cuando pedís un préstamo vas a ver tres siglas. La TNA (Tasa Nominal Anual) es la tasa de interés 'de referencia': se divide por 12 para calcular el interés de cada mes, pero no tiene en cuenta que los intereses se van acumulando. La TEA (Tasa Efectiva Anual) sí lo considera, por eso siempre es mayor que la TNA y muestra mejor cuánto interés pagás en un año. El CFT (Costo Financiero Total) es el número más completo: además de los intereses suma impuestos como el IVA, comisiones, gastos de otorgamiento y seguros. Las entidades están obligadas a informarlo. Para comparar dos préstamos, mirá siempre el CFT: un préstamo con TNA más baja puede terminar siendo más caro si tiene muchos cargos extra.",
  },
  {
    // el simulador de préstamos enlaza este artículo por su título (client/src/utils/loans.js)
    title: "Qué es el CFT y cómo funciona",
    summary:
      "El indicador que reúne todo lo que pagás por un préstamo y por qué es el que tenés que mirar para comparar.",
    topic: "Préstamos",
    content:
      "El CFT (Costo Financiero Total) expresa en una sola tasa anual todo lo que te cuesta un préstamo: los intereses, el IVA sobre esos intereses, las comisiones, los gastos de otorgamiento y los seguros que te cobren. Las entidades están obligadas a informarlo en sus publicidades y contratos, y también lo publican en el Régimen de Transparencia del BCRA, que es de donde lo toma nuestro simulador. Funciona como una tasa efectiva: tiene en cuenta que los costos se acumulan mes a mes, por eso siempre es mayor que la TEA, que solo mide los intereses. Para estimar la cuota, el simulador convierte el CFT anual en su equivalente mensual (por ejemplo, un CFT de 129% anual equivale a cerca de 7,2% por mes) y lo aplica con el sistema francés de cuota fija; multiplicando esa cuota por la cantidad de meses obtenés el costo total. Al comparar préstamos, mirá siempre el CFT y no la TNA: una tasa de interés baja con muchos cargos puede terminar costando más. Tené en cuenta que el CFT publicado es un valor máximo: la entidad puede ofrecerte uno menor según tu perfil, así que confirmalo siempre antes de firmar.",
  },
  {
    title: "Sistema francés: cómo se arma la cuota de tu préstamo",
    summary:
      "Por qué la cuota es siempre igual y qué parte de ella es interés y qué parte es capital.",
    topic: "Préstamos",
    content:
      "La mayoría de los préstamos personales en Argentina usan el sistema francés: pagás una cuota fija todos los meses. Lo que cambia es su composición. Al principio, gran parte de la cuota se va en intereses, porque se calculan sobre todo el dinero que todavía debés; con el paso de los meses la deuda baja, el interés también, y una porción mayor de la cuota amortiza capital. Por eso, si cancelás un préstamo de forma anticipada en los primeros meses, el ahorro en intereses es mayor. Ojo: algunas entidades cobran un cargo por cancelación anticipada, así que conviene revisarlo en el contrato antes de firmar.",
  },
  {
    title: "Cinco preguntas antes de pedir un préstamo",
    summary:
      "Un chequeo rápido para no tomar una deuda que después no puedas pagar.",
    topic: "Préstamos",
    content:
      "Antes de endeudarte, hacete estas preguntas. Primero: ¿para qué lo necesito? No es lo mismo financiar una herramienta de trabajo que un gasto de consumo. Segundo: ¿cuánto representa la cuota de mi ingreso? Una referencia habitual es que el total de cuotas no supere el 30% de lo que cobrás. Tercero: ¿cuál es el CFT y cuánto voy a devolver en total? Multiplicá la cuota por la cantidad de meses y comparalo con lo que te prestan. Cuarto: ¿qué pasa si me atraso? Averiguá los intereses punitorios. Quinto: ¿comparé con otras entidades? Las condiciones cambian mucho entre bancos, billeteras virtuales y financieras, y unos minutos de comparación pueden ahorrarte bastante dinero.",
  },
  {
    title: "Cómo armar tu primer presupuesto mensual",
    summary:
      "Cuatro pasos para pasar de 'no sé en qué se me va la plata' a tener un plan.",
    topic: "Presupuesto",
    content:
      "Un presupuesto es simplemente un plan para tu dinero. Paso 1: anotá tu ingreso neto mensual, lo que efectivamente cobrás. Paso 2: listá tus gastos fijos, los que se repiten todos los meses, como alquiler, servicios, transporte y cuotas. Paso 3: estimá los gastos variables, como comida, salidas o ropa, mirando lo que gastaste los últimos dos o tres meses. Paso 4: restá todo del ingreso y decidí qué hacer con lo que sobra, idealmente una parte al ahorro. Si el número da negativo, el presupuesto te muestra dónde ajustar. Revisalo a fin de cada mes y corregilo: un presupuesto no es una cárcel, es una guía que se mejora con el tiempo.",
  },
  {
    title: "Gastos hormiga: los pequeños consumos que suman",
    summary:
      "Café, delivery, suscripciones: por qué los gastos chicos pueden pesar más de lo que parece.",
    topic: "Presupuesto",
    content:
      "Los gastos hormiga son consumos pequeños y frecuentes que, por separado, parecen insignificantes: un café, una gaseosa, un envío a domicilio, una suscripción que no usás. El problema es que se repiten y, sumados a lo largo del mes, pueden representar una parte importante de tu ingreso. Para detectarlos, registrá todos tus gastos durante algunas semanas, incluso los más chicos, y agrupalos. Muchas veces la sorpresa está en las suscripciones digitales que se debitan solas. No se trata de eliminar todos los gustos, sino de elegir conscientemente en cuáles vale la pena gastar y cuáles podés reducir sin extrañarlos.",
  },
  {
    title: "Págate a vos primero: el ahorro automático",
    summary:
      "Separar el ahorro apenas cobrás es la forma más simple de que el hábito se sostenga.",
    topic: "Ahorro",
    content:
      "La forma más común de intentar ahorrar es guardar 'lo que sobra' a fin de mes, y lo habitual es que no sobre nada. La estrategia de 'págate a vos primero' invierte el orden: apenas cobrás, separás un monto fijo para ahorro y vivís con el resto. Puede ser un porcentaje chico al comienzo, por ejemplo un 5% o un 10%; lo importante es la constancia. Si tu banco o billetera lo permite, programá una transferencia automática a otra cuenta o a una inversión el mismo día del cobro. Al no depender de tu fuerza de voluntad cada mes, el ahorro se vuelve un hábito y las metas avanzan sin que lo pienses.",
  },
  {
    title: "Inflación: por qué tu dinero pierde valor",
    summary:
      "Qué es el poder adquisitivo y por qué conviene que tus ahorros no queden quietos.",
    topic: "Ahorro",
    content:
      "La inflación es el aumento generalizado de los precios. Cuando los precios suben, con la misma cantidad de dinero podés comprar menos cosas: eso es la pérdida de poder adquisitivo. Si guardás pesos sin moverlos durante un año con inflación, al final vas a tener el mismo número de billetes, pero te van a alcanzar para menos. Por eso es importante comparar el rendimiento de tus ahorros con la inflación: si una inversión rinde menos que la inflación, en términos reales estás perdiendo. Esto no significa que haya que arriesgarse sin pensar, sino buscar alternativas reguladas que, al menos, ayuden a proteger el valor de tu dinero.",
  },
  {
    title: "Plazo fijo: cómo funciona",
    summary:
      "Una de las formas más simples de hacer rendir tus ahorros, y las variantes que existen.",
    topic: "Inversión",
    content:
      "Un plazo fijo es un depósito en un banco por un período determinado, como mínimo 30 días, a cambio de una tasa de interés que se conoce desde el principio. Al vencimiento recibís el capital más los intereses; si lo necesitás antes, en el plazo fijo tradicional no podés retirarlo. Existen variantes: el plazo fijo UVA ajusta el capital según la inflación, y algunos bancos ofrecen opciones precancelables con condiciones particulares. Los depósitos en entidades autorizadas por el BCRA cuentan con una garantía de depósitos hasta un monto máximo. Antes de constituirlo, compará la tasa con la inflación esperada para saber si tu dinero realmente está creciendo.",
  },
  {
    title: "Fondos comunes de inversión para empezar",
    summary:
      "Qué es un FCI, qué tipos hay y qué tener en cuenta antes de invertir.",
    topic: "Inversión",
    content:
      "Un fondo común de inversión (FCI) reúne el dinero de muchas personas para invertirlo en conjunto, administrado por profesionales y bajo la supervisión de la Comisión Nacional de Valores (CNV). Al invertir comprás 'cuotapartes' del fondo, cuyo valor sube o baja según el rendimiento de lo que el fondo tiene en cartera. Hay fondos para distintos perfiles: los de 'money market' suelen tener bajo riesgo y permiten retirar el dinero en el día, y otros invierten en bonos o acciones, con mayor potencial de ganancia pero también más riesgo. Importante: los FCI no son depósitos bancarios y no tienen rendimiento garantizado. Leé el reglamento del fondo y elegí según el plazo y el riesgo que estés dispuesto a asumir.",
  },
  {
    title: "Central de Deudores: qué es tu historial crediticio",
    summary:
      "Cómo los bancos ven tu comportamiento de pago y cómo consultarlo gratis.",
    topic: "Deudas",
    content:
      "La Central de Deudores del Sistema Financiero es una base de datos del BCRA donde las entidades informan las deudas de sus clientes y si se pagan a tiempo. Cada deuda se clasifica en 'situaciones': la situación 1 es normal, y a medida que aumentan los días de atraso se pasa a situaciones de mayor riesgo. Los bancos consultan esta información antes de darte un préstamo o una tarjeta, y un mal historial puede hacer que te los nieguen o que te ofrezcan peores condiciones. Podés consultar tu situación de forma gratuita en el sitio del BCRA con tu CUIT o CUIL. La mejor forma de cuidar tu historial es pagar en término y no tomar más deuda de la que podés afrontar.",
  },
  {
    title: "Estafas virtuales: cómo cuidar tu dinero",
    summary:
      "Las trampas más comunes por teléfono, mensajes y redes, y cómo evitarlas.",
    topic: "Seguridad",
    content:
      "Las estafas virtuales son cada vez más frecuentes. La regla de oro: ningún banco ni billetera virtual te va a pedir claves, códigos de verificación, el token ni los datos de tu tarjeta por teléfono, WhatsApp, mail o redes sociales. Desconfiá de mensajes urgentes que dicen que tu cuenta fue bloqueada o que ganaste un premio, y no entres a links que te envían; escribí vos la dirección del banco o usá la app oficial. Tampoco vayas a un cajero porque alguien te lo indica por teléfono. Activá la verificación en dos pasos en tus cuentas y usá contraseñas distintas. Si sospechás que fuiste víctima de una estafa, comunicate de inmediato con tu banco por sus canales oficiales para bloquear tus cuentas.",
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

    // Artículos: inserts only the missing ones, so new articles also reach existing databases
    const existingArticles = await Article.findAll({ attributes: ["title"] });
    const existingTitles = new Set(existingArticles.map((a) => a.title));
    const missingArticles = ARTICLES.filter((a) => !existingTitles.has(a.title));
    if (missingArticles.length > 0) {
      await Article.bulkCreate(missingArticles);
      console.log(`${missingArticles.length} artículos de educación financiera cargados.`);
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
