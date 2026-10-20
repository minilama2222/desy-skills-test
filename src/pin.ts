import { readFileSync } from "node:fs";

export interface Pin {
  ref: string;
  commit: string;
  fecha: string;
  repo: string;
}

const SHA_RE = /^[0-9a-f]{7,40}$/i;

function requireString(raw: Record<string, unknown>, field: keyof Pin): string {
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
  const ref = requireString(record, "ref");
  const commit = requireString(record, "commit");
  const fecha = requireString(record, "fecha");
  const repo = requireString(record, "repo");

  if (!SHA_RE.test(commit)) {
    throw new Error(
      `pin.json inválido: el campo "commit" no es un SHA de git (${commit})`,
    );
  }

  return { ref, commit, fecha, repo };
}

export function readPin(path: string): Pin {
  const text = readFileSync(path, "utf8");
  return parsePin(JSON.parse(text));
}
