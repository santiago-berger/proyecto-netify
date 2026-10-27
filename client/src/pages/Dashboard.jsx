import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  CreditCard, Receipt, ChevronLeft, ChevronRight, AlertCircle,
  Wallet, PiggyBank, Gauge,
} from "lucide-react";
import { api } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { getPreference } from "../utils/preferences.js";
import { Card } from "../components/ui/Card.jsx";
import { Amount } from "../components/ui/Amount.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";
import { Progress } from "../components/ui/Progress.jsx";
import { money, MONTHS } from "../utils/format.js";

const TEALS = ["#3fc9c5", "#8f84e0", "#dcb377", "#d98fa3", "#7fc8a4", "#7aa6dc", "#b593dc", "#8fa3ad"];
const MONTHS_LONG = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const TOP_BUDGETS = 4;
const emptySummary = { total: 0, byCategory: [] };

// short axis labels: 950k, 1,2M
const compactMoney = (v) => {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1).replace(".0", "").replace(".", ",")}M`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return v;
};

const previousPeriod = ({ month, year }) =>
  month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };

export default function Dashboard() {
  const { user, modules } = useAuth();
  const now = new Date();
  const current = { month: now.getMonth() + 1, year: now.getFullYear() };
  const prev = previousPeriod(current);

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
  const [budgetStatus, setBudgetStatus] = useState([]);
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);

  // carga inicial (lo que no depende del mes elegido en el gráfico)
  useEffect(() => {
    const load = async () => {
      try {
        const [t, cur, prv, d, u, b, g, c] = await Promise.all([
          api.get("/expenses/trend"),
          api.get(`/expenses/summary?month=${current.month}&year=${current.year}`),
          api.get(`/expenses/summary?month=${prev.month}&year=${prev.year}`),
          api.get("/debts"),
          api.get("/debts/upcoming"),
          api.get("/budgets/status"),
          api.get("/goals"),
          api.get("/categories"),
        ]);
        // months that haven't happened yet have no value, so the line stops at the current month
        setTrend(t.data.totals.map((x) => ({
          mes: MONTHS[x.month - 1],
          total: t.data.year === current.year && x.month > current.month ? null : x.total,
        })));
        setMonthSummary(cur.data);
        setPrevSummary(prv.data);
        setDebts(d.data);
        setUpcoming(u.data);
        setBudgetStatus(b.data.status);
        setGoals(g.data);
        setCategories(c.data);
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

  const overdue = showDebts ? upcoming.overdue : [];

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

  // same colors the user picked in "Gastos"
  const colorById = Object.fromEntries(categories.map((cat) => [cat.id, cat.color]));
  const categoryColor = (c, i) => colorById[c.category_id] || c.color || TEALS[i % TEALS.length];
  const tooltipProps = {
    contentStyle: { background: "#1d2229", border: "none", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.35)" },
    itemStyle: { color: "#e7ebef" },
    labelStyle: { color: "#98a2ad" },
    cursor: { stroke: "rgba(255,255,255,.08)" },
  };
  const showSideColumn = showBudgets || (showGoals && topGoal);

  return (
    <div className="page-grid">
      {/* ---------- indicadores ---------- */}
      <div className={showDebts ? "grid-3" : "grid-2"}>
        <div className="hero">
          <div className="label">Gasto de {MONTHS_LONG[current.month - 1]}</div>
          <div className="value num"><Amount value={spent} /></div>
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
              <div className="value num" style={{ color: available < 0 ? "var(--danger)" : undefined }}><Amount value={available} /></div>
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

        {showDebts && (
          <div className="stat">
            <div className="label"><CreditCard size={15} /> Deuda pendiente</div>
            <div className="value num"><Amount value={debts.totalPending} /></div>
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
          className="donut-wrap"
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
            <div className="donut-layout">
              <div className="donut-chart">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={chartSummary.byCategory} dataKey="total" nameKey="category"
                      innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
                      {chartSummary.byCategory.map((c, i) => <Cell key={i} fill={categoryColor(c, i)} />)}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)} {...tooltipProps} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="donut-legend">
                {chartSummary.byCategory.map((c, i) => {
                  const pct = chartSummary.total ? Math.round((c.total / chartSummary.total) * 100) : 0;
                  return (
                    <div className="row" key={c.category}>
                      <span className="cat-dot" style={{ background: categoryColor(c, i) }} />
                      <div className="grow r-title">{c.category}</div>
                      <div className="num muted" style={{ fontSize: 12.5 }}>{pct}%</div>
                      <div className="num" style={{ minWidth: 84, textAlign: "right" }}><Amount value={c.total} /></div>
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
              <AreaChart data={trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="az" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3fc9c5" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#3fc9c5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,.05)" vertical={false} />
                <XAxis dataKey="mes" stroke="#6a7480" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={4} />
                <YAxis stroke="#6a7480" fontSize={11} tickLine={false} axisLine={false} width={44} tickFormatter={compactMoney} />
                <Tooltip formatter={(v) => money(v)} {...tooltipProps} />
                <Area type="monotone" dataKey="total" stroke="#3fc9c5" strokeWidth={2.5} fill="url(#az)" activeDot={{ r: 4, strokeWidth: 0 }} connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ---------- presupuestos y meta ---------- */}
        {showSideColumn && (
          <div className={showBudgets && showGoals && topGoal ? "grid-2" : ""} style={{ alignItems: "start" }}>
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
                          <span className="num muted" style={{ fontSize: 12.5 }}><Amount value={b.spent} /> / <Amount value={b.limit} /></span>
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
                  <span className="num"><Amount value={topGoal.saved} /></span>
                  <span className="num"><Amount value={topGoal.target_amount} /></span>
                </div>
              </Card>
            )}
          </div>
        )}
    </div>
  );
}
