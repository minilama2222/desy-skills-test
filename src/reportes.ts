import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
 * El árbol de `reports/` **del repo**: la raíz de las corridas sueltas de `run`.
 * Es la única base que produce las dos rutas de arriba (`rutasDeReporte(REPORTS_DIR)`),
 * para que el trazado no viva en dos sitios.
 */
export const REPORTS_DIR = join(REPO_ROOT, "reports");

/**
 * La suite (`npm run suite`) escribe en su propio árbol para que su reporte
 * describa **sólo** sus Ejecuciones: si compartiera `reports/ejecuciones/` con
 * las corridas sueltas de `npm run run`, el veredicto de un Caso mezclaría
 * Ejecuciones de distinta fecha y el exit code de CI dependería de la historia
 * local. El adaptador del CLI resuelve el árbol desde `--reports`.
 */
export function rutasDeReporte(reportsDir: string): {
  ejecuciones: string;
  scorecardJson: string;
  scorecardMd: string;
  informes: string;
} {
  return {
    ejecuciones: join(reportsDir, "ejecuciones"),
    scorecardJson: join(reportsDir, "scorecard.json"),
    scorecardMd: join(reportsDir, "scorecard.md"),
    // El informe por Caso (ticket 06) va al lado del Scorecard: es una **vista**
    // de las Ejecuciones, y como el Scorecard se regenera entero en cada corrida.
    informes: join(reportsDir, "informe"),
  };
}

/**
 * Vacía el árbol de Ejecuciones de una corrida: la suite persiste sus propias
 * Ejecuciones desde cero, para que dos suites seguidas no sumen veredictos.
 */
export function vaciarEjecuciones(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

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
 * CLI; el CLI sólo pide «escribe el Scorecard» y anuncia dónde quedó. Por defecto
 * en las rutas del repo; la suite pasa las suyas (`rutasDeReporte`).
 */
export function escribirScorecard(
  json: string,
  markdown: string,
  rutas: { scorecardJson: string; scorecardMd: string } = {
    scorecardJson: SCORECARD_JSON_PATH,
    scorecardMd: SCORECARD_MD_PATH,
  },
): void {
  mkdirSync(dirname(rutas.scorecardJson), { recursive: true });
  writeFileSync(rutas.scorecardJson, json, "utf8");
  writeFileSync(rutas.scorecardMd, markdown, "utf8");
}

/** El informe de un Caso, tal como se escribe a disco. */
export interface InformeAEscribir {
  skill: string;
  caso: string;
  markdown: string;
}

/**
 * Escribe un informe legible por Caso en `<dir>/<skill>/<caso>.md` (ticket 06).
 * Vacía antes el árbol de informes: un informe de una corrida anterior —de un
 * Caso que ya no está, o de una Ejecución que ya no existe— describiría algo que
 * no se midió, y el informe es justo el documento en el que se confía.
 *
 * Devuelve las rutas escritas, para que el CLI las anuncie.
 */
export function escribirInformes(dir: string, informes: InformeAEscribir[]): string[] {
  rmSync(dir, { recursive: true, force: true });
  return informes.map((informe) => {
    const path = join(dir, informe.skill, `${informe.caso}.md`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, informe.markdown, "utf8");
    return path;
  });
}
