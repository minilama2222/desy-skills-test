import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { REPO_ROOT } from "../src/repo.js";
import { VERSIONES_DIR } from "../src/reportes.js";
import {
  diffDeVersiones,
  renderDiff,
  validarVersion,
  type DiffDeVersiones,
  type ScorecardDeVersion,
} from "../src/versiones.js";

/**
 * `npm run diff-versiones [<a> <b>]` (ticket 09 del bucle de refinamiento): el
 * diff entre dos versiones de los skills, por Caso y por Skill.
 *
 * Es el adaptador del diff puro (`src/versiones.ts`): aquí sólo se resuelve de
 * dónde se lee cada versión y qué se dice cuando no hay dos.
 *
 * - **Sin argumentos**: las dos versiones **más recientes** de
 *   `reports/versiones/`. Una versión con `pin.commit` es canónica; una con
 *   `local (sin commit)` es una corrida sobre un checkout propio (ADR-0015),
 *   válida para iterar, y se avisa de que no es lo que se medirá en CI.
 * - **Con dos rutas** (o dos hashes): se leen esas, para comparar una línea base
 *   concreta. La ruta puede ser el JSON en `reports/versiones/` o cualquier otro.
 *
 * **Empieza vacío**: con menos de dos versiones no hay diff que dar. No es un
 * error —la primera suite deja una sola—, así que sale con 0 diciendo que falta
 * la segunda; escribir un diff contra nada sería inventar una línea base.
 *
 * No lee `reports/legado/` (ticket 10): el legado se midió con otra regla y
 * compararlo es justo la comparación que no significa nada.
 */

interface VersionEnDisco {
  path: string;
  version: ScorecardDeVersion;
  /** Cuándo se escribió: desempata dos versiones del mismo día. */
  escrito: number;
}

function leerVersion(path: string): VersionEnDisco {
  if (!existsSync(path)) {
    throw new Error(`No existe la versión "${path}"`);
  }
  const version = validarVersion(JSON.parse(readFileSync(path, "utf8")));
  return { path, version, escrito: statSync(path).mtimeMs };
}

/**
 * Todas las versiones del repo, de la más antigua a la más reciente. Se ordena
 * por la fecha del Pin y, a igualdad —dos corridas del mismo día—, por la hora
 * en que se escribió el fichero: el `arbolHash` no cronologiza, dos hashes no
 * dicen cuál es más nuevo.
 */
function versionesEnDisco(): VersionEnDisco[] {
  if (!existsSync(VERSIONES_DIR)) return [];
  return readdirSync(VERSIONES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => leerVersion(join(VERSIONES_DIR, f)))
    .sort(
      (a, b) =>
        a.version.pin.fecha.localeCompare(b.version.pin.fecha) || a.escrito - b.escrito,
    );
}

/** Un hash desnudo se busca en `reports/versiones/`; una ruta, tal cual. */
function buscar(argumento: string): VersionEnDisco {
  const comoHash = join(VERSIONES_DIR, `${argumento}.json`);
  return leerVersion(existsSync(comoHash) ? comoHash : resolve(REPO_ROOT, argumento));
}

function rutaLegible(path: string): string {
  return relative(REPO_ROOT, path).split("\\").join("/");
}

function avisarSiLocal(version: ScorecardDeVersion, etiqueta: string): void {
  if (version.pin.commit !== "local") return;
  console.error(
    `Aviso: la versión ${etiqueta} (${version.arbolHash.slice(0, 12)}) se midió sobre un ` +
      "Pin local (sin commit): es cómoda para iterar, no lo que se medirá en CI (ADR-0015).",
  );
}

function main(argv: string[]): number {
  let a: VersionEnDisco;
  let b: VersionEnDisco;

  if (argv.length === 0) {
    const enDisco = versionesEnDisco();
    if (enDisco.length < 2) {
      console.log(
        `Sin diff: hacen falta dos versiones y hay ${enDisco.length} en ` +
          `${rutaLegible(VERSIONES_DIR)}. Cada \`npm run suite\` versiona su scorecard; ` +
          "el diff existe a partir de la segunda.",
      );
      return 0;
    }
    a = enDisco[enDisco.length - 2]!;
    b = enDisco[enDisco.length - 1]!;
  } else if (argv.length === 2) {
    a = buscar(argv[0]!);
    b = buscar(argv[1]!);
  } else {
    console.error("Uso: npm run diff-versiones [<a> <b>]");
    console.error("  Sin argumentos: las dos versiones más recientes de reports/versiones/.");
    return 2;
  }

  avisarSiLocal(a.version, "A");
  avisarSiLocal(b.version, "B");

  const diff: DiffDeVersiones = diffDeVersiones(a.version, b.version);
  console.error(
    `Diff A (${rutaLegible(a.path)}) → B (${rutaLegible(b.path)}): ` +
      `${diff.resumen.casos} Caso/s y ${diff.resumen.skills} Skill/s con cambio.`,
  );
  console.log(renderDiff(diff));
  return 0;
}

process.exitCode = main(process.argv.slice(2));
