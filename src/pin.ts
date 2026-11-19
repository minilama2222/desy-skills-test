import { readFileSync } from "node:fs";
import { relative, sep } from "node:path";

export interface Pin {
  ref: string;
  commit: string;
  fecha: string;
  repo?: string;
}

/**
 * El Pin de una corrida **local**: los skills salieron de un checkout del usuario
 * y no de `vendor/` (ticket 05 del bucle de refinamiento). Lleva la ruta de la que
 * se copiaron, para que el informe diga de dónde, y `commit: LOCAL` en vez de un
 * SHA: no hay commit que declarar, y fingir uno es exactamente lo que el ticket 04
 * quitó.
 *
 * Canónico sigue siendo upstream por SHA (ADR-0003): esto es comodidad declarada,
 * no una segunda vía de verdad.
 */
export type PinLocal = Pin & { local: true };

/** Lo que declara un Pin local en el campo `commit`: no es un SHA a propósito. */
export const LOCAL = "local";

export function esPinLocal(pin: Pin): pin is PinLocal {
  return (pin as PinLocal).local === true;
}

/** El Pin local de una corrida: `LOCAL`, la ruta del checkout y la fecha. */
export function pinLocal(ruta: string, fecha: string): PinLocal {
  return { ref: "local", commit: LOCAL, fecha, repo: ruta, local: true };
}

/**
 * Un Pin local lleva la ruta de un checkout del usuario, que **no puede** entrar en
 * lo que se versiona: ni el repo, ni el scorecard de una versión (ticket 09). Se
 * queda con los hechos —`local`, la fecha— y tira la ruta y la marca.
 */
export function pinSinRuta(pin: Pin): Pin {
  if (!esPinLocal(pin)) return pin;
  return { ref: pin.ref, commit: pin.commit, fecha: pin.fecha };
}

/** La ruta de un checkout local tal como va en el informe: relativa al repo, con `/`. */
export function rutaEnElRepo(raiz: string, ruta: string): string {
  return relative(raiz, ruta).split(sep).join("/");
}

export const DEFAULT_REPO = "https://github.com/minilama2222/desy-skills";

const SHA_RE = /^[0-9a-f]{7,40}$/i;

export function normalizeRef(ref: string): string {
  return ref.replace(/^refs\/heads\//, "");
}

function readString(raw: Record<string, unknown>, field: string): string {
  const value = raw[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`pin.json inválido: falta el campo "${field}"`);
  }
  return value;
}

export function parsePin(raw: unknown): Pin {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("pin.json inválido: se esperaba un objeto");
  }

  const record = raw as Record<string, unknown>;
  const ref = readString(record, "ref");
  const commit = readString(record, "commit");
  const fecha = readString(record, "fecha");

  if (!SHA_RE.test(commit)) {
    throw new Error(
      `pin.json inválido: el campo "commit" no es un SHA de git (${commit})`,
    );
  }

  const repo = record.repo;
  if (repo !== undefined && (typeof repo !== "string" || repo.length === 0)) {
    throw new Error(`pin.json inválido: el campo "repo" no es un string`);
  }

  return { ref, commit, fecha, repo };
}

export function readPin(path: string): Pin {
  const text = readFileSync(path, "utf8");
  return parsePin(JSON.parse(text));
}
