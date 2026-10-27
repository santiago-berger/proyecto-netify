import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  CreditCard, CalendarClock, CalendarDays, Receipt, ChevronLeft, ChevronRight, AlertCircle,
  Wallet, TrendingUp, PiggyBank, Gauge,
} from "lucide-react";
import { api } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getPreference } from "../utils/preferences.js";
import { Card } from "../components/ui/Card.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";
import { Progress } from "../components/ui/Progress.jsx";
import { money, shortDate, MONTHS, todayISO, daysBetween } from "../utils/format.js";

const TEALS = ["#0edfdc", "#7c5cff", "#ffb020", "#ff5c8a", "#3ddc84", "#4d9dff", "#c86bfa", "#8fa3ad"];
const groupLabelStyle = {
  fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em",
  color: "var(--muted-2)", fontWeight: 600, marginBottom: 2,
};
const MONTHS_LONG = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const AGENDA_DAYS = 7;
const TOP_BUDGETS = 4;
const REMINDER_LABELS = { income: "Ingreso", payment: "Pago", loan: "Préstamo", other: "Recordatorio" };
const REMINDER_CHIPS = { income: "ok", payment: "warn", loan: "teal", other: "" };
const emptySummary = { total: 0, byCategory: [] };

const previousPeriod = ({ month, year }) =>
  month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };

const dueLabel = (today, date) => {
  const days = daysBetween(today, date);
  if (days === 0) return "Hoy";
  if (days === 1) return "Mañana";
  return shortDate(date);
};

