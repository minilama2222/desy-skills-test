import { bumpPin, currentRepo, realGit, PIN_PATH } from "./bump.js";
import { ANCHO_CAPTURA, asegurarCaptura, capturarConAgentBrowser } from "./captura-gold.js";
import { CASOS_DIR, cargarCaso, cargarCasos } from "./caso-loader.js";
import type { Assert, Check, TipoCaso } from "./caso.js";
import { ejecutarCaso, type ResultadoEjecucion } from "./ejecutar.js";
import { grado } from "./grader.js";
import { readPin } from "./pin.js";
import {
  escribirScorecard,
  guardarEjecucion,
  leerEjecuciones,
  REPORTS_DIR,
  rutasDeReporte,
  rutaRelativa,
  vaciarEjecuciones,
} from "./reportes.js";
import { createSandbox, realCommand, SCAFFOLD_CACHE_DIR } from "./runner.js";
import { agregarScorecard, renderScorecard } from "./scorecard.js";
import {
  exitCodeDe,
  N_POR_DEFECTO,
  resumen,
  seleccionarCasos,
  type Seleccion,
} from "./suite.js";
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
function usage(): never {
  console.error(
    [
      "Uso: cli <comando> [args]",
      "",
      "Comandos:",
      "  suite [--skill <skill>] [--case <caso>] [--n <N>] [--reports <dir>]",
      "      Corre la suite entera (o el subconjunto) por el SUT, N Ejecuciones por",
      "      Caso, emite JSON + Scorecard y sale con código ≠ 0 si algún Caso SUSPENDE.",
      "  run --skill <skill> --case <caso> [--n <N>]  Ejecuta un Caso por el SUT y emite Evidencia + Grade.",
      "  grade <id> <severity> <assert> [weight]  Puntúa un Check sobre Evidencia vacía.",
      "  load <ruta>  Carga un Caso desde su carpeta y muestra su JSON.",
      "  capturar-gold --skill <skill> --case <caso>  Genera/valida la Captura de Gold (Gold-imagen) del Caso-página.",
      "  report [--reports <dir>]  Agrega las Ejecuciones en JSON y renderiza el Scorecard.",
      "  bump-pin <ref>  Actualiza vendor/ + pin.json al ref dado (rama, tag o SHA).",
    ].join("\n"),
  );
  process.exit(2);
}

function runBumpPin(ref: string): void {
  if (!ref) usage();
  const fecha = new Date().toISOString().slice(0, 10);
  const pin = bumpPin(realGit, { ref, url: currentRepo(), fecha });
  console.log(`Pin actualizado: ${pin.ref} @ ${pin.commit} (${pin.fecha})`);
}

function opcion(args: string[], nombre: string): string | undefined {
  const i = args.indexOf(nombre);
  if (i === -1) return undefined;
  return args[i + 1];
}

/** Localiza la carpeta del Caso dentro de CASOS_DIR: <skill>/<tipo>/<id>. */
function localizarCaso(skill: string, id: string): string {
  const skillDir = join(CASOS_DIR, skill);
  if (!existsSync(skillDir)) {
    throw new Error(`No existe el skill "${skill}" en el árbol de Casos (${skillDir})`);
  }
  for (const tipo of readdirSync(skillDir, { withFileTypes: true })) {
    if (!tipo.isDirectory()) continue;
    const candidato = join(skillDir, tipo.name, id);
    if (existsSync(candidato)) return candidato;
  }
  throw new Error(
    `No se encontró el Caso "${id}" para el skill "${skill}" bajo ${skillDir}`,
  );
}

/**
 * El número de Ejecuciones por Caso (`--n`), que es la N de la política del
 * ADR-0007. Sin `--n`, `run` hace una sola Ejecución (inspección rápida); sin
 * `--n`, `suite` usa `N_POR_DEFECTO`, porque ahí el veredicto se decide sobre las N.
 */
function leerN(args: string[], porDefecto: number): number {
  const valor = opcion(args, "--n");
  if (valor === undefined) return porDefecto;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`--n inválido: "${valor}" (se esperaba un entero ≥ 1)`);
  }
  return n;
}

/**
 * Corre un Caso N veces por el SUT (cada Ejecución en su sandbox) y devuelve los
 * resultados. Es lo que comparten `run` (N=1 por defecto) y `suite` (N=3): el
 * sandbox y el comando real se resuelven aquí, una sola vez.
 */
