const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const parseBody = async (res) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

// Sends the JWT cookie on every request and mirrors the { data } / err.response shape used by the pages
const request = async (method, url, body) => {
  const options = { method, credentials: "include", headers: {} };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${url}`, options);
  const data = await parseBody(res);

  if (!res.ok) {
    const error = new Error(data?.message || `Request failed with status ${res.status}`);
    error.response = { status: res.status, data };
    throw error;
  }

  return { status: res.status, data };
};

export const api = {
  get: (url) => request("GET", url),
  post: (url, body) => request("POST", url, body),
  put: (url, body) => request("PUT", url, body),
  delete: (url) => request("DELETE", url),
};
