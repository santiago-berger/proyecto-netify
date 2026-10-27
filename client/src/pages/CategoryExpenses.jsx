import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "../api/api.js";
import { Card } from "../components/ui/Card.jsx";
import { Amount } from "../components/ui/Amount.jsx";
import { Spinner } from "../components/ui/Spinner.jsx";
import { Empty } from "../components/ui/Empty.jsx";
import { ExpenseModal } from "../components/ExpenseModal.jsx";
import { longDate, todayISO } from "../utils/format.js";

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const ORDERS = [
  { key: "desc", label: "Más recientes" },
  { key: "asc", label: "Más antiguos" },
];

export default function CategoryExpenses() {
  const { id } = useParams();
  // the month comes from the "Gastos" screen; without it, the current month is used
  const [searchParams, setSearchParams] = useSearchParams();
  const now = new Date();
  const month = Number(searchParams.get("month")) || now.getMonth() + 1;
  const year = Number(searchParams.get("year")) || now.getFullYear();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [order, setOrder] = useState("desc");
  const [modal, setModal] = useState(null); // { expense } while editing, {} while creating

  const load = async () => {
    try {
      const [e, c] = await Promise.all([
        api.get(`/expenses/category/${id}?page=${page}&order=${order}&month=${month}&year=${year}`),
        api.get("/categories"),
      ]);
      // after deleting the last expense of a page, go back one page
      if (e.data.expenses.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }
      setData(e.data);
      setCategories(c.data);
      setNotFound(false);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else console.error("Error loading category expenses:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [id, page, order, month, year]);

  const changeMonth = (delta) => {
    const date = new Date(year, month - 1 + delta, 1);
    setSearchParams({ month: date.getMonth() + 1, year: date.getFullYear() });
    setPage(1);
  };

  const changeOrder = (key) => {
    setOrder(key);
    setPage(1);
  };

  const remove = async (expenseId) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    try {
      await api.delete(`/expenses/${expenseId}`);
      await load();
    } catch (err) {
      console.error("Error deleting expense:", err);
    }
  };

  const onSaved = async () => {
    setModal(null);
    await load();
  };

  if (loading) return <Spinner />;

  const backLink = (
    <Link to="/gastos" state={{ month, year }} className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }}>
      <ArrowLeft size={14} /> Volver a Gastos
    </Link>
  );

  if (notFound || !data) {
    return (
      <div className="page-grid">
        {backLink}
        <Card><Empty icon={Receipt} title="No encontramos esta categoría" /></Card>
      </div>
    );
  }

  // the user's own color for this category (base categories can have a personal one)
  const color = categories.find((c) => c.id === data.category.id)?.color || data.category.color || "#8fa3ad";
  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();
  const from = data.count === 0 ? 0 : (data.page - 1) * data.perPage + 1;
  const to = Math.min(data.page * data.perPage, data.count);

  return (
    <div className="page-grid">
      {backLink}

      <div className="card" style={{ borderTop: `3px solid ${color}` }}>
        <div className="flex between center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div className="flex center gap">
            <span className="cat-dot" style={{ background: color, width: 16, height: 16, borderRadius: 5 }} />
            <div>
              <h2 style={{ fontSize: 20 }}>{data.category.name}</h2>
              <div className="muted" style={{ fontSize: 12.5 }}>
                {data.count} {data.count === 1 ? "gasto" : "gastos"} en {MONTH_NAMES[month - 1].toLowerCase()} {year}
              </div>
            </div>
          </div>
          <div className="right">
            <div className="muted" style={{ fontSize: 12 }}>Total del mes</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 600 }}><Amount value={data.totalAmount} /></div>
          </div>
        </div>
      </div>

      <Card
        title="Gastos"
        action={<button className="btn btn-primary btn-sm" onClick={() => setModal({})}><Plus size={15} /> Nuevo gasto</button>}
      >
        <div className="flex between center" style={{ flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <div className="section-tabs" style={{ marginBottom: 0 }}>
            {ORDERS.map((o) => (
              <div key={o.key} className={`tab ${order === o.key ? "active" : ""}`} onClick={() => changeOrder(o.key)}>{o.label}</div>
            ))}
          </div>
          <div className="flex center gap">
            <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(-1)} style={{ padding: 7 }} title="Mes anterior"><ChevronLeft size={15} /></button>
            <div className="r-title" style={{ minWidth: 130, textAlign: "center", fontWeight: 600 }}>{MONTH_NAMES[month - 1]} {year}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => changeMonth(1)} style={{ padding: 7 }} title="Mes siguiente"><ChevronRight size={15} /></button>
          </div>
        </div>

        {data.count === 0 ? (
          <Empty icon={Receipt} title={`No hay gastos de esta categoría en ${MONTH_NAMES[month - 1].toLowerCase()} ${year}`} />
        ) : (
          <>
            <div className="list">
              {data.expenses.map((e) => (
                <div className="row" key={e.id}>
                  <div className="grow">
                    <div className="r-title">{e.description}</div>
                    <div className="r-sub">{longDate(e.date)}</div>
                  </div>
                  <div className="num" style={{ fontWeight: 600 }}><Amount value={e.amount} /></div>
                  <div className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setModal({ expense: e })} style={{ padding: 7 }} title="Editar"><Pencil size={14} /></button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(e.id)} style={{ padding: 7 }} title="Eliminar"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pagination">
              <span className="muted" style={{ fontSize: 12.5 }}>Mostrando {from}–{to} de {data.count}</span>
              <div className="flex center gap">
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(page - 1)} disabled={data.page <= 1}>
                  <ChevronLeft size={14} /> Anterior
                </button>
                <span className="num" style={{ fontSize: 13 }}>Página {data.page} de {data.pages}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => setPage(page + 1)} disabled={data.page >= data.pages}>
                  Siguiente <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      {modal && (
        <ExpenseModal
          expense={modal.expense}
          initialDate={isCurrentMonth ? todayISO() : `${year}-${String(month).padStart(2, "0")}-01`}
          initialCategoryId={data.category.id}
          categories={categories}
          onCategoriesChange={setCategories}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
