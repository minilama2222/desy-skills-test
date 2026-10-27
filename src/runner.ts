import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import type { Caso } from "./caso.js";
import { esCasoDecision, esCasoPagina } from "./caso.js";
import type { Pin } from "./pin.js";
import { REPO_ROOT } from "./repo.js";

export const VENDOR_SKILLS_DIR = join(REPO_ROOT, "vendor", "desy-skills", "skills");

/** Starter DESY cacheado que se pre-scaffoldea en cada sandbox (ver ADR-0005). */
export const SCAFFOLD_CACHE_DIR = join(REPO_ROOT, ".scaffold-cache", "desy-html-starter");

/**
 * Ficheros que la preparación del scaffold deja sin rastrear y que **no** son
 * contaminación. `.nvmrc` lo crea el setup del starter.
 */
const NO_RASTREADOS_ESPERADOS = new Set([".nvmrc"]);

export interface EstadoScaffold {
  /** Rutas que `git status` reporta como no rastreadas en la caché. */
  noRastreados: string[];
  /** Si existe el `dist/` de la caché. */
  existeDist: boolean;
}

/**
 * Contaminación de la caché del scaffold (ver ADR-0005): los ficheros que dejó
 * una corrida anterior y que **se colarían en la línea base de todas las
 * Ejecuciones siguientes** como si fueran parte del starter.
 *
 * Una caché limpia es exactamente lo que produce `git clone` + `npm install`:
 * el `src/` del starter intacto y **sin `dist/`** (la preparación no corre
 * `npm run build`). Dos señales:
 *
 * - **`src/`**: un fichero no rastreado que no sea de los esperados (`git status`
 *   ve el `src/` porque está versionado).
 * - **`dist/`**: que exista. El `dist/` del starter está gitignored, así que git
 *   no lo delata; pero la caché limpia no lo tiene, porque nadie compiló.
 *
 * Devuelve una descripción por problema, vacío si está limpia. Regla pura: el
 * recolector de hechos (leer git, comprobar el disco) es `estadoDelScaffold`.
 */
export function contaminacionDelScaffold(estado: EstadoScaffold): string[] {
  const problemas: string[] = [];
  for (const ruta of estado.noRastreados) {
    if (!NO_RASTREADOS_ESPERADOS.has(ruta)) {
      problemas.push(`fichero no rastreado en el src/ del starter: ${ruta}`);
    }
  }
  if (estado.existeDist) {
    problemas.push(
      "el dist/ existe: la caché limpia no compila, así que alguien lo generó en ella",
    );
  }
  return problemas;
}

/**
 * Recolecta el estado real de la caché del scaffold. Es el adaptador que alimenta
 * a la regla pura `contaminacionDelScaffold`. Lanza si no se puede leer git.
 */
export function estadoDelScaffold(scaffoldDir: string): EstadoScaffold {
  const git = spawnSync("git", ["status", "--porcelain"], {
    cwd: scaffoldDir,
    encoding: "utf8",
  });
  if (git.status !== 0) {
    throw new Error(
      `No se pudo leer el estado git de la caché del scaffold en ${scaffoldDir}: ` +
        `${git.stderr ?? git.error ?? "error desconocido"}`,
    );
  }
  const noRastreados = (git.stdout ?? "")
    .split("\n")
    .map((linea) => linea.trim())
    .filter((linea) => linea.startsWith("?? "))
    .map((linea) => linea.slice(3).replaceAll('"', "").trim());

  return { noRastreados, existeDist: existsSync(join(scaffoldDir, "dist")) };
}


export const MODELO_FIJO = "deepinfra/deepseek-ai/DeepSeek-V4.1-Flash";

export interface Artefactos {
  files: Record<string, string>;
}

export interface Transcript {
  invocaciones: string[];
}

