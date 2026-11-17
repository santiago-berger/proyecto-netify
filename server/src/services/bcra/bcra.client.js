import {
  BcraInvalidResponseError,
  BcraTimeoutError,
  BcraUnavailableError,
} from "./bcra.errors.js";

/*
  Cliente HTTP de la API de Transparencia del BCRA.
  Es la ÚNICA pieza que conoce la URL y el formato crudo de la respuesta:
  devuelve el array "results" tal cual o lanza un BcraError.
*/

// se leen al llamar (no al importar) porque dotenv.config() corre después de los imports
const baseUrl = () => process.env.BCRA_API_URL || "https://api.bcra.gob.ar/transparencia/v1.0";
const timeoutMs = () => Number(process.env.BCRA_TIMEOUT_MS) || 8000;
const MAX_RETRIES = 1; // 1 reintento: el peor caso queda en ~17 s antes de caer a la caché
const RETRY_DELAY_MS = 800;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isTimeout = (err) => err?.name === "TimeoutError" || err?.name === "AbortError";

async function request(path) {
  const TIMEOUT_MS = timeoutMs();
  let res;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (isTimeout(err)) {
      throw new BcraTimeoutError(`El BCRA no respondió en ${TIMEOUT_MS / 1000} s`, { cause: err });
    }
    throw new BcraUnavailableError("No se pudo conectar con la API del BCRA", { cause: err });
  }

  if (!res.ok) {
    throw new BcraUnavailableError(`La API del BCRA respondió con estado ${res.status}`, {
      status: res.status,
    });
  }

  let body;
  try {
    body = await res.json();
  } catch (err) {
    // el timeout también puede cortar mientras se lee el cuerpo
    if (isTimeout(err)) {
      throw new BcraTimeoutError(`El BCRA no respondió en ${TIMEOUT_MS / 1000} s`, { cause: err });
    }
    throw new BcraInvalidResponseError("La API del BCRA devolvió una respuesta que no es JSON", {
      cause: err,
    });
  }

  if (!body || !Array.isArray(body.results)) {
    throw new BcraInvalidResponseError("La respuesta del BCRA no tiene el formato esperado");
  }

  return body.results;
}

// solo se reintenta lo que puede ser transitorio: timeouts, red caída, 5xx y 429
const isRetryable = (err) =>
  err instanceof BcraTimeoutError ||
  (err instanceof BcraUnavailableError && (!err.status || err.status >= 500 || err.status === 429));

async function withRetries(fn) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= MAX_RETRIES || !isRetryable(err)) throw err;
      await wait(RETRY_DELAY_MS * (attempt + 1));
    }
  }
}

// GET /Prestamos/Personales?codigoEntidad=X -> préstamos personales informados por esa entidad
export const fetchPersonalLoans = (codigoEntidad) =>
  withRetries(() => request(`/Prestamos/Personales?codigoEntidad=${encodeURIComponent(codigoEntidad)}`));
