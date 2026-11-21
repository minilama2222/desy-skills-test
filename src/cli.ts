import { bumpPin, currentRepo, realGit, PIN_PATH } from "./bump.js";
import { ANCHO_CAPTURA, asegurarCaptura, capturarConAgentBrowser } from "./captura-gold.js";
import { CASOS_DIR, cargarCaso, cargarCasos } from "./caso-loader.js";
import type { AnclaDeSkill, Assert, Caso, Check, ContradiccionDeSkill, TipoCaso } from "./caso.js";
import { cuentaComoEntrega, ejecutarCaso, type ResultadoEjecucion } from "./ejecutar.js";
import { grado } from "./grader.js";
import { problemasDeArbolLocalSucio, problemasDeVendorSucio } from "./guardarrail-pin.js";
import type { ContextoDelCaso } from "./informe.js";
import { renderInformeCaso } from "./informe.js";
import type { Pin } from "./pin.js";
import { LOCAL, pinLocal, readPin, rutaEnElRepo } from "./pin.js";
import { duracionLegible, restoEstimadoMs } from "./progreso.js";
import {
  escribirInformes,
  escribirScorecard,
  escribirVersion,
  guardarEjecucion,
  leerEjecuciones,
  REPORTS_DIR,
  rutasDeReporte,
  rutaRelativa,
  vaciarEjecuciones,
  VERSIONES_DIR,
} from "./reportes.js";
import { REPO_ROOT } from "./repo.js";
import {
  createSandbox,
  realCommand,
  SCAFFOLD_CACHE_DIR,
  skillsDirDeConfig,
  VENDOR_SKILLS_DIR,
  type RunDeps,
} from "./runner.js";
import { agregarScorecard, etiquetaDelPin, renderScorecard, type Scorecard } from "./scorecard.js";
import { lectorDeSecciones } from "./seccion-skill.js";
import {
  exitCodeDe,
  limiteDeIntentos,
  N_POR_DEFECTO,
  resumen,
  seleccionarCasos,
  type Seleccion,
} from "./suite.js";
import { agregarCorrida, scorecardDeVersion, serializarVersion, validarVersion } from "./versiones.js";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
function usage(): never {
  console.error(
    [
      "Uso: cli <comando> [args]",
      "",
      "Comandos:",
      "  suite [--skill <skill>] [--case <caso>] [--n <N>] [--tope <T>] [--reports <dir>] [--skills-local <ruta>]",
      "      Corre la suite entera (o el subconjunto) por el SUT hasta tener N entregas",
      "      por Caso o agotar T intentos (por defecto T = N * 2), emite JSON + Scorecard",
      "      y sale con código ≠ 0 si algún Caso SUSPENDE.",
      "  run --skill <skill> --case <caso> [--n <N>] [--tope <T>] [--skills-local <ruta>]  Ejecuta un Caso por el SUT y emite Evidencia + Grade.",
      "      --skills-local <ruta>: mide los skills de un checkout local (declarado como",
      "      `local (sin commit)`) en vez de los de vendor/. Nunca escribe en vendor/.",
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
 * La carpeta de un Caso del árbol canónico, si sigue ahí. El informe por Caso se
 * puede pedir sobre Ejecuciones que nombran un Caso ya movido o borrado: entonces
 * no hay prompt ni anclas, y el informe lo dice en vez de fallar entero.
 */
function carpetaDeCaso(skill: string, caso: string): string | undefined {
  try {
    return localizarCaso(skill, caso);
  } catch {
    return undefined;
  }
}

/**
 * Dónde viven los skills de los que el informe citará secciones (ticket 06).
 * Sale del **Pin** de la corrida, no del estado de hoy:
 *
 * - Pin remoto: el `vendor/` versionado, que es lo que la corrida copió.
 * - Pin local: `<repo del Pin>/skills`, donde `repo` lleva la ruta del checkout
 *   (relativa al repo o absoluta; `pinLocal` la pone ahí). Un árbol local puede
 *   estar borrado —el informe tardío no debe morir por eso—: si no existe, no hay
 *   árbol y el informe dice que no pudo leer la sección.
 */
function arbolDeSkillsDe(ejecuciones: ResultadoEjecucion[]): string | undefined {
  const declarada = ejecuciones[0];
  if (declarada === undefined) return undefined;
  if (declarada.pin !== LOCAL) return VENDOR_SKILLS_DIR;
  const ruta = declarada.pinRepo;
  if (ruta === undefined) return undefined;
  const skills = join(resolve(REPO_ROOT, ruta), "skills");
  return existsSync(skills) ? skills : undefined;
}

/**
 * Las contradicciones que los Casos declaran en su `rubric.md`, por `<skill>/<caso>`
 * (ticket 13). Salen de `casos/`, no de las Ejecuciones: son cosa de la rúbrica, y
 * un Caso que no está en el árbol no tiene nada que declarar. El Scorecard sólo las
 * destaca y el informe las lee; ninguno decide skill-vs-check con ellas.
 */
function contradiccionesPorCaso(
  ejecuciones: ResultadoEjecucion[],
): Map<string, Map<string, ContradiccionDeSkill>> {
  const porCaso = new Map<string, Map<string, ContradiccionDeSkill>>();
  for (const ejecucion of ejecuciones) {
    const clave = `${ejecucion.skill}/${ejecucion.caso}`;
    if (porCaso.has(clave)) continue;
    const contradicciones = contradiccionesDeCaso(ejecucion.skill, ejecucion.caso);
    if (contradicciones !== undefined) porCaso.set(clave, contradicciones);
  }
  return porCaso;
}

/** Las contradicciones declaradas de un Caso del árbol; nada si no carga o no hay. */
function contradiccionesDeCaso(
  skill: string,
  caso: string,
): Map<string, ContradiccionDeSkill> | undefined {
  const carpeta = carpetaDeCaso(skill, caso);
  if (carpeta === undefined) return undefined;
  try {
    return cargarCaso(carpeta).contradicciones;
  } catch {
    // Ya lo caza `verificar-casos`: el reporte no repite sus rojos.
    return undefined;
  }
}

/**
 * Lo que el informe necesita de cada Caso: su prompt, sus anclas y el lector de
 * secciones. Un Caso ausente del árbol no rompe el informe: se presenta con lo
 * que la Ejecución trae (`DetalleCheck.ancla`, `assert`) y el prompt se marca
 * como no disponible.
 */
function contextosPorCaso(
  ejecuciones: ResultadoEjecucion[],
  arbol: string | undefined,
): Map<string, ContextoDelCaso> {
  const contextos = new Map<string, ContextoDelCaso>();
  const leerSeccion = arbol === undefined ? undefined : lectorDeSecciones(arbol);
  for (const ejecucion of ejecuciones) {
    const clave = `${ejecucion.skill}/${ejecucion.caso}`;
    if (contextos.has(clave)) continue;
    const carpeta = carpetaDeCaso(ejecucion.skill, ejecucion.caso);
    let prompt: string | undefined;
    let anclas: Map<string, AnclaDeSkill> | undefined;
    let contradicciones: Map<string, ContradiccionDeSkill> | undefined;
    if (carpeta !== undefined) {
      try {
        const caso = cargarCaso(carpeta);
        prompt = caso.prompt;
        anclas = new Map(
          caso.checks.flatMap((check) =>
            check.ancla === undefined ? [] : [[check.id, check.ancla] as const],
          ),
        );
        contradicciones = caso.contradicciones;
      } catch {
        // Un Caso que no carga ya lo caza `verificar-casos`; el informe no es el
        // sitio para repetirlo, así que se presenta lo que la Ejecución trae.
      }
    }
    contextos.set(clave, {
      caso: ejecucion.caso,
      ...(prompt === undefined ? {} : { prompt }),
      ...(anclas === undefined || anclas.size === 0 ? {} : { anclas }),
      ...(contradicciones === undefined ? {} : { contradicciones }),
      ...(leerSeccion === undefined ? {} : { leerSeccion }),
    });
  }
  return contextos;
}

/**
 * Escribe el informe legible de cada Caso bajo `<reports>/informe/<skill>/<caso>.md`
 * y dice por stderr dónde quedó. Es el documento que el ticket 06 pide: con él y
 * sin el resto del harness se decide si tocar el skill o el check.
 */
function escribirInformesPorCaso(
  ejecuciones: ResultadoEjecucion[],
  rutas: { informes: string },
): string[] {
  const porCaso = new Map<string, ResultadoEjecucion[]>();
  for (const ejecucion of ejecuciones) {
    const clave = `${ejecucion.skill}/${ejecucion.caso}`;
    const grupo = porCaso.get(clave);
    if (grupo === undefined) porCaso.set(clave, [ejecucion]);
    else grupo.push(ejecucion);
  }

  const contextos = contextosPorCaso(ejecuciones, arbolDeSkillsDe(ejecuciones));
  const informes = [...porCaso].map(([clave, delCaso]) => {
    const primero = delCaso[0]!;
    const contexto = contextos.get(clave)!;
    return {
      skill: primero.skill,
      caso: primero.caso,
      markdown: renderInformeCaso(delCaso, contexto) + "\n",
    };
  });
  const escritos = escribirInformes(rutas.informes, informes);
  for (const path of escritos) console.error(`Informe: ${rutaRelativa(path)}`);
  return escritos;
}

/**
 * Las **entregas** que se buscan por Caso (`--n`), que es la N de la política del
 * ADR-0007 desde el ADR-0014: el presupuesto es de entregas, no de intentos
 * (ticket 03). Sin `--n`, `run` busca una sola entrega (inspección rápida); sin
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
 * El tope duro de intentos (`--tope`, ticket 03). Sin él, el doble de `--n`.
 * Declararlo por debajo de `n` es un error de uso: no se pueden tener `n`
 * entregas en menos de `n` intentos.
 */
/**
 * El presupuesto que declaró la línea de órdenes: `--n` entregas y, si viene,
 * `--tope` intentos. Lo comparten `run` y `suite`; `tope` se omite (no se pasa en
 * `undefined`) para que el defecto lo decida `limiteDeIntentos`, no este lector.
 */
export function presupuestoDe(
  args: string[],
  nPorDefecto: number,
): { n: number; tope?: number } {
  const n = leerN(args, nPorDefecto);
  const tope = leerTope(args, n);
  return tope === undefined ? { n } : { n, tope };
}

function leerTope(args: string[], n: number): number | undefined {
  const valor = opcion(args, "--tope");
  if (valor === undefined) return undefined;
  const tope = Number(valor);
  if (!Number.isInteger(tope) || tope < n) {
    throw new Error(`--tope inválido: "${valor}" (se esperaba un entero ≥ ${n})`);
  }
  return tope;
}

/**
 * El sandbox del SUT. Se crea con el `HOME` y la config que resuelve el propio
 * `createSandbox`; lo único que se añade es el árbol de trabajo: el starter
 * cacheado, para que cada Ejecución no scaffoldee sin permiso (ADR-0005), o el
 * `input/fixture/` del Caso cuando su premisa no es el starter (ticket 36).
 */
function sandboxDelCaso(caso: Caso): ReturnType<typeof createSandbox> {
  if (caso.fixtureDir !== undefined) {
    return createSandbox({ fixtureDir: caso.fixtureDir });
  }
  return createSandbox(existsSync(SCAFFOLD_CACHE_DIR) ? { scaffoldDir: SCAFFOLD_CACHE_DIR } : {});
}

/**
 * El Pin de una corrida, y los hallazgos que impiden medir con él (ticket 05).
 *
 * - **Sin `--skills-local`**: el Pin canónico de `pin.json` y los skills de
 *   `vendor/`. Si el árbol de `vendor/desy-skills/` tiene cambios sin commitear,
 *   no se mide (ticket 04).
 * - **Con `--skills-local <ruta>`**: un Pin local que declara `local (sin commit)`
 *   y copia los skills de `<ruta>/skills/`. El mismo guardarraíl, sobre ese árbol.
 *
 * En ningún caso se escribe en `vendor/`: `bump-pin` es el único comando que lo
 * toca, y con él se explicitan los cambios.
 */
function resolverPin(args: string[]): { pin: Pin; hallazgos: string[] } {
  const local = opcion(args, "--skills-local");
  const fecha = new Date().toISOString().slice(0, 10);
  if (local === undefined) {
    const hallazgos = problemasDeVendorSucio(join(REPO_ROOT, "vendor", "desy-skills"));
    return { pin: readPin(PIN_PATH), hallazgos };
  }
  const checkout = resolve(local);
  const hallazgos = problemasDeArbolLocalSucio(checkout);
  return {
    pin: pinLocal(rutaEnElRepo(REPO_ROOT, checkout), fecha),
    hallazgos,
  };
}

/** Lo que el bucle anuncia antes de cada intento (ticket 03). */
export interface ProgresoDelCaso {
  /** El intento que empieza, contando desde 1. */
  intento: number;
  /** Los intentos que como mucho se harán: el tope duro, no `n`. */
  tope: number;
  /** Las entregas que faltan al empezar ese intento. */
  faltan: number;
}

export interface OpcionesDelPresupuesto {
  /** Entregas que se buscan (`--n`). */
  n: number;
  /** Tope duro de intentos; por defecto, `limiteDeIntentos(n)`. */
  tope?: number;
  /** Los dos dobles del SUT; por defecto, el sandbox real y `opencode`. */
  deps?: RunDeps;
  anunciar?: (progreso: ProgresoDelCaso) => void;
  alGuardar?: (resultado: ResultadoEjecucion) => void;
}

/**
 * Corre un Caso bajo el **presupuesto de entregas** del ADR-0014 (ticket 03):
 * se intenta hasta tener `n` entregas o agotar `tope` intentos, lo que antes
 * llegue. Una Ejecución sin Artefacto consume intento y no entrega, así que una
 * tasa de entrega baja cuesta más sandbox y modelo — hasta el tope, que es lo que
 * impide que un SUT que nunca entrega se coma el presupuesto sin fin.
 *
 * Se exporta y recibe sus dependencias para probar el bucle con dobles (el SUT es
 * un proceso externo): el camino que recorre es el real —sandbox, copia, grader,
 * entrega—, y lo que cambia es quién decide cada entrega.
 */
export async function correrCaso(
  caso: Caso,
  pin: Pin,
  opciones: OpcionesDelPresupuesto,
): Promise<ResultadoEjecucion[]> {
  const tope = limiteDeIntentos(opciones.n, opciones.tope);
  const deps = opciones.deps ?? {
    sandbox: { create: () => sandboxDelCaso(caso) },
    command: realCommand,
  };
  const resultados: ResultadoEjecucion[] = [];
  let entregas = 0;
  for (let intento = 1; intento <= tope && entregas < opciones.n; intento++) {
    opciones.anunciar?.({ intento, tope, faltan: opciones.n - entregas });
    const resultado = await ejecutarCaso(caso, pin, deps);
    resultados.push(resultado);
    // La misma cuenta que decide el veredicto (`cuentaComoEntrega`): una entrega
    // sin invocar el skill no cierra el presupuesto (ticket 03).
    if (cuentaComoEntrega(resultado)) entregas += 1;
    opciones.alGuardar?.(resultado);
  }
  return resultados;
}

/**
 * Persiste una Ejecución y **deja dicha en ella su ruta** (ticket 07): el
 * scorecard puede así remitir a la Evidencia de un hallazgo de trigger, en vez de
 * nombrar el hallazgo sin decir dónde se lee. Se escribe una segunda vez con la
 * ruta ya puesta —la ruta es la del fichero que acaba de crearse—, porque la
 * Ejecución tiene que llevar en sí misma lo que el scorecard va a citar.
 */
function guardarConSuEvidencia(dir: string, resultado: ResultadoEjecucion): string {
  const path = guardarEjecucion(dir, resultado);
  resultado.evidencia = rutaRelativa(path);
  writeFileSync(path, JSON.stringify(resultado, null, 2) + "\n", "utf8");
  return path;
}

async function runCasos(args: string[]): Promise<number> {
  const skill = opcion(args, "--skill");
  const id = opcion(args, "--case");
  if (!skill || !id) usage();

  const caso = cargarCaso(localizarCaso(skill!, id!));
  const { pin, hallazgos } = resolverPin(args);
  if (hallazgos.length > 0) {
    for (const h of hallazgos) console.error(h);
    return 1;
  }
  const resultados = await correrCaso(caso, pin, {
    ...presupuestoDe(args, 1),
    alGuardar: (resultado) => {
      const guardado = guardarConSuEvidencia(rutasDeReporte(REPORTS_DIR).ejecuciones, resultado);
      console.error(`Ejecución guardada: ${rutaRelativa(guardado)}`);
    },
  });
  console.log(JSON.stringify(resultados.length === 1 ? resultados[0] : resultados, null, 2));
  return 0;
}

/**
 * Versiona el scorecard de la corrida (ticket 09): escribe
 * `reports/versiones/<arbolHash>.json` y devuelve su ruta, o `undefined` si la
 * corrida no declara `arbolHash` —un árbol de Ejecuciones anterior al ticket 04—
 * porque entonces no hay versión que nombrar (`scorecardDeVersion` lo rechaza).
 *
 * Una suite sobre un contenido ya medido **no borra** la medida anterior: es la
 * misma versión, así que las cuentas nuevas sustituyen a las viejas en `skills`
 * pero la corrida vieja queda en `corridas` (ticket 23). Sin ese historial, dos
 * corridas seguidas del mismo árbol dejaban una sola y el criterio de refinado
 * del ADR-0014 no tenía de dónde leer. No se versiona en el directorio de la
 * suite, sino en uno fijo del repo: el diff busca por hash, no por la ruta.
 */
function escribirVersionDeLaCorrida(scorecard: Scorecard): string | undefined {
  if (scorecard.arbolHash === undefined) {
    console.error(
      "Sin arbolHash en el Scorecard: la corrida no se versiona (no hay versión que nombrar).",
    );
    return undefined;
  }
  const version = scorecardDeVersion(scorecard);
  const rutaVersion = join(VERSIONES_DIR, `${version.arbolHash}.json`);
  const anterior = existsSync(rutaVersion)
    ? validarVersion(JSON.parse(readFileSync(rutaVersion, "utf8")) as unknown)
    : undefined;
  const conHistorial = agregarCorrida(anterior, version, new Date().toISOString());
  const path = escribirVersion(
    VERSIONES_DIR,
    conHistorial.arbolHash,
    serializarVersion(conHistorial),
  );
  console.error(`Versión: ${rutaRelativa(path)}`);
  return path;
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
    ...presupuestoDe(args, N_POR_DEFECTO),
  };
  const reportsDir = resolve(opcion(args, "--reports") ?? join("reports", "suite"));
  const rutas = rutasDeReporte(reportsDir);

  const casos = seleccionarCasos(cargarCasos(CASOS_DIR), seleccion);
  // Antes de vaciar reportes o gastar una sola corrida: si el árbol que se va a
  // medir tiene cambios sin commitear, el informe diría una versión que no es
  // (ticket 04, y lo mismo para un checkout local en el 05).
  const { pin, hallazgos } = resolverPin(args);
  if (hallazgos.length > 0) {
    for (const h of hallazgos) console.error(h);
    return 1;
  }

  vaciarEjecuciones(rutas.ejecuciones);

  const ejecuciones: ResultadoEjecucion[] = [];
  // Señal de progreso (ticket 20): sin esto, una suite de 14 Casos pasa media
  // hora sin decir por dónde va. Todo va por **stderr**, como el resto del
  // progreso: stdout lleva el Scorecard y tiene que poder redirigirse a un fichero.
  const inicioSuite = Date.now();
  const totalCasos = casos.length;
  let casosHechos = 0;

  for (const [indice, caso] of casos.entries()) {
    const etiqueta = `${caso.skill}/${caso.id}`;
    const inicioCaso = Date.now();
    const transcurrido = inicioCaso - inicioSuite;
    const resto = restoEstimadoMs(transcurrido, casosHechos, totalCasos);
    console.error(
      `[${indice + 1}/${totalCasos}] ${etiqueta} — empezando · transcurrido ` +
        duracionLegible(transcurrido) +
        (resto === undefined ? "" : ` · quedan ~${duracionLegible(resto)}`),
    );

    // Se guarda al terminar cada Ejecución, no al acabar el Caso: una suite
    // interrumpida a mitad conserva la Evidencia de las que sí terminaron, y el
    // hallazgo de trigger que se hubiera detectado no se pierde (ticket 07).
    await correrCaso(caso, pin, {
      n: seleccion.n,
      ...(seleccion.tope === undefined ? {} : { tope: seleccion.tope }),
      // El progreso se cuenta en entregas, no en intentos (ticket 03): «faltan 2
      // entregas» dice lo que el presupuesto busca; «intento 1/6» dice a cuánto
      // está del tope, y las dos cosas cambian cuando el SUT no entrega.
      anunciar: ({ intento, tope, faltan }) =>
        console.error(
          `[${etiqueta}] Intento ${intento}/${tope} — faltan ${faltan} entrega/s` +
            ` · lleva ${duracionLegible(Date.now() - inicioSuite)}`,
        ),
      alGuardar: (resultado) => {
        guardarConSuEvidencia(rutas.ejecuciones, resultado);
        ejecuciones.push(resultado);
      },
    });

    casosHechos += 1;
    const transcurridoTrasCaso = Date.now() - inicioSuite;
    const restoTrasCaso = restoEstimadoMs(transcurridoTrasCaso, casosHechos, totalCasos);
    console.error(
      `[${indice + 1}/${totalCasos}] ${etiqueta} — hecho en ` +
        duracionLegible(Date.now() - inicioCaso) +
        (restoTrasCaso === undefined
          ? ""
          : ` · quedan ~${duracionLegible(restoTrasCaso)}`),
    );
  }

  const scorecard = agregarScorecard(
    ejecuciones,
    pin,
    hashComun(ejecuciones),
    contradiccionesPorCaso(ejecuciones),
  );
  const markdown = renderScorecard(scorecard) + "\n";
  escribirScorecard(JSON.stringify(scorecard, null, 2) + "\n", markdown, rutas);
  escribirInformesPorCaso(ejecuciones, rutas);
  const version = escribirVersionDeLaCorrida(scorecard);

  const r = resumen(scorecard, ejecuciones);
  console.error(
    `Suite: ${r.casos} Caso/s (${r.intentos} intento/s, ${r.entregas} entrega/s) sobre Pin ${etiquetaDelPin(scorecard.pin)} → ` +
      `PASA ${r.pasados} · SUSPENDE ${r.suspendidos} · INDETERMINADO ${r.indeterminados}`,
  );
  // Cuánto duró la suite (ticket 20): antes había que cronometrarla a mano, y es
  // el dato con el que se juzga si la próxima corrida ha ido mejor.
  console.error(`Duración: ${duracionLegible(Date.now() - inicioSuite)}`);
  console.error(`JSON: ${rutaRelativa(rutas.scorecardJson)}`);
  if (version !== undefined) {
    console.error(`Versión: ${rutaRelativa(version)}`);
  }
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
 * El hash de árbol de una corrida. Todas las Ejecuciones de una suite copian el
 * mismo árbol, así que basta con el primero que lo declare. Si ninguna lo hace (un
 * árbol de Ejecuciones anterior al ticket 04, o mezclado a mano) el scorecard no
 * declara hash: inventar `HASH_DESCONOCIDO` lo haría parecer una identidad cuando
 * es la ausencia de una.
 */
function hashComun(ejecuciones: ResultadoEjecucion[]): string | undefined {
  return ejecuciones.find((e) => e.arbolHash.length > 0)?.arbolHash;
}

/**
 * El Pin de un árbol de Ejecuciones, **tal como lo declaran ellas**. Lo declara
 * cada una, y una suite las escribe con el mismo; pero un árbol puede mezclar
 * corridas —las de `run`, por ejemplo—, y entonces el informe no puede decir el
 * Pin de la primera como si fuera el de todas: si hay más de uno, se declara
 * `mixto`, con la fecha del más reciente y sin `ref`.
 *
 * `pin` es un único campo (el commit), y una corrida local escribe ahí `LOCAL`
 * —no un SHA a propósito—, así que eso es lo que distingue los dos casos.
 *
 * La fecha sale de la Ejecución y no de `pin.json`, que daría la de hoy: el
 * scorecard la declara como la del Pin medido. Sin Ejecuciones no hay nada que
 * etiquetar.
 */
export const PIN_MIXTO = "mixto";

function pinDeLasEjecuciones(ejecuciones: ResultadoEjecucion[]): Pin {
  const declarado = ejecuciones[0];
  if (declarado === undefined) throw new Error("No hay Ejecuciones que agregar.");
  const distintas = new Set(ejecuciones.map((e) => `${e.pin}\n${e.fecha}`));
  if (distintas.size > 1) {
    return { ref: "", commit: PIN_MIXTO, fecha: fechaMasReciente(ejecuciones) };
  }
  if (declarado.pin === LOCAL) return pinLocal("", declarado.fecha);
  return { ref: "", commit: declarado.pin, fecha: declarado.fecha };
}

/** La fecha más reciente (`AAAAMMDD` ordena igual que la fecha) de las Ejecuciones. */
function fechaMasReciente(ejecuciones: ResultadoEjecucion[]): string {
  return ejecuciones
    .map((e) => e.fecha)
    .reduce((ultima, fecha) => (fecha > ultima ? fecha : ultima));
}

/**
 * Comprueba que la Evidencia que cita una Ejecución **existe donde se reporta**.
 *
 * Se escribió donde se corrió (`reports/<árbol>/ejecuciones/…`), así que su ruta
 * es relativa al repo. Reportar una copia del árbol deja rutas que ya no existen,
 * y el informe no puede decir «ver en X» y que X falte. La comprobación se hace
 * **aquí**, en el adaptador, no en el agregador: es una pregunta al disco.
 *
 * Devuelve copias, no muta: la Ejecución que se leyó sigue diciendo dónde se
 * guardó, aunque el árbol que se reporta sea otro.
 */
function conEvidenciaExistente(
  ejecuciones: ResultadoEjecucion[],
): ResultadoEjecucion[] {
  return ejecuciones.map((ejecucion) => {
    const ruta = ejecucion.evidencia;
    if (ruta === undefined) return ejecucion;
    if (existsSync(resolve(REPO_ROOT, ruta))) return ejecucion;
    const { evidencia: _fuera, ...sinRuta } = ejecucion;
    return sinRuta;
  });
}

/**
 * El reporte: agrega las Ejecuciones persistidas en el Scorecard (JSON, fuente de
 * verdad) y lo renderiza a markdown legible. El JSON se escribe siempre —es lo
 * que consume CI— y la ruta se anuncia por stderr para no ensuciar la salida
 * estándar, que es el Scorecard. `--reports` apunta a una corrida de otra
 * herramienta; por defecto, al árbol de las corridas sueltas de `run`.
 *
 * El Pin sale de las **Ejecuciones**, no de `pin.json` del momento: re-etiquetar
 * con el Pin de hoy una corrida que se midió con otro es la mentira que el ticket
 * 04 quitó, y con un Pin local (ticket 05) no hay commit del que sacarlo. Sólo se
 * cae en `pin.json` cuando las Ejecuciones no declaran ninguno.
 */
function runReport(args: string[]): void {
  const reports = opcion(args, "--reports");
  const rutas = rutasDeReporte(reports === undefined ? REPORTS_DIR : resolve(reports));

  const ejecuciones = conEvidenciaExistente(leerEjecuciones(rutas.ejecuciones));
  const pin = pinDeLasEjecuciones(ejecuciones);
  const scorecard = agregarScorecard(
    ejecuciones,
    pin,
    hashComun(ejecuciones),
    contradiccionesPorCaso(ejecuciones),
  );
  const markdown = renderScorecard(scorecard) + "\n";

  escribirScorecard(JSON.stringify(scorecard, null, 2) + "\n", markdown, rutas);
  escribirInformesPorCaso(ejecuciones, rutas);

  // Un árbol sin Pin único lo dice antes de la tabla: un scorecard «mixto» no es
  // una versión, y quien lo lea no puede compararlo con otra sin saberlo.
  if (pin.commit === PIN_MIXTO) {
    console.error(
      `Aviso: las Ejecuciones de ${rutaRelativa(rutas.ejecuciones)} no declaran un Pin único ` +
        `(${[...new Set(ejecuciones.map((e) => `${e.pin} (${e.fecha})`))].join(", ")}).`,
    );
  }
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
      return runCasos(rest);
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

/**
 * ¿Este módulo es el proceso que se ejecutó? Con `tsx src/cli.ts …` sí; importado
 * desde un test, no. Sin esta guarda, importar `correrCaso` o `presupuestoDe`
 * desde `test/` lanzaba `main()` en el contexto del test —con los argumentos de
 * `vitest`, que no son un subcomando—: imprimía el uso y llamaba a `process.exit(2)`.
 * `vitest` lo atrapaba, pero el gate escupía quince líneas de «Uso: cli» en cada
 * pre-commit y enseñaba a ignorar stderr en el único momento en que importa
 * (retro de la sesión del ticket 12).
 */
const esElProceso =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (esElProceso) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    },
  );
}