export interface Evidencia {
  artefactos: Artefactos;
  transcript: Transcript;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export type Entorno = Record<string, string>;

export interface CommandOptions {
  cwd: string;
  env: Entorno;
}

export interface CommandRunner {
  run(args: string[], opts: CommandOptions): CommandResult;
}

export interface Sandbox {
  readonly workDir: string;
  readonly home: string;
  readonly configDir: string;
  readonly skillsDir: string;
  copySkills(): void;
  /**
   * Artefactos que el SUT produjo en `dir` (relativo al `workDir`). El directorio
   * lo decide el tipo de Caso (`dirArtefactoDeCaso`), no el sandbox.
   */
  listArtefactos(dir: string): { path: string; contenido: string }[];
  cleanup(): void;
}
export interface SandboxFactory {
  create(): Sandbox;
}

export function buildOpencodeArgs(prompt: string, imagen?: string): string[] {
  const args = ["run", "--model", MODELO_FIJO];
  // La Captura de Gold (Gold-imagen) viaja al prompt como referencia visual
  // (spec, ticket 08): `--file` la adjunta al mensaje del SUT.
  if (imagen !== undefined) args.push("--file", imagen);
  args.push(prompt);
  return args;
}

/**
 * Directorio del `workDir` que contiene el artefacto que se gradúa, según el
 * tipo de Caso. No es lo mismo para los dos tipos que sí producen ficheros (ver
 * ADR-0006):
 *
 * - **Caso-componente** → `src/`: lo que se juzga es el contrato del componente,
 *   y el contrato es la *llamada al macro*, que sólo existe en el fuente. Al
 *   compilar se expande y desaparece (las props y el nombre del macro se
 *   pierden), así que el `dist/` no sirve para medirlo.
 * - **Caso-página** → `dist/`: lo que se juzga es la página renderizada (HTML y
 *   a11y), y eso sólo existe compilado.
 * - **Caso-decisión** → `null`: no produce ficheros. Su artefacto es el texto que
 *   el SUT emitió (su decisión), que no vive en el `workDir` sino en el
 *   transcript.
 *
 * El SUT escribe el fuente en `src/` como `.html` (convención del propio skill),
 * así que el Caso-componente no necesita compilar nada.
 */
export function dirArtefactoDeCaso(tipo: Caso["tipo"]): string | null {
  if (tipo === "caso-decision") return null;
  return tipo === "caso-componente" ? "src" : "dist";
}

export interface RunDeps {
  sandbox: SandboxFactory;
  command: CommandRunner;
}

export async function runCaso(
  caso: Caso,
  pin: Pin,
  deps: RunDeps,
): Promise<Evidencia> {
  const prompt = caso.prompt.trim();
  if (!prompt) {
    throw new Error(`Caso ${caso.skill}/${caso.id} inválido: prompt vacío`);
  }

  const sandbox = deps.sandbox.create();
  try {
    sandbox.copySkills();
    const imagen = adjuntarImagenDeCaso(caso, sandbox.workDir);
    const args = buildOpencodeArgs(
      promptParaSut(prompt, imagen?.tipo, imagen?.nombre),
      imagen?.path,
    );
    const { stdout, stderr } = deps.command.run(args, {
      cwd: sandbox.workDir,
      env: { HOME: sandbox.home, XDG_CONFIG_HOME: sandbox.configDir },
    });
    const transcript = mergeTranscript(stdout, stderr);
    const dir = dirArtefactoDeCaso(caso.tipo);
    return {
      artefactos: {
        files:
          dir === null
            ? { "salida.md": transcript }
            : artefactosToFiles(sandbox.listArtefactos(dir)),
      },
      transcript: { invocaciones: parseInvocaciones(transcript) },
    };
  } finally {
    sandbox.cleanup();
  }
}

function artefactosToFiles(
  artefactos: { path: string; contenido: string }[],
): Record<string, string> {
  return Object.fromEntries(artefactos.map((a) => [a.path, a.contenido]));
}

/** Tipo de imagen de referencia que un Caso adjunta al prompt. */
type ImagenDeReferencia = "gold" | "mockup";

interface ImagenAdjunta {
  /** Ruta del PNG dentro del workDir del sandbox (lo que consume `--file`). */
  path: string;
  /** Qué representa la imagen: determina el texto del prompt, no su nombre. */
  tipo: ImagenDeReferencia;
  /** Nombre del fichero adjunto, para nombrarlo en el prompt. */
  nombre: string;
}

/**
 * Copia la imagen de referencia del Caso dentro del sandbox y describe el
 * adjunto. La imagen es la Captura de Gold de un Caso-página (`input/gold.png`)
 * o el mockup de un Caso-decisión (`input/mockup.png`); un Caso-componente no
 * lleva imagen y devuelve undefined.
 *
 * Se copia al sandbox (no se adjunta la ruta del repo) para que el adjunto sea
 * la fixture congelada del Caso y no una ruta del harness que el SUT no debería
 * ver.
 */
function adjuntarImagenDeCaso(caso: Caso, workDir: string): ImagenAdjunta | undefined {
  if (esCasoPagina(caso)) {
    if (!existsSync(caso.goldImagenPath)) {
      throw new Error(
        `Caso-página ${caso.skill}/${caso.id} sin Captura de Gold: falta ${caso.goldImagenPath}. ` +
          "Genera la fixture con `npm run capturar-gold` (ver el ticket 06).",
      );
    }
    return { path: copiarImagen(caso.goldImagenPath, workDir, "gold.png"), tipo: "gold", nombre: "gold.png" };
  }
  if (esCasoDecision(caso) && caso.mockupImagenPath !== undefined) {
    if (!existsSync(caso.mockupImagenPath)) {
      throw new Error(
        `Caso-decisión ${caso.skill}/${caso.id} sin mockup: falta ${caso.mockupImagenPath}.`,
      );
    }
    return { path: copiarImagen(caso.mockupImagenPath, workDir, "mockup.png"), tipo: "mockup", nombre: "mockup.png" };
  }
  return undefined;
}

function copiarImagen(origen: string, workDir: string, nombre: string): string {
  const destino = join(workDir, nombre);
  cpSync(origen, destino);
  return destino;
}

/**
 * El prompt que recibe el SUT. Para un Caso con imagen se le añade la referencia
 * explícita al adjunto, porque `--file` adjunta la imagen pero no la nombra: sin
 * la línea, el modelo no sabe que existe ni para qué usarla.
 */
/**
 * El prompt que recibe el SUT. Para un Caso con imagen se le añade la referencia
 * explícita al adjunto, porque `--file` adjunta la imagen pero no la nombra: sin
 * la línea, el modelo no sabe que existe ni para qué usarla. El texto depende del
 * **tipo** de imagen (Gold de una página vs mockup a reconocer), no de su nombre.
 */
function promptParaSut(
  prompt: string,
  tipo: ImagenDeReferencia | undefined,
  nombre: string | undefined,
): string {
  if (tipo === undefined || nombre === undefined) return prompt;
  const referencia =
    tipo === "mockup"
      ? `Referencia visual: te adjunto el mockup (\`${nombre}\`), la imagen de la que ` +
        "debes identificar los componentes."
      : `Referencia visual: te adjunto la captura del Gold (\`${nombre}\`), la página ` +
        "oficial a la que debe parecerse. Úsala para la fidelidad visual (anchos, " +
        "tipografía, márgenes).";
  return [prompt, "", referencia].join("\n");
}

const INVOCACION_RES = [
  // Formato real de `opencode run`: `→ Skill "desy-implement-component"`, con
  // posibles códigos ANSI alrededor y espacios de cola.
  /\u2192\s*(?:\u001b\[[0-9;]*m)?\s*Skill\s+"([^"]+)"/g,
  // Formato alternativo con prefijo de dos puntos.
  /^\u00bb\s*skill:\s*(\S+)/gm,
];

