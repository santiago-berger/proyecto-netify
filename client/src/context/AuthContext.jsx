import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api/axios.js";
import { getModules, saveModules, allModules } from "../utils/modules.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modules, setModules] = useState(() => getModules() || allModules());

  const loadUser = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (username, password) => {
    await api.post("/auth/login", { username, password });
    await loadUser();
  };

  const register = async (payload) => {
    await api.post("/auth/register", payload);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setUser(null);
  };

  // actualiza las herramientas visibles (plantilla) y las persiste
  const updateModules = (mods) => {
    setModules(mods);
    saveModules(mods);
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, login, register, logout, reload: loadUser, modules, updateModules }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
