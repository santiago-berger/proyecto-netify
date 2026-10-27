import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, AlertCircle, Clock, CalendarDays, BellOff } from "lucide-react";
import { api } from "../api/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { money, shortDate, daysBetween } from "../utils/format.js";

const READ_KEY = "netify_read_notifications";
const REFRESH_MS = 60000;

const getReadIds = () => {
  try {
    return JSON.parse(localStorage.getItem(READ_KEY)) || [];
  } catch {
    return [];
  }
};

const saveReadIds = (ids) => {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
};

const ICONS = { debt_overdue: AlertCircle, debt_soon: Clock, reminder: CalendarDays };

const relativeDay = (today, date) => {
  const days = daysBetween(today, date);
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  return `el ${shortDate(date)}`;
};

const describe = (n, today) => {
  const amount = n.amount != null ? ` · ${money(n.amount)}` : "";
  if (n.kind === "debt_overdue") return { heading: "Deuda vencida", text: `${n.title}${amount} · venció el ${shortDate(n.date)}` };
  if (n.kind === "debt_soon") return { heading: "Vencimiento próximo", text: `${n.title}${amount} · vence ${relativeDay(today, n.date)}` };
  return { heading: "Recordatorio", text: `${n.title}${amount} · ${relativeDay(today, n.date)}` };
};

export const NotificationBell = () => {
  const { modules } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [today, setToday] = useState("");
  const [readIds, setReadIds] = useState(getReadIds);

  const load = async () => {
    try {
      const { data } = await api.get("/notifications");
      setItems(data.notifications);
      setToday(data.today);
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  };

  // refresh on every page change and once a minute
  useEffect(() => { load(); }, [location.pathname]);
  useEffect(() => {
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // debt alerts only make sense if the debts tool is enabled
  const visible = items.filter((n) => n.kind === "reminder" || modules?.deudas !== false);
  const unreadCount = visible.filter((n) => !readIds.includes(n.id)).length;

  const markRead = (ids) => {
    // keep only ids that still exist so storage does not grow forever
    const current = new Set(items.map((n) => n.id));
    const next = [...new Set([...readIds, ...ids])].filter((id) => current.has(id));
    setReadIds(next);
    saveReadIds(next);
  };

  const openItem = (n) => {
    markRead([n.id]);
    setOpen(false);
    navigate(n.link);
  };

  return (
    <div className="notif" ref={ref}>
      <button className="btn btn-ghost btn-sm notif-btn" onClick={() => setOpen((v) => !v)} title="Notificaciones">
        <Bell size={18} />
        {unreadCount > 0 && <span className="notif-badge num">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <div className="r-title" style={{ fontWeight: 600 }}>Notificaciones</div>
            {unreadCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => markRead(visible.map((n) => n.id))} style={{ padding: "5px 10px" }}>
                Marcar todas como leídas
              </button>
            )}
          </div>

          {visible.length === 0 ? (
            <div className="empty" style={{ padding: "26px 16px" }}>
              <BellOff size={26} />
              <div style={{ fontWeight: 600, color: "var(--text)" }}>Estás al día</div>
              <div style={{ marginTop: 4, fontSize: 12.5 }}>No tenés alertas por ahora.</div>
            </div>
          ) : (
            <div className="notif-list">
              {visible.map((n) => {
                const Icon = ICONS[n.kind] || Bell;
                const unread = !readIds.includes(n.id);
                const { heading, text } = describe(n, today);
                return (
                  <div key={n.id} className={`notif-item ${unread ? "unread" : ""}`} onClick={() => openItem(n)}>
                    <div className={`icon-badge ${n.level}`}><Icon size={16} /></div>
                    <div className="grow" style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{heading}</div>
                      <div className="muted" style={{ fontSize: 12.5 }}>{text}</div>
                    </div>
                    {unread && <span className="notif-dot" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