/**
 * El Flujo canónico del glosario nombra los pasos sin prefijo
 * (`preflight-check`, `implement-component`), pero opencode imprime el nombre
 * del Skill tal cual está en disco (`desy-preflight-check`). Normalizamos a la
 * forma del glosario para que el Flujo observado y el canónico sean comparables.
 */
function normalizarNombreSkill(nombre: string): string {
  return nombre.replace(/^desy-/, "");
}

function parseInvocaciones(transcript: string): string[] {
  const encontradas: { indice: number; nombre: string }[] = [];
  for (const re of INVOCACION_RES) {
    for (const match of transcript.matchAll(re)) {
      encontradas.push({ indice: match.index!, nombre: normalizarNombreSkill(match[1]!) });
    }
  }
  encontradas.sort((a, b) => a.indice - b.indice);
  return encontradas.map((e) => e.nombre);
}

function mergeTranscript(stdout: string, stderr: string): string {
  return [stdout, stderr].filter((s) => s.length > 0).join("\n").trim();
}

export const realCommand: CommandRunner = {
  run(args: string[], opts: CommandOptions): CommandResult {
    // `opencode run` emite las líneas de invocación de Skill (`→ Skill "..."`)
    // por stderr, y la prosa del modelo por stdout. Hay que capturar AMBOS: el
    // Flujo observado vive en stderr. spawnSync (no execFileSync) para poder
    // leer los dos streams a la vez.
    const resultado = spawnSync("opencode", args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      encoding: "utf8",
    });

    if (resultado.error && (resultado.error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        "No se encontró el binario `opencode`. Instálalo o usa un command runner inyectado.",
      );
    }

    return {
      stdout: resultado.stdout ?? "",
      stderr: resultado.stderr ?? (resultado.error ? String(resultado.error) : ""),
      code: resultado.status ?? 1,
    };
  },
};

