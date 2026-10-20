import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Receipt, Wallet, CreditCard, PiggyBank,
  Calculator, BookOpen, LogOut, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const groups = [
  {
    label: "Principal",
    items: [
      { to: "/", icon: LayoutDashboard, text: "Resumen", end: true, key: null },
      { to: "/gastos", icon: Receipt, text: "Gastos", key: null },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { to: "/presupuestos", icon: Wallet, text: "Presupuestos", key: "presupuestos" },
      { to: "/deudas", icon: CreditCard, text: "Deudas y vencimientos", key: "deudas" },
      { to: "/metas", icon: PiggyBank, text: "Metas de ahorro", key: "metas" },
      { to: "/simulador", icon: Calculator, text: "Simulador de préstamos", key: "simulador" },
    ],
  },
  {
    label: "Aprender",
    items: [
      { to: "/aprender", icon: BookOpen, text: "Educación financiera", key: "aprender" },
    ],
  },
];

export const Sidebar = ({ open, collapsed, onToggleCollapse }) => {
  const { user, logout, modules } = useAuth();
  const name = user?.profile?.first_name
    ? `${user.profile.first_name} ${user.profile.last_name || ""}`.trim()
    : user?.username || "";
  const initial = (user?.profile?.first_name?.[0] || user?.username?.[0] || "U").toUpperCase();

  const visibleGroups = groups
    .map((g) => ({ ...g, items: g.items.filter((it) => !it.key || modules?.[it.key]) }))
    .filter((g) => g.items.length > 0);

  return (
    <aside className={`sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}>
      {/* botón para contraer/expandir */}
      <button className="collapse-btn" onClick={onToggleCollapse} title={collapsed ? "Expandir" : "Contraer"}>
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* arriba a la izquierda: foto de perfil + nombre de la cuenta (acceso al perfil) */}
      <NavLink to="/perfil" className={({ isActive }) => `user-block ${isActive ? "active" : ""}`}>
        <div className="user-avatar">
          {user?.profile?.avatar_url ? (
            <img src={user.profile.avatar_url} alt="Foto" />
          ) : (
            initial
          )}
        </div>
        {!collapsed && (
          <div className="user-info">
            <div className="user-name">{name}</div>
            <div className="user-handle">@{user?.username}</div>
          </div>
        )}
      </NavLink>

      {/* debajo del perfil: cerrar sesión */}
      <button className="nav-item logout-item" onClick={logout} title="Cerrar sesión">
        <LogOut size={18} />
        {!collapsed && "Cerrar sesión"}
      </button>

      <div className="sidebar-scroll">
        {visibleGroups.map((g) => (
          <div key={g.label}>
            {!collapsed && <div className="nav-group-label">{g.label}</div>}
            {collapsed && <div className="nav-group-sep" />}
            {g.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                title={collapsed ? it.text : undefined}
              >
                <it.icon size={18} />
                {!collapsed && it.text}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
};
