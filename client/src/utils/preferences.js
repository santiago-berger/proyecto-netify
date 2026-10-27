// Per-user UI preferences stored in the browser (featured goal, category order, ...)
const buildKey = (userId, name) => `netify_${name}_${userId ?? "guest"}`;

export const getPreference = (userId, name, fallback = null) => {
  try {
    const raw = localStorage.getItem(buildKey(userId, name));
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const savePreference = (userId, name, value) => {
  try {
    localStorage.setItem(buildKey(userId, name), JSON.stringify(value));
  } catch (err) {
    console.error("Could not save preference:", err);
  }
};