export function skillsDirDeHome(home: string): string {
  return join(home, ".config", "opencode", "skills");
}

export interface SandboxOptions {
  /** Directorio donde crear el sandbox temporal. */
  base?: string;
  /**
   * Starter DESY ya scaffoldeado y cacheado que se copia al `workDir` antes de
   * lanzar el SUT. Ver ADR-0005. Si se omite, el `workDir` queda vacío.
   *
   * **Este es el coste fijo de cada Ejecución**: el starter son ~85 MB / 5.260
   * ficheros (casi todo `node_modules/`) y se copia **entero** por sandbox, porque
   * cada Ejecución necesita su propio `workDir` aislado (ADR-0001). Medido en esta
   * máquina: ~15 s con `cpSync` y ~3-6 s con `robocopy /MT` en Windows (ver
   * `copiarContenido`). No es opcional ni cacheable más allá de la caché de
   * origen: es el suelo que paga cada Caso de la suite y explica por qué `npm run
   * suite` tarda minutos y no segundos.
   */
  scaffoldDir?: string;
}

export function createSandbox(opciones: string | SandboxOptions = {}): Sandbox {
  const opts: SandboxOptions = typeof opciones === "string" ? { base: opciones } : opciones;
  const base = opts.base ?? tmpdir();
  const root = mkdtempSync(join(base, "desy-sut-"));
  const home = join(root, "home");
  const configDir = join(home, ".config", "opencode");
  const skillsDir = skillsDirDeHome(home);
  const workDir = join(root, "work");

  mkdirSync(skillsDir, { recursive: true });
  mkdirSync(workDir, { recursive: true });

  if (opts.scaffoldDir) {
    if (!existsSync(opts.scaffoldDir)) {
      throw new Error(
        `No existe el scaffold cacheado en ${opts.scaffoldDir} (ver ADR-0005)`,
      );
    }
    const problemas = contaminacionDelScaffold(estadoDelScaffold(opts.scaffoldDir));
    if (problemas.length > 0) {
      throw new Error(
        `La caché del scaffold está contaminada en ${opts.scaffoldDir}. ` +
          "Se colaría en la línea base de todas las Ejecuciones y falsearía los " +
          "artefactos (ver ADR-0005). Problemas:\n" +
          problemas.map((p) => `  - ${p}`).join("\n") +
          "\nArréglalo regenerando la caché: bórrala y corre " +
          "`powershell -File scripts/preparar-scaffold.ps1` (Windows) o " +
          "`sh scripts/preparar-scaffold.sh` (macOS/Linux).",
      );
    }
    copiarContenido(opts.scaffoldDir, workDir);
  }

  // Línea base: lo que ya traía el scaffold. Sólo cuenta como artefacto lo que
  // el SUT añade o cambia respecto a esta foto (el starter trae ~60 páginas de
  // ejemplo que no son output del Caso).
  const lineaBase = fotoDeArchivos(workDir);

  return {
    workDir,
    home,
    configDir,
    skillsDir,
    copySkills(): void {
      if (!existsSync(VENDOR_SKILLS_DIR)) {
        throw new Error(`No existe el vendor de skills en ${VENDOR_SKILLS_DIR}`);
      }
      for (const entry of readdirSync(VENDOR_SKILLS_DIR)) {
        cpSync(join(VENDOR_SKILLS_DIR, entry), join(skillsDir, entry), {
          recursive: true,
        });
      }
    },
    listArtefactos(dir: string) {
      return listarArtefactosDeSalida(workDir, lineaBase, dir);
    },
    cleanup(): void {
      borrarConReintento(root);
    },
  };
}

/**
 * Borra el sandbox, tolerando el bloqueo transitorio de Windows.
 *
 * En Windows, los procesos que el SUT dejó vivos (esbuild/node de su `npm run
 * build`) pueden retener un instante el `work` del sandbox; quitar el directorio
 * en ese hueco da `EBUSY`. Reintentar unos ms lo resuelve sin ruido. Si aun así
 * sigue bloqueado, no se tumba la Ejecución: el sandbox vive en el temporal y lo
 * limpiará el SO. El fallo de limpieza no debe ocultar la Evidencia ya recogida.
 */