async function correrCaso(
  caso: ReturnType<typeof cargarCaso>,
  pin: ReturnType<typeof readPin>,
  n: number,
  anunciar?: (ejecucion: number) => void,
): Promise<ResultadoEjecucion[]> {
  const resultados: ResultadoEjecucion[] = [];
  for (let i = 1; i <= n; i++) {
    anunciar?.(i);
    resultados.push(
      await ejecutarCaso(caso, pin, {
        sandbox: {
          create: () =>
            createSandbox(
              existsSync(SCAFFOLD_CACHE_DIR) ? { scaffoldDir: SCAFFOLD_CACHE_DIR } : {},
            ),
        },
        command: realCommand,
      }),
    );
  }
  return resultados;
}

async function runCasos(args: string[]): Promise<void> {
  const skill = opcion(args, "--skill");
  const id = opcion(args, "--case");
  if (!skill || !id) usage();

  const caso = cargarCaso(localizarCaso(skill!, id!));
  const pin = readPin(PIN_PATH);
  const resultados = await correrCaso(caso, pin, leerN(args, 1));
  for (const resultado of resultados) {
    const guardado = guardarEjecucion(rutasDeReporte(REPORTS_DIR).ejecuciones, resultado);
    console.error(`Ejecución guardada: ${rutaRelativa(guardado)}`);
  }
  console.log(JSON.stringify(resultados.length === 1 ? resultados[0] : resultados, null, 2));
}

/**
 * La suite entera como comando de CI (ticket 13): corre todos los Casos —o el
 * subconjunto por skill / por Caso— N veces cada uno, agrega el Scorecard
 * (ADR-0007), escribe JSON + markdown y sale con código ≠ 0 si algún Caso
 * SUSPENDE. El JSON lleva siempre el Pin testeado, de modo que un reporte de CI
 * se puede situar en la versión de los skills que evaluó.
 *
 * Escribe en `--reports` (por defecto `reports/suite`), no en el árbol de las
 * corridas sueltas: el veredicto de la suite no debe mezclar Ejecuciones de otra
 * fecha. La ruta del JSON va por stderr y el Scorecard legible por stdout.
 */
async function runSuite(args: string[]): Promise<number> {
  const seleccion: Seleccion = {
    ...(opcion(args, "--skill") === undefined ? {} : { skill: opcion(args, "--skill")! }),
    ...(opcion(args, "--case") === undefined ? {} : { caso: opcion(args, "--case")! }),
    n: leerN(args, N_POR_DEFECTO),
  };
  const reportsDir = resolve(opcion(args, "--reports") ?? join("reports", "suite"));
  const rutas = rutasDeReporte(reportsDir);

  const casos = seleccionarCasos(cargarCasos(CASOS_DIR), seleccion);
  const pin = readPin(PIN_PATH);
  vaciarEjecuciones(rutas.ejecuciones);

  const ejecuciones: ResultadoEjecucion[] = [];
  for (const caso of casos) {
    const resultados = await correrCaso(caso, pin, seleccion.n, (i) =>
      console.error(`[${caso.skill}/${caso.id}] Ejecución ${i}/${seleccion.n}…`),
    );
    for (const resultado of resultados) {
      guardarEjecucion(rutas.ejecuciones, resultado);
      ejecuciones.push(resultado);
    }
  }

  const scorecard = agregarScorecard(ejecuciones, pin);
  const markdown = renderScorecard(scorecard) + "\n";
  escribirScorecard(JSON.stringify(scorecard, null, 2) + "\n", markdown, rutas);

  const r = resumen(scorecard, ejecuciones);
  console.error(
    `Suite: ${r.casos} Caso/s (${r.ejecuciones} Ejecución/es) sobre Pin ${pin.commit} → ` +
      `PASA ${r.pasados} · SUSPENDE ${r.suspendidos} · INDETERMINADO ${r.indeterminados}`,
  );
  console.error(`JSON: ${rutaRelativa(rutas.scorecardJson)}`);
  console.log(markdown.trimEnd());

  const code = exitCodeDe(scorecard);
  if (code !== 0) {
    console.error(
      "La suite ha SUSPENDIDO algún Caso: revisa el Scorecard antes de mergear.",
    );
  } else if (r.indeterminados > 0) {
    // No bloquea (ADR-0007), pero un CI verde de un Caso donde el SUT no arrancó
    // no es un verde del skill: se dice en voz alta para que no pase por medido.
    console.error(
      `${r.indeterminados} Caso/s INDETERMINADO/s (el SUT no alcanzó el skill): ` +
        "no bloquean, pero tampoco miden el skill.",
    );
  }
  return code;
}

