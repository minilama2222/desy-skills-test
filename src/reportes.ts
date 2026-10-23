import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { ResultadoEjecucion } from "./ejecutar.js";
import { REPO_ROOT } from "./repo.js";

/**
 * Dónde quedan las Ejecuciones persistidas, una por fichero:
 * `reports/ejecuciones/<skill>/<caso>/<n>.json`. El CLI `run` escribe aquí y el
 * CLI `report` lee de aquí para agregar el Scorecard. Es la materia prima del
 * reporte; el Scorecard es la vista.
 */
export const EJECUCIONES_DIR = join(REPO_ROOT, "reports", "ejecuciones");

/**
 * Dónde se escriben las dos formas del reporte: el JSON (fuente de verdad, lo
 * que consume CI) y el Scorecard legible. Viven junto a `EJECUCIONES_DIR` para
 * que el trazado de `reports/` esté en un solo módulo, no repartido por el CLI.
 */
export const SCORECARD_JSON_PATH = join(REPO_ROOT, "reports", "scorecard.json");
export const SCORECARD_MD_PATH = join(REPO_ROOT, "reports", "scorecard.md");

/**
 * Guarda una Ejecución como fichero JSON. El nombre es la cuenta de ficheros ya
 * presentes en la carpeta del Caso, así que N Ejecuciones del mismo Caso quedan
 * como `1.json`, `2.json`, … sin pisarse.
 *
 * El resultado ya viene completo de `ejecutarCaso` (skill, caso, tipo, pin,
 * grade, detalle, flujo, artefactos, entrega, flujoAlcanzoSkill): persistirlo es
 * serializarlo tal cual, para que el reporte no dependa de volver a correr el SUT.
 */
export function guardarEjecucion(dir: string, resultado: ResultadoEjecucion): string {
  const carpeta = join(dir, resultado.skill, resultado.caso);
  mkdirSync(carpeta, { recursive: true });
  const path = join(carpeta, `${siguienteIndice(carpeta)}.json`);
  writeFileSync(path, JSON.stringify(resultado, null, 2) + "\n", "utf8");
  return path;
}

/**
 * Lee todas las Ejecuciones del árbol de reportes, ordenadas por ruta (skill,
 * caso, número), que es un orden estable para el reporte de CI.
 */
export function leerEjecuciones(dir: string): ResultadoEjecucion[] {
  if (!existsSync(dir)) return [];
  return ficherosJson(dir)
    .sort((a, b) => a.localeCompare(b))
    .map((path) => JSON.parse(readFileSync(path, "utf8")) as ResultadoEjecucion);
}

function siguienteIndice(carpeta: string): number {
  const actuales = existsSync(carpeta)
    ? readdirSync(carpeta).filter((f) => f.endsWith(".json")).length
    : 0;
  return actuales + 1;
}

function ficherosJson(dir: string): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) paths.push(...ficherosJson(full));
    else if (entry.name.endsWith(".json")) paths.push(full);
  }
  return paths;
}

/** Ruta relativa al repo, para mensajes. */
export function rutaRelativa(path: string): string {
  return relative(REPO_ROOT, path).split("\\").join("/");
}

/**
 * Escribe las dos formas del reporte: el JSON (fuente de verdad, lo que consume
 * CI) y el Scorecard legible. El trazado de `reports/` es de este módulo, no del
 * CLI; el CLI sólo pide «escribe el Scorecard» y anuncia dónde quedó.
 */
export function escribirScorecard(json: string, markdown: string): void {
  mkdirSync(dirname(SCORECARD_JSON_PATH), { recursive: true });
  writeFileSync(SCORECARD_JSON_PATH, json, "utf8");
  writeFileSync(SCORECARD_MD_PATH, markdown, "utf8");
}
