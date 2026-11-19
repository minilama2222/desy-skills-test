import { existsSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import { esCasoPagina } from "../src/caso.js";
import type { ResultadoEjecucion } from "../src/ejecutar.js";
import { REPO_ROOT } from "../src/repo.js";
import {
  derivas,
  renderLineaDeReplay,
  replayDeEjecuciones,
  type CasoDelDisco,
} from "../src/tier-rapido.js";

/**
 * (a) **Replay del grader** (ticket 08 del bucle de refinamiento): `npm run
 * replay-grader`.
 *
 * Las Ejecuciones guardadas en `--reports` (por defecto `reports/suite`) vuelven
 * a pasar por `grader.ts`, y cada una tiene que dar el **mismo Grade** que la
 * primera vez. Es el guardarraíl de que el grader no **deriva**: cambiar un
 * predicado, los pesos o el Framework mueve los Grades de corridas pasadas, y
 * eso se ve en segundos sin gastar una sola corrida del SUT.
 *
 * Corre en el pre-commit, pero con una guarda: sólo mira los árboles de
 * Ejecuciones que **existen** en el repo. `reports/` está ignorado por git, así
 * que un clon limpio —el CI— no tiene ninguna, y ahí el replay dice «nada que
 * re-graduar» y sale en verde: lo que protege es la Evidencia del mantenedor, y
 * sin ella no hay nada que afirmar.
 *
 * No abre navegador ni proceso externo: lee JSON de disco y llama al grader.
 * Vive en `scripts/` porque es un guardarraíl de la evidencia y no un test (ver
 * `scripts/verificar-tests.ts`).
 *
 * Uso: npm run replay-grader [-- --reports <dir>]
 */
export const REPORTS_POR_DEFECTO = join("reports", "suite");

/** Todos los `*.json` bajo `dir`, en orden estable. */
function ficherosJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const salida: string[] = [];
  const recorrer = (actual: string): void => {
    const entries = readdirSync(actual, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    for (const entry of entries) {
      const full = join(actual, entry.name);
      if (entry.isDirectory()) recorrer(full);
      else if (entry.name.endsWith(".json")) salida.push(full);
    }
  };
  recorrer(dir);
  return salida;
}

/** La carpeta de tipo (`componente` | `pagina` | `decision`) de un Caso en `casos/`. */
function carpetaDeCaso(skill: string, caso: string): string | undefined {
  const raiz = join(CASOS_DIR, skill);
  if (!existsSync(raiz)) return undefined;
  for (const tipo of readdirSync(raiz, { withFileTypes: true })) {
    if (!tipo.isDirectory()) continue;
    const candidato = join(raiz, tipo.name, caso);
    if (existsSync(candidato)) return candidato;
  }
  return undefined;
}

/**
 * El Caso del disco con el que re-graduar una Ejecución que no trae sus Checks.
 * Sólo se necesita en ese respaldo; y sólo para un Caso-página hace falta el Gold
 * (los guards de fidelidad lo comparan contra él).
 */
function casoDelDisco(skill: string, caso: string): CasoDelDisco | undefined {
  const carpeta = carpetaDeCaso(skill, caso);
  if (carpeta === undefined) return undefined;
  try {
    const cargado = cargarCaso(carpeta);
    const gold = esCasoPagina(cargado) ? readFileSync(cargado.goldPath, "utf8") : undefined;
    return gold === undefined ? { checks: cargado.checks } : { checks: cargado.checks, gold };
  } catch {
    return undefined;
  }
}

/**
 * ¿El JSON es una Ejecución, o el `scorecard.json` de la corrida raíz? Una
 * Ejecución declara `grade`, `detalle`, `artefactos` y `flujoObservado`; el
 * scorecard no. Se pregunta por lo que **declara**, no por la ruta: un árbol de
 * `--reports` puede tener cualquier forma.
 */
function esEjecucion(raw: unknown): raw is ResultadoEjecucion {
  if (typeof raw !== "object" || raw === null) return false;
  const e = raw as Partial<ResultadoEjecucion>;
  return (
    typeof e.grade === "string" &&
    Array.isArray(e.detalle) &&
    typeof e.artefactos === "object" &&
    Array.isArray(e.flujoObservado)
  );
}

function argumento(args: string[], nombre: string): string | undefined {
  const i = args.indexOf(nombre);
  return i === -1 ? undefined : args[i + 1];
}

function main(argv: string[]): number {
  const reports = argumento(argv, "--reports") ?? REPORTS_POR_DEFECTO;
  const dir = isAbsolute(reports) ? reports : join(REPO_ROOT, reports);
  if (!existsSync(dir)) {
    console.log(
      `OK: no hay árbol de Ejecuciones en ${reports}: nada que re-graduar. ` +
        "El replay protege la Evidencia de una corrida; sin ella no hay nada que afirmar.",
    );
    return 0;
  }

  const lecturas: { origen: string; ejecucion: ResultadoEjecucion }[] = [];
  for (const path of ficherosJson(dir)) {
    const relativo = relative(process.cwd(), path).split("\\").join("/");
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
    } catch (error) {
      console.log(`No se pudo leer ${relativo}: ${(error as Error).message}`);
      return 1;
    }
    if (!esEjecucion(raw)) continue;
    lecturas.push({ origen: relativo, ejecucion: raw });
  }

  // Hoy el replay re-gradua SIEMPRE con los Checks del Caso del disco (la
  // Ejecución no guarda el peso, ver `checksDeLaEjecucion`), así que el Caso se
  // resuelve para todas, no sólo para las viejas. Un Caso que ya no está es un
  // error explícito por Ejecución, no un hueco silencioso.
  const porCaso = new Map<string, CasoDelDisco | undefined>();
  for (const { ejecucion } of lecturas) {
    const clave = `${ejecucion.skill}/${ejecucion.caso}`;
    if (porCaso.has(clave)) continue;
    porCaso.set(clave, casoDelDisco(ejecucion.skill, ejecucion.caso));
  }

  let resultados: ResultadoDelReplay[];
  try {
    resultados = replayDeEjecuciones(lecturas, (skill, caso) =>
      porCaso.get(`${skill}/${caso}`),
    );
  } catch (error) {
    console.log((error as Error).message);
    return 1;
  }

  for (const r of resultados) console.log(renderLineaDeReplay(r));
  for (const r of resultados) {
    if (r.faltanCampos.length > 0) {
      console.log(
        `AVISO  ${r.origen}: la Ejecución no declara ${r.faltanCampos.join(", ")} ` +
          "(se escribió antes de los tickets 02/04); el Grade sí se ha re-graduado.",
      );
    }
    if (r.origenChecks === "desde-el-caso") {
      console.log(
        `AVISO  ${r.origen}: se re-graduó con los Checks del Caso de hoy (la ` +
          "Ejecución no guarda el peso del Check), no con los que se graduó.",
      );
    }
  }

  const fallos = derivas(resultados);
  if (fallos.length === 0) {
    console.log(
      `OK: ${resultados.length} Ejecución/es re-graduadas, todas con el mismo Grade.`,
    );
    return 0;
  }

  console.log(
    `El grader DERRIVA en ${fallos.length} de ${resultados.length} Ejecución/es: las ` +
      "de arriba. O la Evidencia se escribió con otra versión del grader (áncora la " +
      "expectativa), o el cambio del grader movió un Grade ya medido y toca decidirlo.",
  );
  return 1;
}

process.exitCode = main(process.argv.slice(2));
