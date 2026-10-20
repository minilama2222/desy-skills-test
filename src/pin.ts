import { readFileSync } from "node:fs";

export interface Pin {
  ref: string;
  commit: string;
  fecha: string;
  repo?: string;
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