function parseAssertCli(clase: string): Assert {
  if (clase === "un_solo_h1" || clase === "skip_link" || clase === "fieldset_con_legend") {
    return { kind: clase };
  }
  throw new Error(`assert desconocido: ${clase}`);
}

function runGrade([id, severity, clase, ...rest]: string[]): void {
  if (!id || !severity || !clase) usage();
  if (severity !== "guard" && severity !== "quality") {
    throw new Error(`severity desconocida: ${severity}`);
  }
  const check: Check = {
    id,
    severity,
    weight: severity === "quality" ? Number(rest[0] ?? 1) : 0,
    assert: parseAssertCli(clase),
  };
  const resultado = grado(
    { artefactos: { files: {} }, transcript: { invocaciones: [] } },
    { tipo: "caso-componente" as TipoCaso, checks: [check] },
  );
  console.log(JSON.stringify(resultado, null, 2));
}

function runLoad([ruta = ""]: string[]): void {
  if (!ruta) usage();
  console.log(JSON.stringify(cargarCaso(ruta), null, 2));
}

/**
 * El reporte: agrega las Ejecuciones persistidas en el Scorecard (JSON, fuente de
 * verdad) y lo renderiza a markdown legible. El JSON se escribe siempre —es lo
 * que consume CI— y la ruta se anuncia por stderr para no ensuciar la salida
 * estándar, que es el Scorecard. `--reports` apunta a una corrida de otra
 * herramienta; por defecto, al árbol de las corridas sueltas de `run`.
 */
function runReport(args: string[]): void {
  const reports = opcion(args, "--reports");
  const rutas = rutasDeReporte(reports === undefined ? REPORTS_DIR : resolve(reports));

  const pin = readPin(PIN_PATH);
  const ejecuciones = leerEjecuciones(rutas.ejecuciones);
  const scorecard = agregarScorecard(ejecuciones, pin);
  const markdown = renderScorecard(scorecard) + "\n";

  escribirScorecard(JSON.stringify(scorecard, null, 2) + "\n", markdown, rutas);

  console.error(
    `Scorecard: ${ejecuciones.length} Ejecución/es → ` +
      `${rutaRelativa(rutas.scorecardJson)} + ${rutaRelativa(rutas.scorecardMd)}`,
  );
  console.log(markdown.trimEnd());
}

function runCapturarGold(args: string[]): void {
  const skill = opcion(args, "--skill");
  const id = opcion(args, "--case");
  if (!skill || !id) usage();

  const caso = cargarCaso(localizarCaso(skill!, id!));
  if (caso.tipo !== "caso-pagina") {
    throw new Error(
      `El Caso ${skill}/${id} es ${caso.tipo}: sólo un Caso-página lleva Captura de Gold.`,
    );
  }
  const dirGold = dirname(caso.goldPath);
  const ruta = asegurarCaptura(dirGold, {
    capturar: capturarConAgentBrowser(caso.goldPath, ANCHO_CAPTURA),
  });
  console.log(`Captura de Gold lista: ${ruta}`);
}

/**
 * Despacha el comando. Devolver una promesa con el exit code (en vez de
 * `void …`) es lo que hace que el código de salida sea realmente el del
 * proceso cuando el trabajo es asíncrono: un `run`/`suite` lanzado sin esperar
 * saldría con 0 antes de que la suite terminara, y un CI leería «verde» sin
 * ningún Grade.
 */
async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "bump-pin":
      runBumpPin(rest[0] ?? "");
      return 0;
    case "suite":
      return runSuite(rest);
    case "run":
      await runCasos(rest);
      return 0;
    case "grade":
      runGrade(rest);
      return 0;
    case "load":
      runLoad(rest);
      return 0;
    case "capturar-gold":
      runCapturarGold(rest);
      return 0;
    case "report":
      runReport(rest);
      return 0;
    default:
      usage();
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  },
);
