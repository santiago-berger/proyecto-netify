import { Menu, Sun, Moon } from "lucide-react";
import { NotificationBell } from "./NotificationBell.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export const Topbar = ({ hello, onMenu }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="topbar">
      <div className="flex center gap">
        <button className="btn btn-ghost btn-sm menu-btn" onClick={onMenu} style={{ padding: 8 }}>
          <Menu size={18} />
        </button>
        <div>
          <h1>Gestor de Finanzas</h1>
          {hello && <div className="hello">{hello}</div>}
        </div>
      </div>

      {/* arriba a la derecha: tema + notificaciones + marca */}
      <div className="topbar-right">
        <button className="btn btn-ghost btn-sm" onClick={toggleTheme} style={{ padding: 9 }}
          title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"} aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <NotificationBell />
        <div className="topbar-brand">
          <img src="/finanzas-icon.png" alt="Netify" />
          <span>Netify</span>
        </div>
      </div>
    </div>
  );
};
