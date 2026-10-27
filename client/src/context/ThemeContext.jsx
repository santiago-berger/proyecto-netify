import { createContext, useContext, useEffect, useState } from "react";

const THEME_KEY = "netify_theme";
const ThemeContext = createContext(null);

export const getSavedTheme = () => {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
};

// sets the theme on <html> so the CSS variables of index.css switch
export const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getSavedTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      console.error("Could not save theme:", err);
    }
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
