import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Caso, CasoComponente, CasoPagina, Check } from "./caso.js";
import { parseChecks, tipoDeCarpeta } from "./caso.js";

export type CasoEnDisco = Caso;

const RUBRIC = "rubric.md";
const PROMPT = join("input", "prompt.md");
const CHECKS = join("expected", "checks.json");
const GOLD = join("input", "gold.html");

function leer(path: string, descripcion: string): string {
  if (!existsSync(path)) {
    throw new Error(`Caso inválido: falta ${descripcion} (${path})`);
  }
  return readFileSync(path, "utf8");
}

function cargarChecks(dir: string): Check[] {
  const path = join(dir, CHECKS);
  const texto = leer(path, "el checks.json del Caso en expected/checks.json");
  try {
    return parseChecks(texto);
  } catch (error) {
    throw new Error(
      `Caso inválido: checks.json malformado (${path}): ${(error as Error).message}`,
    );
  }
}

export function cargarCaso(dir: string): Caso {
  const partes = dir.replace(/\\/g, "/").split("/");
  const id = partes[partes.length - 1]!;
  const carpetaTipo = partes[partes.length - 2]!;
  const skill = partes[partes.length - 3]!;

  if (!skill || !carpetaTipo || !id) {
    throw new Error(
      `Caso inválido: se esperaba <skill>/<tipo>/<id> (recibido "${dir}")`,
    );
  }

  const tipo = tipoDeCarpeta(carpetaTipo);
  const prompt = leer(join(dir, PROMPT), "el prompt del Caso en input/prompt.md").trim();
  if (!prompt) {
    throw new Error(`Caso inválido: el prompt (${join(dir, PROMPT)}) está vacío`);
  }
  leer(join(dir, RUBRIC), "la rúbrica del Caso en rubric.md");
  const checks = cargarChecks(dir);

  if (tipo === "caso-pagina") {
    const goldPath = join(dir, GOLD);
    if (!existsSync(goldPath)) {
      throw new Error(`Caso-página inválido: falta el Gold-HTML en input/gold.html (${goldPath})`);
    }
    const caso: CasoPagina = { tipo, skill, id, prompt, checks, goldPath };
    return caso;
  }

  const caso: CasoComponente = { tipo, skill, id, prompt, checks };
  return caso;
}

export function cargarCasos(root: string): CasoEnDisco[] {
  if (!existsSync(root)) return [];

  const casos: CasoEnDisco[] = [];
  for (const skill of readdirSync(root, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const skillDir = join(root, skill.name);
    for (const tipo of readdirSync(skillDir, { withFileTypes: true })) {
      if (!tipo.isDirectory()) continue;
      const tipoDir = join(skillDir, tipo.name);
      for (const caso of readdirSync(tipoDir, { withFileTypes: true })) {
        if (!caso.isDirectory()) continue;
        casos.push(cargarCaso(join(tipoDir, caso.name)));
      }
    }
  }
  return casos;
}
