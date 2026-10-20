import axios from "axios";

// instancia central: manda las cookies (JWT) en cada request
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: true,
});
