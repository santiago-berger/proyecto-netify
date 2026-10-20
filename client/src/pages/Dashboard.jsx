import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  TrendingDown, CreditCard, PiggyBank, CalendarClock, Receipt, Lightbulb, ChevronLeft, ChevronRight,
} from "lucide-react";
import { api } from "../api/axios.js";
import { Card } from "../components/ui/Card.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";
import { money, shortDate, MONTHS } from "../utils/format.js";

const TEALS = ["#0edfdc", "#7c5cff", "#ffb020", "#ff5c8a", "#3ddc84", "#4d9dff", "#c86bfa", "#8fa3ad"];
const MONTHS_LONG = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// genera sugerencias simples según el desglose de gastos del mes
const buildTips = (summary) => {
  const tips = [];
  const { total, byCategory } = summary;
  if (!total || byCategory.length === 0) return tips;
  const sorted = [...byCategory].sort((a, b) => b.total - a.total);
  const top = sorted[0];
  const topPct = Math.round((top.total / total) * 100);
  if (topPct >= 40) {
    tips.push(`Estás concentrando el ${topPct}% de tus gastos en “${top.category}”. Revisá si podés recortar algo ahí.`);
  }
  const ocio = byCategory.find((c) => /ocio|entreten/i.test(c.category));
  if (ocio && ocio.total / total >= 0.2) {
    tips.push(`Ocio representa el ${Math.round((ocio.total / total) * 100)}% del mes. Ponerle un presupuesto puede ayudarte a ahorrar.`);
  }
  if (byCategory.length >= 6) {
    tips.push("Tenés gastos repartidos en muchas categorías: fijar topes por categoría te va a dar más control.");
  }
  if (tips.length === 0) {
    tips.push("Tus gastos se ven equilibrados este mes. Buen momento para destinar algo a una meta de ahorro.");
  }
  return tips.slice(0, 3);
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [period, setPeriod] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [summary, setSummary] = useState({ total: 0, byCategory: [] });
  const [trend, setTrend] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [debts, setDebts] = useState({ totalPending: 0 });
  const [upcoming, setUpcoming] = useState({ upcoming: [], overdue: [] });
  const [goals, setGoals] = useState([]);

  // carga inicial (lo que no depende del período elegido)
  useEffect(() => {
    const load = async () => {
      try {
        const [t, e, d, u, g] = await Promise.all([
          api.get("/expenses/trend"),
          api.get("/expenses"),
          api.get("/debts"),
          api.get("/debts/upcoming"),
          api.get("/goals"),
        ]);
        setTrend(t.data.totals.map((x) => ({ mes: MONTHS[x.month - 1], total: x.total })));
        setExpenses(e.data.slice(0, 6));
        setDebts(d.data);
        setUpcoming(u.data);
        setGoals(g.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // el resumen por categoría se recarga cada vez que cambia el mes/año elegido
  useEffect(() => {
    api.get(`/expenses/summary?month=${period.month}&year=${period.year}`)
      .then((s) => setSummary(s.data));
  }, [period]);

  if (loading) return <Spinner />;

  const topGoal = goals[0];
  const alerts = upcoming.upcoming.length + upcoming.overdue.length;
  const tips = buildTips(summary);

  const changeMonth = (delta) => {
    setPeriod((p) => {
      let m = p.month + delta;
      let y = p.year;
      if (m < 1) { m = 12; y -= 1; }
      if (m > 12) { m = 1; y += 1; }
      return { month: m, year: y };
    });
  };
  const isCurrent = period.month === now.getMonth() + 1 && period.year === now.getFullYear();

  return (
    <div className="page-grid">
      <div className="grid-4">
        <div className="hero">
          <div className="label">Gasto del mes</div>
          <div className="value num">{money(summary.total)}</div>
          <div className="foot">Repartido en {summary.byCategory.length} categorías</div>
        </div>
        <div className="stat">
          <div className="label"><CreditCard size={15} /> Deuda pendiente</div>
          <div className="value num">{money(debts.totalPending)}</div>
        </div>
        <div className="stat">
          <div className="label"><CalendarClock size={15} /> Vencimientos próximos</div>
          <div className="value num">{alerts}</div>
        </div>
        <div className="stat">
          <div className="label"><PiggyBank size={15} /> Metas activas</div>
          <div className="value num">{goals.length}</div>
        </div>
      </div>

      <div className="grid-2">
        <Card
          title="Gastos por categoría"
          action={
            <div className="flex center gap">
              <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(-1)} style={{ padding: 6 }}><ChevronLeft size={15} /></button>
              <span className="num" style={{ fontSize: 12.5, minWidth: 96, textAlign: "center" }}>
                {MONTHS_LONG[period.month - 1]} {period.year}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(1)} style={{ padding: 6 }} disabled={isCurrent}><ChevronRight size={15} /></button>
            </div>
          }
        >
          {summary.byCategory.length === 0 ? (
            <Empty icon={Receipt} title="Sin gastos en este mes" hint={isCurrent ? "Cargá tu primer gasto para ver el desglose." : "No hay gastos registrados en este período."} />
          ) : (
            <div className="flex center" style={{ gap: 20, flexWrap: "wrap" }}>
              <div style={{ width: 190, height: 190 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={summary.byCategory} dataKey="total" nameKey="category"
                      innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none">
                      {summary.byCategory.map((_, i) => <Cell key={i} fill={TEALS[i % TEALS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)}
                      contentStyle={{ background: "#101d1f", border: "1px solid #24393b", borderRadius: 10, color: "#eaf5f4" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grow" style={{ minWidth: 200, flex: 1 }}>
                {summary.byCategory.map((c, i) => {
                  const pct = summary.total ? Math.round((c.total / summary.total) * 100) : 0;
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

      {/* sugerencias de ahorro */}
      {tips.length > 0 && (
        <Card title="Sugerencias para ahorrar" sub="Basadas en tus gastos del mes">
          <div className="list">
            {tips.map((t, i) => (
              <div className="row" key={i}>
                <div className="icon-badge"><Lightbulb size={17} /></div>
                <div className="grow r-title" style={{ fontWeight: 500 }}>{t}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid-2">
        <Card title="Últimos movimientos" sub="Tus gastos más recientes">
          {expenses.length === 0 ? (
            <Empty icon={Receipt} title="Todavía no hay movimientos" />
          ) : (
            <div className="list">
              {expenses.map((e) => (
                <div className="row" key={e.id}>
                  <div className="icon-badge"><TrendingDown size={17} /></div>
                  <div className="grow">
                    <div className="r-title">{e.description}</div>
                    <div className="r-sub">{e.category?.name} · {shortDate(e.date)}</div>
                  </div>
                  <div className="amount-neg num">- {money(e.amount)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="page-grid" style={{ gap: 18 }}>
          <Card title="Próximos vencimientos">
            {upcoming.overdue.length === 0 && upcoming.upcoming.length === 0 ? (
              <Empty icon={CalendarClock} title="Sin vencimientos cercanos" />
            ) : (
              <div className="list">
                {upcoming.overdue.map((d) => (
                  <div className="row" key={`o-${d.id}`}>
                    <div className="grow">
                      <div className="r-title">{d.creditor_name}</div>
                      <div className="r-sub">Venció el {shortDate(d.due_date)}</div>
                    </div>
                    <span className="chip danger">Vencida</span>
                    <div className="num" style={{ width: 90, textAlign: "right" }}>{money(d.amount)}</div>
                  </div>
                ))}
                {upcoming.upcoming.map((d) => (
                  <div className="row" key={`u-${d.id}`}>
                    <div className="grow">
                      <div className="r-title">{d.creditor_name}</div>
                      <div className="r-sub">Vence el {shortDate(d.due_date)}</div>
                    </div>
                    <span className="chip warn">Pronto</span>
                    <div className="num" style={{ width: 90, textAlign: "right" }}>{money(d.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {topGoal && (
            <Card title="Meta destacada">
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
      </div>
    </div>
  );
}
