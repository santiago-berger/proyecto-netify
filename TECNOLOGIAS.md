# Tecnologías utilizadas — Netify

Netify es una aplicación web de gestión de finanzas personales. Tiene dos partes:

- `client/`: la interfaz (frontend).
- `server/`: la API REST (backend).

Las dos están escritas en **JavaScript** con módulos ES (`"type": "module"`).

---

## Entorno general

| Tecnología | Uso |
|---|---|
| **Node.js** | Entorno de ejecución del servidor y de las herramientas del cliente. |
| **npm** | Gestor de paquetes (`package.json` y `package-lock.json` en cada parte). |
| **Git / GitHub** | Control de versiones (ramas `main` y `develop`). |

---

## Backend (`server/`)

| Tecnología | Versión | Uso |
|---|---|---|
| **Express** | ^5.2.1 | Framework para la API REST, con todas las rutas bajo `/api`. |
| **MySQL** | — | Base de datos relacional. |
| **Sequelize** | ^6.37.8 | ORM: define los modelos, las relaciones y la sincronización de tablas. |
| **mysql2** | ^3.24.3 | Driver que usa Sequelize para conectarse a MySQL. |
| **jsonwebtoken** | ^9.0.3 | Generación y verificación de tokens JWT para la autenticación. |
| **bcrypt** | ^6.0.0 | Hash de contraseñas. |
| **cookie-parser** | ^1.4.7 | Lectura de la cookie donde se guarda el JWT. |
| **cors** | ^2.8.6 | Permite que el cliente (`CLIENT_ORIGIN`) envíe peticiones con credenciales. |
| **express-validator** | ^7.3.2 | Validación de los datos de entrada en los middlewares. |
| **dotenv** | ^17.4.2 | Carga de variables de entorno desde `.env`. |

**Scripts**

- `npm run dev`: inicia el servidor en modo desarrollo con `node --watch`.
- `npm start`: inicia el servidor.
- `npm run seed`: carga los datos iniciales.

**Variables de entorno** (ver `server/.env.example`): `PORT`, `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRES`, `CLIENT_ORIGIN`.

---

## Frontend (`client/`)

| Tecnología | Versión | Uso |
|---|---|---|
| **React** | ^18.3.1 | Librería para construir la interfaz con componentes. |
| **React DOM** | ^18.3.1 | Renderizado de React en el navegador. |
| **Vite** | ^5.4.10 | Servidor de desarrollo y empaquetado (puerto 5173). |
| **@vitejs/plugin-react** | ^4.3.3 | Plugin de Vite para soportar React y JSX. |
| **React Router DOM** | ^6.27.0 | Navegación entre pantallas y rutas protegidas. |
| **Axios** | ^1.7.7 | Cliente HTTP para consumir la API; envía la cookie JWT (`withCredentials`). |
| **Recharts** | ^2.13.0 | Gráficos del panel de resumen. |
| **Lucide React** | ^0.454.0 | Íconos. |
| **Tesseract.js** | ^7.0.0 | OCR en español: lee comprobantes y carga gastos a partir de una imagen. |
| **CSS** | — | Estilos propios con un sistema de diseño en `index.css` (modo oscuro). |
| **Google Fonts** | — | Tipografías Inter y Space Grotesk. |

**Scripts**

- `npm run dev`: inicia el servidor de desarrollo.
- `npm run build`: genera la build de producción.
- `npm run preview`: muestra la build generada.

**Variables de entorno** (ver `client/.env.example`): `VITE_API_URL`.
