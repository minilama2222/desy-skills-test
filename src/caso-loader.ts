import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  AnclaDeSkill,
  Caso,
  CasoComponente,
  CasoDecision,
  CasoPagina,
  Check,
} from "./caso.js";
import {
  anclajesDeRubric,
  contradiccionesDeRubric,
  parseChecks,
  tipoDeCarpeta,
} from "./caso.js";
import { REPO_ROOT } from "./repo.js";

export type CasoEnDisco = Caso;

/** Raíz canónica del árbol de Casos: <CASOS_DIR>/<skill>/<tipo>/<id>. */
export const CASOS_DIR = join(REPO_ROOT, "casos");

const RUBRIC = "rubric.md";
const PROMPT = join("input", "prompt.md");
const CHECKS = join("expected", "checks.json");
const GOLD = join("input", "gold.html");
const GOLD_IMAGEN = join("input", "gold.png");
const MOCKUP = join("input", "mockup.png");

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

/**
 * Pega cada ancla de `rubric.md` a su Check (ticket 06). Un ancla que nombra un
 * id que el Caso no tiene se **ignora** aquí y la caza `verificar-casos`: el
 * loader no juzga la rúbrica, sólo la lee.
 */
function anclarChecks(checks: Check[], anclajes: Map<string, AnclaDeSkill>): Check[] {
  return checks.map((check) => {
    const ancla = anclajes.get(check.id);
    return ancla === undefined ? check : { ...check, ancla };
  });
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
  const rubric = leer(join(dir, RUBRIC), "la rúbrica del Caso en rubric.md");
  const checks = anclarChecks(cargarChecks(dir), anclajesDeRubric(rubric));
  // La contradicción declarada viaja en el Caso, **no** en el Check (ticket 13):
  // el ancla sigue siendo la fuente de la regla y esto es el desacuerdo con ella.
  const contradicciones = contradiccionesDeRubric(rubric);
  const declaradas = contradicciones.size === 0 ? {} : { contradicciones };

  if (tipo === "caso-pagina") {
    const goldPath = join(dir, GOLD);
    if (!existsSync(goldPath)) {
      throw new Error(`Caso-página inválido: falta el Gold-HTML en input/gold.html (${goldPath})`);
    }
    const caso: CasoPagina = {
      tipo,
      skill,
      id,
      prompt,
      checks,
      ...declaradas,
      goldPath,
      goldImagenPath: join(dir, GOLD_IMAGEN),
    };
    return caso;
  }

  if (tipo === "caso-decision") {
    const mockupImagenPath = join(dir, MOCKUP);
    const caso: CasoDecision = {
      tipo,
      skill,
      id,
      prompt,
      checks,
      ...declaradas,
      ...(existsSync(mockupImagenPath) ? { mockupImagenPath } : {}),
    };
    return caso;
  }

  const caso: CasoComponente = { tipo, skill, id, prompt, checks, ...declaradas };
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
