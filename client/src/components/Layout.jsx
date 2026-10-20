import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.jsx";
import { Topbar } from "./Topbar.jsx";
import { Welcome } from "./Welcome.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/api.js";

export const Layout = () => {
  const [open, setOpen] = useState(false);        // drawer en mobile
  const [collapsed, setCollapsed] = useState(false); // contraído en desktop
  const { user, reload } = useAuth();
  const name = user?.profile?.first_name || user?.username || "";
  const showWelcome = user?.profile && user.profile.onboarded === false;

  const finishWelcome = async () => {
    try {
      await api.put("/auth/profile", { onboarded: true });
      await reload();
    } catch {
      await reload();
    }
  };

  return (
    <div className={`app ${collapsed ? "collapsed" : ""}`}>
      <Sidebar
        open={open}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />
      {/* fondo oscuro al abrir el menú en mobile */}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <main className="content">
        <Topbar
          hello={name ? `Hola de nuevo, ${name}` : ""}
          onMenu={() => setOpen((v) => !v)}
        />
        <Outlet />
      </main>
      {showWelcome && <Welcome onClose={finishWelcome} />}
    </div>
  );
};
