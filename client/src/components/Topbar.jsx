import { Menu } from "lucide-react";
import { NotificationBell } from "./NotificationBell.jsx";

export const Topbar = ({ hello, onMenu }) => {
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

      {/* arriba a la derecha: notificaciones + marca */}
      <div className="topbar-right">
        <NotificationBell />
        <div className="topbar-brand">
          <img src="/finanzas-icon.png" alt="Netify" />
          <span>Netify</span>
        </div>
      </div>
    </div>
  );
};
