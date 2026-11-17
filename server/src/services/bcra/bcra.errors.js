// Errores propios de la integración con el BCRA.
// El controller solo necesita saber que es un BcraError para responder 503;
// las subclases sirven para loguear y decidir si vale la pena reintentar.

export class BcraError extends Error {
  constructor(message, { cause, status } = {}) {
    super(message, { cause });
    this.name = this.constructor.name;
    this.status = status; // estado HTTP que devolvió el BCRA, si lo hubo
  }
}

// el BCRA no respondió dentro del tiempo límite
export class BcraTimeoutError extends BcraError {}

// error de red, SSL o estado HTTP de error
export class BcraUnavailableError extends BcraError {}

// llegó algo que no es el JSON esperado (HTML de mantenimiento, JSON roto, sin "results", etc.)
export class BcraInvalidResponseError extends BcraError {}