function borrarConReintento(dir: string): void {
  for (let intento = 0; intento < 5; intento++) {
    try {
      rmSync(dir, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EBUSY" && code !== "EPERM" && code !== "ENOTEMPTY") throw error;
      esperar(200);
    }
  }
}

/** Espera síncrona (sin busy-wait) entre reintentos de limpieza. */
function esperar(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Copia el contenido de `origen` dentro de `destino` (no el directorio en sí).
 *
 * En Windows `cpSync` recorre y copia los ~5.200 ficheros del `node_modules` del
 * starter uno a uno: medí ~15 s por sandbox, y son ~3 s de `robocopy` con hilos.
 * Como cada Ejecución paga esta copia, en Windows se usa `robocopy` (que viene
 * con el sistema); el código de salida de `robocopy` no es el de un comando:
 * **< 8 es éxito** (1 = copió, 3 = copió y borró), ≥ 8 es error.
 */
function copiarContenido(origen: string, destino: string): void {
  if (process.platform === "win32") {
    const r = spawnSync(
      "robocopy",
      [origen, destino, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/MT:8"],
      { encoding: "utf8" },
    );
    if (r.error || (r.status ?? 1) >= 8) {
      throw new Error(
        `No se pudo copiar el scaffold a ${destino}: ` +
          `${r.error?.message ?? r.stdout ?? "error desconocido"}`,
      );
    }
    return;
  }
  for (const entry of readdirSync(origen, { withFileTypes: true })) {
    cpSync(join(origen, entry.name), join(destino, entry.name), { recursive: true });
  }
}

/** Foto `ruta relativa -> contenido` de todos los ficheros bajo `dir`. */
function fotoDeArchivos(dir: string): Map<string, string> {
  const foto = new Map<string, string>();
  if (!existsSync(dir)) return foto;
  for (const a of collectArtefactos(dir)) {
    foto.set(a.path, a.contenido);
  }
  return foto;
}

/**
 * Artefactos que produce el SUT: los ficheros de `dir` (relativo al `workDir`)
 * que son **nuevos o modificados** respecto a la línea base del scaffold. Lo que
 * ya venía puesto (`node_modules/`, config, páginas de ejemplo del starter) no
 * es output del Caso.
 *
 * `dir` no es fijo: depende del tipo de Caso (`src/` para Caso-componente,
 * `dist/` para Caso-página). Ver `dirArtefactoDeCaso` y ADR-0006.
 *
 * **Caso-página**: el `dist/` entero es *generado* por el build, así que la
 * línea base (cacheada sin `dist/`) no puede separar la página del SUT de las
 * ~20 páginas de ejemplo del starter: todas serían «nuevas». El artefacto de una
 * página es sólo la que el SUT **escribió en `src/`**: se queda el `dist/X.html`
 * cuya fuente `src/X.html` sea nueva o modificada. El resto del `dist/` (css, js,
 * las demás páginas) es salida del starter, no del Caso.
 */
export function listarArtefactosDeSalida(
  workDir: string,
  lineaBase: Map<string, string>,
  dir: string,
): { path: string; contenido: string }[] {
  const raiz = join(workDir, dir);
  if (!existsSync(raiz)) return [];
  const nuevos = collectArtefactos(raiz).filter(
    (a) => lineaBase.get(`${dir}/${a.path}`) !== a.contenido,
  );
  if (dir === "dist") {
    return nuevos
      .filter((a) => a.path.endsWith(".html") && fuenteModificada(workDir, lineaBase, a.path))
      .map((a) => ({ path: `${dir}/${a.path}`, contenido: a.contenido }));
  }
  return nuevos.map((a) => ({ path: `${dir}/${a.path}`, contenido: a.contenido }));
}

/** ¿La fuente `src/<mismaRuta>` es nueva o modificada respecto a la línea base? */
function fuenteModificada(
  workDir: string,
  lineaBase: Map<string, string>,
  rutaRelativa: string,
): boolean {
  const fuente = join(workDir, "src", rutaRelativa);
  if (!existsSync(fuente)) return false;
  const contenido = readFileSync(fuente, "utf8");
  return lineaBase.get(`src/${rutaRelativa}`) !== contenido;
}

function collectArtefactos(dir: string): { path: string; contenido: string }[] {
  const artefactos: { path: string; contenido: string }[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        artefactos.push({
          path: relative(dir, full).split("\\").join("/"),
          contenido: readFileSync(full, "utf8"),
        });
      }
    }
  };
  walk(dir);
  return artefactos;
}
