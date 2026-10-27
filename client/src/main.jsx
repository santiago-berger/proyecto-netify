import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { ThemeProvider, applyTheme, getSavedTheme } from "./context/ThemeContext.jsx";
import App from "./App.jsx";
import "./index.css";

// apply the saved theme before the first render to avoid a flash of the other theme
applyTheme(getSavedTheme());

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