export default function Dashboard() {
  const { user, modules } = useAuth();
  const now = new Date();
  const current = { month: now.getMonth() + 1, year: now.getFullYear() };
  const prev = previousPeriod(current);
  const today = todayISO();

  const showDebts = modules?.deudas !== false;
  const showBudgets = modules?.presupuestos !== false;
  const showGoals = modules?.metas !== false;

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(current);
  const [chartSummary, setChartSummary] = useState(emptySummary);
  const [monthSummary, setMonthSummary] = useState(emptySummary);
  const [prevSummary, setPrevSummary] = useState(emptySummary);
  const [trend, setTrend] = useState([]);
  const [debts, setDebts] = useState({ totalPending: 0 });
  const [upcoming, setUpcoming] = useState({ upcoming: [], overdue: [] });
  const [reminders, setReminders] = useState([]);
  const [budgetStatus, setBudgetStatus] = useState([]);
  const [goals, setGoals] = useState([]);

  // carga inicial (lo que no depende del mes elegido en el gráfico)
  useEffect(() => {
    const load = async () => {
      try {
        const [t, cur, prv, d, u, r, b, g] = await Promise.all([
          api.get("/expenses/trend"),
          api.get(`/expenses/summary?month=${current.month}&year=${current.year}`),
          api.get(`/expenses/summary?month=${prev.month}&year=${prev.year}`),
          api.get("/debts"),
          api.get("/debts/upcoming"),
          api.get("/reminders"),
          api.get("/budgets/status"),
          api.get("/goals"),
        ]);
        setTrend(t.data.totals.map((x) => ({ mes: MONTHS[x.month - 1], total: x.total })));
        setMonthSummary(cur.data);
        setPrevSummary(prv.data);
        setDebts(d.data);
        setUpcoming(u.data);
        setReminders(r.data);
        setBudgetStatus(b.data.status);
        setGoals(g.data);
      } catch (err) {
        console.error("Error loading dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // el gráfico por categoría se recarga cada vez que cambia el mes elegido
  useEffect(() => {
    api.get(`/expenses/summary?month=${period.month}&year=${period.year}`)
      .then((s) => setChartSummary(s.data))
      .catch((err) => console.error("Error loading category summary:", err));
  }, [period.month, period.year]);

  if (loading) return <Spinner />;

  // ---- indicadores del mes ----
  const spent = monthSummary.total;
  const prevSpent = prevSummary.total;
  const change = prevSpent > 0 ? Math.round(((spent - prevSpent) / prevSpent) * 100) : null;
  const income = Number(user?.profile?.monthly_income) || 0;
  const available = income - spent;
  const usedPct = income > 0 ? Math.round((spent / income) * 100) : 0;
  const daysInMonth = new Date(current.year, current.month, 0).getDate();
  const projection = (spent / now.getDate()) * daysInMonth;

  // ---- agenda: deudas vencidas + próximos días (deudas y recordatorios) ----
  const overdue = showDebts ? upcoming.overdue : [];
  const nextItems = [
    ...(showDebts ? upcoming.upcoming.map((d) => ({
      key: `d-${d.id}`, title: d.creditor_name, date: d.due_date, amount: d.amount, label: "Deuda", chip: "danger", icon: CreditCard,
    })) : []),
    ...reminders
      .filter((r) => {
        const days = daysBetween(today, r.date);
        return days >= 0 && days <= AGENDA_DAYS;
      })
      .map((r) => ({
        key: `r-${r.id}`, title: r.title, date: r.date, amount: r.amount, label: REMINDER_LABELS[r.type] || "Recordatorio", chip: REMINDER_CHIPS[r.type] || "", icon: CalendarDays,
      })),
  ].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  // ---- presupuestos más cerca del tope ----
  const topBudgets = [...budgetStatus].sort((a, b) => b.percent - a.percent).slice(0, TOP_BUDGETS);

  // the goal chosen in "Metas de ahorro", or the most recent one if none was chosen
  const featuredId = getPreference(user?.id, "featured_goal");
  const topGoal = goals.find((g) => g.id === featuredId) || goals[0];

  const changeMonth = (delta) => {
    setPeriod(({ month, year }) => {
      const date = new Date(year, month - 1 + delta, 1);
      return { month: date.getMonth() + 1, year: date.getFullYear() };
    });
  };
  const isCurrent = period.month === current.month && period.year === current.year;
  const showSideColumn = showBudgets || (showGoals && topGoal);

  return (
    <div className="page-grid">
      {/* ---------- indicadores ---------- */}
      <div className={showDebts ? "grid-4" : "grid-3"}>
        <div className="hero">
          <div className="label">Gasto de {MONTHS_LONG[current.month - 1]}</div>
          <div className="value num">{money(spent)}</div>
          <div className="foot">
            {change === null
              ? "Sin datos del mes anterior para comparar"
              : `${change > 0 ? "▲" : change < 0 ? "▼" : "="} ${Math.abs(change)}% vs ${MONTHS_LONG[prev.month - 1].toLowerCase()}`}
          </div>
        </div>

        <div className="stat">
          <div className="label"><Wallet size={15} /> Disponible del mes</div>
          {income > 0 ? (
            <>
              <div className="value num" style={{ color: available < 0 ? "var(--danger)" : undefined }}>{money(available)}</div>
              <div style={{ marginTop: 10 }}><Progress percent={usedPct} state={usedPct >= 100 ? "excedido" : usedPct >= 80 ? "alerta" : "ok"} /></div>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Usaste el {usedPct}% de tu ingreso</div>
            </>
          ) : (
            <>
              <div className="value num muted">—</div>
              <Link to="/perfil" className="muted" style={{ fontSize: 12, color: "var(--teal-200)" }}>Cargá tu ingreso mensual en Perfil</Link>
            </>
          )}
        </div>

        <div className="stat">
          <div className="label"><TrendingUp size={15} /> Proyección a fin de mes</div>
          <div className="value num">{money(projection)}</div>
          {spent === 0 ? (
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Todavía no hay gastos este mes</div>
          ) : income > 0 && projection > income ? (
            <span className="chip danger" style={{ marginTop: 8 }}><AlertCircle size={13} /> Supera tu ingreso</span>
          ) : (
            <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Si seguís al ritmo actual</div>
          )}
        </div>

        {showDebts && (
          <div className="stat">
            <div className="label"><CreditCard size={15} /> Deuda pendiente</div>
            <div className="value num">{money(debts.totalPending)}</div>
            {overdue.length > 0 && (
              <Link to="/deudas" className="chip danger" style={{ marginTop: 10, textDecoration: "none" }} title="Ver deudas vencidas">
                <AlertCircle size={13} />
                {overdue.length} {overdue.length === 1 ? "deuda vencida" : "deudas vencidas"}
              </Link>
            )}
          </div>
        )}
      </div>

      {/* ---------- gráficos ---------- */}
      <div className="grid-2">
        <Card
          title="Gastos por categoría"
          sub={<Link to="/gastos" style={{ color: "var(--teal-200)" }}>Ver detalle en Gastos</Link>}
          action={
            <div className="flex center gap">
              <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(-1)} style={{ padding: 6 }} title="Mes anterior"><ChevronLeft size={15} /></button>
              <span className="num" style={{ fontSize: 12.5, minWidth: 96, textAlign: "center" }}>
                {MONTHS_LONG[period.month - 1]} {period.year}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(1)} style={{ padding: 6 }} disabled={isCurrent} title="Mes siguiente"><ChevronRight size={15} /></button>
            </div>
          }
        >
          {chartSummary.byCategory.length === 0 ? (
            <Empty icon={Receipt} title="Sin gastos en este mes" hint={isCurrent ? "Cargá tu primer gasto para ver el desglose." : "No hay gastos registrados en este período."} />
          ) : (
            <div className="flex center" style={{ gap: 20, flexWrap: "wrap" }}>
              <div style={{ width: 190, height: 190 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={chartSummary.byCategory} dataKey="total" nameKey="category"
                      innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                      {chartSummary.byCategory.map((_, i) => <Cell key={i} fill={TEALS[i % TEALS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)}
                      contentStyle={{ background: "#101d1f", border: "1px solid #24393b", borderRadius: 10, color: "#eaf5f4" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grow" style={{ minWidth: 200, flex: 1 }}>
                {chartSummary.byCategory.map((c, i) => {
                  const pct = chartSummary.total ? Math.round((c.total / chartSummary.total) * 100) : 0;
                  return (
                    <div className="row" key={c.category} style={{ padding: "8px 0" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: TEALS[i % TEALS.length] }} />
                      <div className="grow r-title">{c.category}</div>
                      <div className="num muted" style={{ fontSize: 12.5 }}>{pct}%</div>
                      <div className="num" style={{ width: 90, textAlign: "right" }}>{money(c.total)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <Card title="Tendencia de gastos" sub="Total gastado por mes (año actual)">
          <div style={{ width: "100%", height: 230 }}>
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="az" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0edfdc" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0edfdc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#23282e" vertical={false} />
                <XAxis dataKey="mes" stroke="#5f7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#5f7280" fontSize={11} tickLine={false} axisLine={false} width={54}
                  tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
                <Tooltip formatter={(v) => money(v)}
                  contentStyle={{ background: "#101d1f", border: "1px solid #24393b", borderRadius: 10, color: "#eaf5f4" }}
                  labelStyle={{ color: "#8ca3b0" }} />
                <Area type="monotone" dataKey="total" stroke="#0edfdc" strokeWidth={2} fill="url(#az)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ---------- lo que hay que atender ---------- */}
      <div className={showSideColumn ? "grid-2" : ""}>
        <Card
          title="Agenda"
          sub={`Vencidas y lo que viene en los próximos ${AGENDA_DAYS} días`}
          action={<Link to="/calendario" className="btn btn-ghost btn-sm"><CalendarDays size={14} /> Calendario</Link>}
        >
          {overdue.length === 0 && nextItems.length === 0 ? (
            <Empty icon={CalendarClock} title="Nada pendiente esta semana" hint="Podés agendar pagos e ingresos desde el Calendario." />
          ) : (
            <>
              {overdue.length > 0 && (
                <>
                  <div style={groupLabelStyle}>Vencidas</div>
                  <div className="list">
                    {overdue.map((d) => (
                      <div className="row" key={`o-${d.id}`}>
                        <div className="icon-badge" style={{ color: "var(--danger)", background: "rgba(224,100,107,.1)" }}><AlertCircle size={16} /></div>
                        <div className="grow">
                          <div className="r-title">{d.creditor_name}</div>
                          <div className="r-sub">Venció el {shortDate(d.due_date)}</div>
                        </div>
                        <span className="chip danger">Vencida</span>
                        <div className="num" style={{ width: 90, textAlign: "right" }}>{money(d.amount)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div style={{ ...groupLabelStyle, marginTop: overdue.length > 0 ? 14 : 0 }}>Próximos {AGENDA_DAYS} días</div>
              {nextItems.length === 0 ? (
                <div className="muted" style={{ fontSize: 12.5, padding: "8px 0" }}>No tenés nada agendado para esta semana.</div>
              ) : (
                <div className="list">
                  {nextItems.map((item) => (
                    <div className="row" key={item.key}>
                      <div className="icon-badge"><item.icon size={16} /></div>
                      <div className="grow">
                        <div className="r-title">{item.title}</div>
                        <div className="r-sub">{dueLabel(today, item.date)}</div>
                      </div>
                      <span className={`chip ${item.chip}`}>{item.label}</span>
                      <div className="num" style={{ width: 90, textAlign: "right" }}>{item.amount != null ? money(item.amount) : ""}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>

        {showSideColumn && (
          <div className="page-grid" style={{ gap: 18, alignContent: "start" }}>
            {showBudgets && (
              <Card
                title="Presupuestos del mes"
                action={<Link to="/presupuestos" className="btn btn-ghost btn-sm"><Gauge size={14} /> Ver todos</Link>}
              >
                {topBudgets.length === 0 ? (
                  <Empty icon={Wallet} title="Sin presupuestos este mes" hint="Fijá topes por categoría para controlar tus gastos." />
                ) : (
                  <div className="page-grid" style={{ gap: 14 }}>
                    {topBudgets.map((b) => (
                      <div key={b.budget_id}>
                        <div className="flex between center" style={{ fontSize: 13, marginBottom: 6 }}>
                          <span className="r-title">{b.category}</span>
                          <span className="num muted" style={{ fontSize: 12.5 }}>{money(b.spent)} / {money(b.limit)}</span>
                        </div>
                        <Progress percent={b.percent} state={b.state} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {showGoals && topGoal && (
              <Card title="Meta destacada" action={<Link to="/metas" className="btn btn-ghost btn-sm"><PiggyBank size={14} /> Metas</Link>}>
                <div className="flex between center">
                  <div className="r-title">{topGoal.name}</div>
                  <span className="chip teal">{topGoal.percent}%</span>
                </div>
                <div className="progress mt"><span style={{ width: `${topGoal.percent}%` }} /></div>
                <div className="flex between mt muted" style={{ fontSize: 12.5 }}>
                  <span className="num">{money(topGoal.saved)}</span>
                  <span className="num">{money(topGoal.target_amount)}</span>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
