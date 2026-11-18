import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, relative } from "node:path";
import type { Caso } from "./caso.js";
import { esCasoDecision, esCasoPagina } from "./caso.js";
import type { FicheroDeSkill } from "./guardarrail-pin.js";
import { hashDelArbol, rutaDeSkill, skillsDeCheckout } from "./guardarrail-pin.js";
import type { Pin } from "./pin.js";
import { esPinLocal } from "./pin.js";
import { REPO_ROOT } from "./repo.js";

export const VENDOR_SKILLS_DIR = join(REPO_ROOT, "vendor", "desy-skills", "skills");

/** Starter DESY cacheado que se pre-scaffoldea en cada sandbox (ver ADR-0005). */
export const SCAFFOLD_CACHE_DIR = join(REPO_ROOT, ".scaffold-cache", "desy-html-starter");

/**
 * Ficheros que la preparación del scaffold deja sin rastrear y que **no** son
 * contaminación. `.nvmrc` lo crea el setup del starter.
 */
const NO_RASTREADOS_ESPERADOS = new Set([".nvmrc"]);

/**
 * Lo que el vigilante del repo **nunca** cuenta como escritura del SUT, por ruta
 * relativa a la raíz del repo (se comparan con prefijo: `.git/index.lock` casa
 * con `.git/`).
 *
 * - `.git`: durante una suite, el repo se mueve por su cuenta — el `git status`
 *   que pide `resolverPin` deja un `index.lock` un instante, y un commit del
 *   mantenedor corre a la vez. Un test que dispara un commit no es una escritura
 *   del SUT (ticket 16).
 * - `reports`, `.scaffold-cache` y los temporales: son los directorios donde el
 *   producto **sí** escribe (el scorecard, la caché del starter, el temporal de
 *   vitest). Lo que el SUT escribe en `reports/` no pasa el vigilante de otra
 *   forma, pero el ruido de la propia suite quedaría como falso hallazgo.
 */
const IGNORADOS_POR_EL_VIGILANTE: readonly string[] = [".git", "reports", ".scaffold-cache", "node_modules"];

/**
 * La regla del ticket 16: **el SUT sólo escribe dentro de su sandbox**.
 *
 * Los `caminos` son absolutos y se clasifican así:
 *
 * - **Dentro del `workDir`** (el sandbox): es su trabajo. Permitido.
 * - **Dentro de la base de sandboxes** (`desy-sut-*`, su `home/` con la config y
 *   las skills): también es del sandbox. Tampoco es una fuga: es estado del
 *   propio proceso, no un artefacto que se haya quedado en el repo.
 * - **Cualquier otra ruta dentro del repo**: es una fuga. El SUT heredó el árbol
 *   del harness y dejó ahí su artefacto, que el runner no verá (lo busca en el
 *   `workDir`) y que un `git add -A` comitearía.
 *
 * Lo que cae **fuera del repo** no se juzga: la política de aislamiento del
 * sandbox es la de ADR-0013 (permisos y `HOME`), no la de este vigilante, que
 * sólo cubre el árbol versionado que el SUT ensuciaba.
 *
 * Regla pura: el recolector es `VigilanteDelRepositorio`, que le pasa los
 * ficheros nuevos o cambiados y ya filtra `.git/`, la caché y `node_modules/`.
 */
export function escriturasFueraDelSandbox(
  caminos: string[],
  entorno: {
    repoRoot: string;
    workDir: string;
    /** Base de los sandboxes (`desy-sut-*`); por defecto, el temporal del sistema. */
    baseSandbox?: string;
  },
): string[] {
  const baseSandbox = entorno.baseSandbox ?? tmpdir();
  // La comparación es por **segmento de ruta**, no por prefijo de cadena: con
  // `startsWith` a secas, `/repo/otro` colaría como dentro de `/repo`. Y el
  // separador lo pone la plataforma (`\` en Windows): comparar con `/` fijo hacía
  // que ninguna ruta casara y el vigilante no acusara nunca (lo cazó el CI en
  // Windows, donde el resto iba en verde).
  const dentro = (ruta: string, base: string): boolean => {
    const trozos = (p: string): string[] => p.split(/[\\/]+/).filter(Boolean);
    const a = trozos(ruta);
    const b = trozos(base);
    return a.length >= b.length && b.every((t, i) => a[i] === t);
  };
  const fuera: string[] = [];
  for (const camino of caminos) {
    if (!dentro(camino, entorno.repoRoot)) continue;
    if (dentro(camino, entorno.workDir)) continue;
    if (dentro(camino, baseSandbox)) continue;
    fuera.push(camino);
  }
  return fuera;
}

/**
 * El recolector de hechos del vigilante: las firmas de los ficheros versionables
 * del repo (ver `firmasVersionables`), tomadas al lanzar el SUT y comparadas en
 * cada paso.
 *
 * No se usa `fs.watch`: sus eventos son de todo el árbol y de cualquier proceso —
 * el `git status` de la suite, un commit, el mantenedor con su editor abierto— y
 * acusar al SUT por la escritura de otro sería un falso rojo. La foto delata lo
 * que apareció o cambió **mientras el SUT corría**, sin saber quién lo cambió.
 */
class VigilanteDelRepositorio {
  readonly escrituras: string[] = [];
  private readonly antes: Map<string, string>;
  private readonly vistos = new Set<string>();

  constructor(
    readonly repoRoot: string,
    readonly workDir: string,
    /**
     * Directorio donde viven los sandboxes (`desy-sut-*`). Por defecto el del
     * sistema; un test puede tenerlos en otro sitio.
     */
    readonly baseSandbox: string = tmpdir(),
  ) {
    this.antes = firmasVersionables(this.repoRoot);
  }

  /**
   * Las fugas de esta corrida: los ficheros nuevos o cambiados que la regla
   * marca. Se llama **después** de que el proceso termine, porque el bucle de
   * eventos no avanza mientras `spawnSync` espera.
   */

  /** Las rutas que aparecieron o cambiaron desde el lanzamiento, dentro del repo. */
  cambiados(): string[] {
    const ahora = firmasVersionables(this.repoRoot);
    const rutas = new Set<string>();
    for (const [ruta, firma] of ahora) if (this.antes.get(ruta) !== firma) rutas.add(ruta);
    for (const ruta of this.antes.keys()) if (!ahora.has(ruta)) rutas.add(ruta);
    return [...rutas];
  }

  mirar(): void {
    for (const ruta of escriturasFueraDelSandbox(this.cambiados(), {
      repoRoot: this.repoRoot,
      workDir: this.workDir,
      baseSandbox: this.baseSandbox,
    })) {
      if (this.vistos.has(ruta)) continue;
      this.vistos.add(ruta);
      this.escrituras.push(ruta);
    }
  }
}

/**
 * Firmas `ruta absoluta -> tamaño:mtime` de los ficheros versionables bajo
 * `dir`. Se saltan los directorios de la allowlist (`IGNORADOS_POR_EL_VIGILANTE`)
 * y lo que `.gitignore` ya declara ignorado, con una única pregunta a `git
 * check-ignore` de lo que hay en el árbol (nada de recorrer `node_modules/` para
 * luego descartarlo: en la primera versión, recorrerlo en cada mirada dejaba sin
 * CPU al proceso de la suite y no terminaba).
 *
 * Es lo que delata una fuga fuera del sandbox: un fichero **nuevo** y versionable,
 * que es el `?? src/pages/x.html` del hallazgo. La firma es tamaño + mtime: no
 * lee contenido.
 */
function firmasVersionables(dir: string): Map<string, string> {
  const foto = new Map<string, string>();
  const recorrer = (actual: string): void => {
    let entries;
    try {
      entries = readdirSync(actual, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absoluta = join(actual, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORADOS_POR_EL_VIGILANTE.includes(entry.name)) recorrer(absoluta);
      } else if (entry.isFile()) {
        const f = statSync(absoluta);
        foto.set(absoluta, `${f.size}:${f.mtimeMs}`);
      }
    }
  };
  recorrer(dir);
  // El `.gitignore` se pregunta una vez con las rutas ya reunidas: es la misma
  // foto que haría `git status`, sin leer el contenido de nada. Sólo tiene
  // sentido donde `git` reconoce un repo; en el repo de prueba de un test (un
  // temporal sin `.git`) no hay `.gitignore` que aplicar.
  const esRepo = spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd: dir,
    encoding: "utf8",
  });
  if (esRepo.status !== 0) return foto;
  for (const ruta of preguntarIgnorados(dir, [...foto.keys()])) foto.delete(ruta);
  return foto;
}

/** Las rutas de `foto` que `.gitignore` declara ignoradas (vacío sin git). */
function preguntarIgnorados(dir: string, rutas: string[]): string[] {
  if (rutas.length === 0) return [];
  const check = spawnSync("git", ["check-ignore", "--stdin", "-z"], {
    cwd: dir,
    input: rutas.join("\0") + "\0",
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  // 0 = alguna ignorada, 1 = ninguna; otro código = git no está o el repo no
  // existe (el repo de prueba de un test), y entonces no hay nada que quitar.
  if (check.status !== 0) return [];
  const relativas = new Set((check.stdout ?? "").split("\0").filter(Boolean));
  return rutas.filter((ruta) => relativas.has(relative(dir, ruta).split("\\").join("/")));
}

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


/**
 * Proveedor y modelo del SUT. Es el modelo con el que corre este agente
 * (`deepinfra/deepseek-ai/DeepSeek-V4.1-Flash-1017`), no el alias sin sufijo.
 */
export const PROVEEDOR_DEL_SUT = "deepinfra";
export const MODELO_DEL_SUT = "deepseek-ai/DeepSeek-V4.1-Flash-1017";
export const MODELO_FIJO = `${PROVEEDOR_DEL_SUT}/${MODELO_DEL_SUT}`;

export interface Artefactos {
  files: Record<string, string>;
}

export interface Transcript {
  invocaciones: string[];
}

export interface Evidencia {
  artefactos: Artefactos;
  transcript: Transcript;
  /**
   * Exit code del SUT (ticket 02 del bucle de refinamiento). Antes se calculaba
   * en `realCommand` y se descartaba: un crash y un estancamiento daban el mismo
   * «sin-artefacto». Se eleva por la Evidencia para que el orquestador lo registre.
   */
  exitCode: number;
  /**
   * Los dos canales del SUT tal cual, sin fusionar. `transcript` los une para leer
   * el Flujo, pero la prosa del modelo (stdout) y el progreso de opencode
   * (stderr) llegan a la suite por la misma tubería: quien quiera citar un
   * párrafo de la salida no puede fiarse de la fusión. Es también lo que deja a
   * un test afirmar qué vio el SUT dentro de su sandbox.
   */
  salida: { stdout: string; stderr: string };
  /**
   * Hash del árbol de skills que se copió al sandbox (ticket 04): la identidad de
   * qué se midió. El commit de `pin.json` no basta, porque nada verifica que
   * `vendor/` coincida con él; y con un Pin local no hay commit en absoluto
   * (ticket 05), así que el hash es la **única** identidad en ese caso.
   */
  arbolHash: string;
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
  /**
   * Copia al `skillsDir` los skills que hay dentro de `origen`: el propio
   * `vendor/desy-skills/skills/` del vendor (el defecto) o la **raíz de un
   * checkout local** (ticket 05), de cuyo `skills/` salen. Se copia skill por
   * skill —cada subdirectorio— y no el directorio entero: un checkout trae su
   * `.git/` y su README, que no son skills y no tienen por qué acabar en el
   * sandbox.
   */
  copySkills(origen?: string): void;
  /**
   * Deja la configuración con la que el SUT arranca dentro del sandbox (ver
   * ADR-0013): el `opencode.jsonc` que lo encierra y el `auth.json` con el que
   * alcanza el proveedor del modelo fijado.
   */
  configurar(): void;
  /**
   * De dónde se leen las claves de proveedor para el entorno del SUT (ticket 15).
   * Es el `auth.json` del usuario, no la copia del sandbox: la copia puede no
   * existir todavía cuando se compone el entorno. Opcional: sin él, se usa la del
   * sandbox.
   */
  authOrigen?: string;
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

/**
 * Argumentos de `opencode run` (OpenCode V2). `--standalone` es lo que hace que
 * el `HOME` del sandbox mande: sin él, `run` se conecta al **servicio de fondo
 * compartido** del usuario y el sandbox deja de aislar (ver ADR-0013).
 *
 * `--format json` no es cosmético: el formato por defecto imprime un TUI que
 * **relanza** el trabajo, y ese relanzamiento perdía el `cwd` del sandbox en la
 * medición del ticket 16. Con `json` el trabajo corre en el proceso que se lanza,
 * y sus herramientas leen la salida y la redirección de siempre. Lo que de verdad
 * decide dónde escribe es `PWD` (ver `entornoDelSut`), pero el formato es la
 * mitad del arreglo que quita de en medio un relanzamiento con `cwd` propio.
 */
export function buildOpencodeArgs(prompt: string, imagen?: string): string[] {
  const args = ["run", "--standalone", "--format", "json", "--model", MODELO_FIJO];
  // La Captura de Gold (Gold-imagen) viaja al prompt como referencia visual
  // (spec, ticket 08): `--file` la adjunta al mensaje del SUT.
  if (imagen !== undefined) args.push("--file", imagen);
  args.push(prompt);
  return args;
}

/**
 * Permisos del SUT dentro del sandbox (ADR-0013). Los defectos de V2 son «todo
 * permitido» y `external_directory` no pregunta, así que el sandbox hereda el
 * disco de la máquina si no se cierra. Se permite escribir/leer (lo que el SUT
 * necesita para producir el artefacto del Caso) y se niega todo lo que sale del
 * sandbox o toca la máquina: shell, red, subagentes y ficheros externos.
 *
 * El orden importa: en V2 gana la **última** regla que casa, así que primero va
 * la base y después las negaciones. Se niega `*` y no solo las acciones de hoy,
 * para que una acción nueva de una versión futura de opencode tampoco entre.
 */
export const PERMISOS_DEL_SANDBOX = [
  { action: "*", resource: "*", effect: "deny" },
  { action: "read", resource: "*", effect: "allow" },
  { action: "edit", resource: "*", effect: "allow" },
  { action: "glob", resource: "*", effect: "allow" },
  { action: "grep", resource: "*", effect: "allow" },
  { action: "list", resource: "*", effect: "allow" },
  // Las skills del Pin viven en el `HOME` del sandbox, fuera del `workDir`.
  { action: "skill", resource: "*", effect: "allow" },
  { action: "external_directory", resource: "*", effect: "deny" },
] as const;

/**
 * La configuración del sandbox en la forma nativa de OpenCode V2:
 *
 * - `policies.provider.use` sustituye al `enabled_providers` de V1 (que V2 no
 *   tiene): solo el proveedor del modelo fijado. Con el `auth.json` copiado,
 *   sin esto el SUT podría gastar cualquier otra cuenta del usuario.
 * - `permissions`: ver `PERMISOS_DEL_SANDBOX`.
 * - `skills` explícitas al `skillsDir` del sandbox: es ruta absoluta, así que V2
 *   la resuelve tal cual en cualquier plataforma (las relativas se resuelven
 *   desde el directorio de trabajo, no desde el config).
 * - sin MCP ni plugins: no se declaran y no se heredan del HOME real, porque el
 *   HOME del SUT es el del sandbox.
 *
 * `$schema` va con la forma que el editor entiende; opencode no lo necesita.
 */
export function configuracionDelSandbox(sandbox: {
  home: string;
  skillsDir: string;
}): object {
  return {
    $schema: "https://opencode.ai/config.json",
    skills: [sandbox.skillsDir],
    permissions: PERMISOS_DEL_SANDBOX,
    policies: [
      { action: "provider.use", resource: "*", effect: "deny" },
      { action: "provider.use", resource: PROVEEDOR_DEL_SUT, effect: "allow" },
    ],
  };
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
  // El Pin decide DE DÓNDE salen los skills (ticket 05): un Pin local trae la ruta
  // de un checkout del usuario en `repo`, y se copia su `skills/`; el canónico no
  // trae ruta y manda `vendor/`. Antes este parámetro se recibía y no se leía, y el
  // informe declaraba el commit de `pin.json` midiera lo que midiera.
  const origenSkills =
    esPinLocal(pin) && pin.repo ? skillsDeCheckout(pin.repo) : undefined;

  const sandbox = deps.sandbox.create();
  try {
    sandbox.copySkills(origenSkills);
    sandbox.configurar();
    const imagen = adjuntarImagenDeCaso(caso, sandbox.workDir);
    const args = buildOpencodeArgs(
      promptParaSut(prompt, imagen?.tipo, imagen?.nombre),
      imagen?.path,
    );
    const { stdout, stderr, code } = deps.command.run(args, {
      cwd: sandbox.workDir,
      // `XDG_CONFIG_HOME` es la ruta de config de `opencode.jsonc`; `OPENCODE_HOME`
      // la del par `auth.json`/base de datos en V2. Se fijan las dos para que no
      // quede ninguna parte del HOME fuera del sandbox. `authOrigen` va aparte
      // porque de ahí salen las claves de proveedor: el `auth.json` del sandbox
      // es una copia y solo existe después de `configurar()` (ticket 15).
      env: entornoDelSandbox({ ...sandbox, authOrigen: sandbox.authOrigen }),
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
      exitCode: code,
      salida: { stdout, stderr },
      arbolHash: hashDelArbolDelSandbox(sandbox.skillsDir),
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

/**
 * Lee el árbol de skills **ya copiado al sandbox** y lo hashea. Se hashea lo que
 * el SUT va a ver, no la fuente: si la copia y el vendor divergieran, el hash
 * diría la verdad de lo medido (ticket 04).
 */
function hashDelArbolDelSandbox(skillsDir: string): string {
  const ficheros: FicheroDeSkill[] = [];
  // Un skillsDir inexistente es un sandbox sin skills (los dobles de test), no
  // un error: se hashea el árbol vacío en vez de reventar la Ejecución.
  if (!existsSync(skillsDir)) return hashDelArbol(ficheros);
  const recorrer = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absoluta = join(dir, entry.name);
      if (entry.isDirectory()) {
        recorrer(absoluta);
      } else if (entry.isFile()) {
        ficheros.push({
          ruta: rutaDeSkill(skillsDir, absoluta),
          contenido: readFileSync(absoluta, "utf8"),
        });
      }
    }
  };
  recorrer(skillsDir);
  return hashDelArbol(ficheros);
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
    // Flujo observado vive en stderr.
    //
    // Se usa `spawn` + espera síncrona sobre un `SharedArrayBuffer`, y no
    // `spawnSync`, para poder mirar el árbol de trabajo **mientras el SUT corre**
    // (ticket 16, ver `ejecutarConGuardiaDelRepo`): una escritura fuera del sandbox
    // se aborta en el acto, en vez de descubrirse cuando el daño ya está hecho.
    const corrida = ejecutarConGuardiaDelRepo("opencode", args, opts);
    const { resultado } = corrida;

    if (resultado.error && (resultado.error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        "No se encontró el binario `opencode`. Instálalo o usa un command runner inyectado.",
      );
    }

    // El vigilante ve el fichero antes que el temporizador: si ya lo delató, eso
    // manda sobre el exit code del SUT (que además se cortó a propósito).
    if (corrida.escrituras !== undefined) {
      throw new Error(
        `El SUT escribió ${corrida.escrituras.length} fichero/s fuera de su sandbox ` +
          `(workDir ${opts.cwd}):\n` +
          corrida.escrituras.map((ruta) => `  - ${ruta}`).join("\n") +
          "\nSe ha abortado la Ejecución: un SUT que sale de su workDir miente sobre el " +
          "Caso y ensucia un árbol que no es suyo (ADR-0019).",
      );
    }

    return {
      stdout: resultado.stdout ?? "",
      stderr: resultado.stderr ?? (resultado.error ? String(resultado.error) : ""),
      code: resultado.status ?? 1,
    };
  },
};

interface CorridaVigilada {
  /** La misma forma que devolvería `spawnSync`. */
  resultado: { stdout: string; stderr: string; status: number | null; signal?: string; error?: Error };
  /** Ficheros nuevos o cambiados en el repo mientras el SUT corría. */
  escrituras?: string[];
}

/**
 * El entorno con el que corre el SUT: el del lanzador (la suite hereda el del
 * mantenedor, con sus claves) más **el del sandbox**, que manda donde los dos
 * coincidan. La pieza delicada —`PWD` con el `workDir`, sin la sesión del
 * lanzador— la pone `entornoDelSandbox`, que es el único sitio que compone el
 * entorno del SUT: éste sólo fusiona, para que un test que dobla el comando y un
 * `realCommand` reciban el mismo entorno (ADR-0019).
 */
export function entornoDelSut(
  heredado: Record<string, string | undefined>,
  delSandbox: Entorno,
): Entorno {
  const env: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(heredado)) {
    if (valor !== undefined) env[clave] = valor;
  }
  Object.assign(env, delSandbox);
  delete env.OPENCODE_SESSION_ID;
  delete env.OPENCODE_TERMINAL;
  delete env.AI_AGENT;
  return env;
}

/**
 * Lanza el SUT y lo espera **bloqueando sólo este hilo**: `spawnSync` con los dos
 * canales en tubería y un `maxBuffer` generoso —un SUT locuaz no puede morir por
 * búfer lleno—. El bucle de eventos no avanza mientras se espera, así que el
 * vigilante no puede mirar *durante* la corrida: se toma la foto del árbol **antes**
 * de lanzar y se compara **en cuanto** el proceso termina. Un fichero nuevo fuera
 * del sandbox, que es el hallazgo del ticket 16, se delata igual: no estaba en la
 * foto y está al final.
 *
 * Si el vigilante tiene algo que acusar, `realCommand` lanza con las rutas: el
 * fichero ya está escrito, pero el Caso no se da por bueno y el rojo lo nombra.
 *
 * Por qué no se espera con `spawn` + un bucle: `Atomics.wait` en el hilo principal
 * no entrega ni el `close` del hijo ni los `data` de las tuberías, así que un
 * proceso terminado nunca se veía terminado (medido: el padre esperaba para
 * siempre); y `spawnSync` ya deja leer los dos canales a la vez, que es lo que
 * siempre hizo.
 */
function ejecutarConGuardiaDelRepo(
  comando: string,
  args: string[],
  opts: CommandOptions,
  heredado: Record<string, string | undefined> = process.env,
): CorridaVigilada {
  // Puntos de inyección del test: `DESY_OPENCODE_BIN` lanza el SUT falso (sin él
  // manda el `opencode` del `PATH`), `DESY_OPENCODE_ARGS` (JSON) son sus
  // argumentos extra, y `DESY_REPO_ROOT`/`DESY_SANDBOX_BASE` mueven el vigilante a
  // los directorios del test, que pueden vivir en un temporal. Una variable vacía
  // no es un valor: cuenta como ausente.
  const variable = (nombre: string): string | undefined => {
    const valor = opts.env[nombre];
    return valor === undefined || valor === "" ? undefined : valor;
  };
  const binario = variable("DESY_OPENCODE_BIN") ?? comando;
  // Los argumentos que el test pasa con `DESY_OPENCODE_ARGS` (JSON) van delante
  // de los del SUT: es la manera de darle el guion y la raíz al nodo.
  const extra = variable("DESY_OPENCODE_ARGS");
  const argv = extra === undefined ? args : [...(JSON.parse(extra) as string[]), ...args];
  const vigilante = new VigilanteDelRepositorio(
    variable("DESY_REPO_ROOT") ?? REPO_ROOT,
    opts.cwd,
    variable("DESY_SANDBOX_BASE") ?? tmpdir(),
  );
  const resultado = spawnSync(binario, argv, {
    cwd: opts.cwd,
    // El entorno del SUT no hereda la **sesión** de quien lanza la suite: si
    // `OPENCODE_SESSION_ID` viaja (lo pone el agente que ejecuta el harness), el
    // hijo se engancha a esa sesión y todas sus herramientas usan el proyecto de
    // ella —el repo del harness— aunque el proceso corra en el `workDir`. Medido
    // con la 2.2.1: mismo `cwd` y mismo sandbox, `shell pwd` da el repo con la
    // variable y el `workDir` sin ella (ADR-0019). Las demás variables de
    // OpenCode (`OPENCODE`, `OPENCODE_TERMINAL`, `AI_AGENT`) no cambian nada.
    env: entornoDelSut(heredado, opts.env),
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  vigilante.mirar();
  return {
    resultado: {
      stdout: resultado.stdout ?? "",
      stderr: resultado.stderr ?? (resultado.error ? String(resultado.error) : ""),
      status: resultado.status,
      ...(resultado.signal ? { signal: resultado.signal } : {}),
      ...(resultado.error ? { error: resultado.error } : {}),
    },
    ...(vigilante.escrituras.length > 0 ? { escrituras: vigilante.escrituras } : {}),
  };
}

/**
 * Las skills globales de V2 se descubren en `<config>/opencode/skills`, donde
 * `<config>` es el directorio de config raíz (el valor de `XDG_CONFIG_HOME`, o
 * `~/.config` si no se fija). **No** es `~/.config/opencode/skills`: esa ruta no
 * la escanea V2, y una skill copiada ahí falla con `Unable to load skill`
 * (medido en la 2.1.2, ver ADR-0013).
 *
 * Recibe el directorio **raíz** de config (`HOME/.config`), no el que se pasa al
 * SUT en `XDG_CONFIG_HOME` (que es su subdirectorio `opencode`): por eso se le
 * añade `opencode` aquí, y por eso el sandbox le pasa `home/.config`.
 */
export function skillsDirDeConfig(configRaiz: string): string {
  return join(configRaiz, "opencode", "skills");
}

/**
 * Rutas que el SUT tiene que ver apuntando al sandbox. `HOME` y
 * `XDG_CONFIG_HOME` los usa `opencode.jsonc` y sus skills; `OPENCODE_HOME` fija
 * el directorio de datos (la base de datos de sesiones), que si no se iría a
 * `~/.local/share/opencode` del usuario real. `auth.json` no se pone con una
 * variable: V2 lo busca en el directorio de datos que resuelve para el HOME.
 */
export function entornoDelSandbox(sandbox: {
  home: string;
  configDir: string;
  /** El directorio donde el SUT trabaja; `PWD` se pinta con él. */
  workDir: string;
  /**
   * `auth.json` del que salen las claves de proveedor. Por defecto, el del
   * `HOME` del sandbox (la copia que `configurar()` dejó); el runner le pasa el
   * del usuario para no depender del orden de las llamadas.
   */
  authOrigen?: string;
}): Record<string, string> {
  const auth = sandbox.authOrigen ?? join(datosDirDeHome(sandbox.home), "auth.json");
  return {
    HOME: sandbox.home,
    // `PWD` va con el `workDir`: `spawnSync({ cwd })` cambia el directorio real
    // del hijo pero no su `PWD`, y las herramientas resuelven las rutas relativas
    // contra `PWD`. Sin esta línea, un `write src/x.html` acaba en el directorio
    // del lanzador (ADR-0019). Es el entorno del SUT, no un detalle de `realCommand`.
    PWD: sandbox.workDir,
    XDG_CONFIG_HOME: sandbox.configDir,
    OPENCODE_HOME: datosDirDeHome(sandbox.home),
    ...clavesDeProveedores(auth),
  };
}

/**
 * Las claves de `auth.json` como variables de entorno del proveedor
 * (`deepinfra` → `DEEPINFRA_API_KEY`).
 *
 * Ticket 15: en la 2.2.1, copiar `auth.json` **no basta** para que el sandbox
 * resuelva el modelo —el catálogo de proveedores vive en `opencode.db`, que no
 * se copia—, pero la variable de entorno sí: medido con `HOME` limpio, la env
 * resuelve el modelo sin `auth.json`, y una clave incorrecta da otro error
 * («not authorized»), así que no es un falso verde.
 *
 * Se ponen **todas** las que el fichero declare, no solo la del SUT: el sandbox
 * ya limita qué proveedores puede usar (`policies.provider.use`), así que esta
 * lista no abre ninguna puerta. Lo que no se incluye es nada que no sea una
 * clave de tipo `api`: una sesión OAuth no se puede expresar como variable.
 *
 * Un `auth.json` ausente o ilegible devuelve vacío a propósito: el error de «no
 * hay credencial» lo da `configurar()`, con el nombre del fichero, en vez de
 * lanzar aquí desde un derivador de entorno.
 */
export function clavesDeProveedores(authPath: string): Record<string, string> {
  let crudo: unknown;
  try {
    crudo = JSON.parse(readFileSync(authPath, "utf8")) as unknown;
  } catch {
    return {};
  }
  if (typeof crudo !== "object" || crudo === null) return {};
  const claves: Record<string, string> = {};
  // **Solo la del proveedor del SUT.** Se probó primero con todas las `api`, y el
  // smoke del runner volcó las otras tres en el log de la suite al comparar el
  // entorno: una clave que el SUT no necesita no tiene por qué salir de su
  // usuario. El sandbox ya limita los proveedores a `PROVEEDOR_DEL_SUT`
  // (`policies.provider.use`), así que la lista corta y la larga usan lo mismo.
  const valor = (crudo as Record<string, unknown>)[PROVEEDOR_DEL_SUT];
  if (typeof valor !== "object" || valor === null) return {};
  const { type, key } = valor as { type?: unknown; key?: unknown };
  if (type !== "api" || typeof key !== "string" || key.length === 0) return {};
  claves[`${PROVEEDOR_DEL_SUT.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`] = key;
  return claves;
}

/**
 * Directorio de datos de OpenCode V2: ahí viven `auth.json` (las cuentas
 * conectadas) y la base de datos de sesiones. El SUT lo resuelve desde `HOME` en
 * las tres plataformas —medido con `opencode debug paths` en la 2.2.1—, así que
 * esta función es una sola regla y no una por sistema operativo.
 *
 * La primera versión de esta función decía que macOS no mueve
 * `~/Library/Application Support` con `HOME` y componía esa ruta. Era cierto en
 * la 2.1.2 y dejó de serlo: con la 2.2.1 el fichero vive en
 * `~/.local/share/opencode`, y el sandbox buscaba un `auth.json` que ya no
 * estaba. Una ruta de plataforma copiada de una medición caduca con el binario;
 * si vuelve a cambiar, el test de esta función lo dice antes que un rojo de
 * diez tests (ADR-0013).
 */
export function datosDirDeHome(home: string, _plataforma: string = process.platform): string {
  // Se compone a mano y no con `join`: `join` usa el separador de la máquina
  // actual, y esta ruta debe ser la del `home` que se pasa (puede ser el de un
  // sandbox, o la ruta de otra plataforma en un test).
  const base = home.replace(/[\\/]+$/, "");
  return `${base}/.local/share/opencode`;
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
  /**
   * `auth.json` real del usuario, del que se copian las cuentas conectadas al
   * sandbox (ver ADR-0013). Sin él, V2 no tiene con qué resolver el modelo
   * (`Model unavailable`). Por defecto, el del `HOME` real, salvo que
   * `OPENCODE_AUTH_JSON` diga otra cosa (ver `authDelUsuario`).
   */
  authOrigen?: string;
  /** `HOME` real del usuario; base para `authOrigen`. Por defecto, `os.homedir()`. */
  homeReal?: string;
}

/**
 * El `auth.json` del usuario del que el sandbox copia las cuentas.
 *
 * `OPENCODE_AUTH_JSON` **redirige** ese fichero, igual que `DESY_VERSIONES_DIR`
 * redirige el directorio de versiones (CODING_STANDARDS, «un test que necesita el
 * estado del repo lo redirige»). Sin la variable, un test que crea un sandbox
 * depende de que el mantenedor tenga `opencode auth login` hecho: en una máquina
 * limpia —un runner de CI— el fichero no existe y `configurar()` revienta con
 * «no tiene con qué resolver el modelo». La redirección deja a la suite correr
 * sin cuenta y sin tocar el `HOME` real.
 */
export function authDelUsuario(homeReal: string = homedir()): string {
  const redirigido = process.env.OPENCODE_AUTH_JSON;
  return redirigido !== undefined && redirigido !== ""
    ? redirigido
    : join(datosDirDeHome(homeReal), "auth.json");
}

export function createSandbox(opciones: string | SandboxOptions = {}): Sandbox {
  const opts: SandboxOptions = typeof opciones === "string" ? { base: opciones } : opciones;
  const base = opts.base ?? tmpdir();
  const homeReal = opts.homeReal ?? homedir();
  const authOrigen = opts.authOrigen ?? authDelUsuario(homeReal);
  const root = mkdtempSync(join(base, "desy-sut-"));
  const home = join(root, "home");
  const configDir = join(home, ".config", "opencode");
  // `skillsDirDeConfig` recibe la **raíz** de config (`home/.config`), que es lo
  // que el SUT tiene en `XDG_CONFIG_HOME` menos el `opencode` final. Pasarle
  // `configDir` duplicaba el segmento y las skills acababan en
  // `…/opencode/opencode/skills`, que V2 no escanea (ADR-0013).
  const skillsDir = skillsDirDeConfig(join(home, ".config"));
  const datosDir = datosDirDeHome(home);
  const workDir = join(root, "work");

  mkdirSync(skillsDir, { recursive: true });
  mkdirSync(datosDir, { recursive: true });
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
    authOrigen,
    copySkills(origen: string = VENDOR_SKILLS_DIR): void {
      // El origen es un directorio **de skills** (el `skills/` del vendor): se
      // copian sus subdirectorios, que son las skills. Un `.git/` —que un vendor
      // podría traer— no lo es. El checkout local lo resuelve `runCaso` apuntando
      // ya a su `skills/`, para que un `skills/skills/` no se cuele.
      if (!existsSync(origen)) {
        throw new Error(`No existe el árbol de skills en ${origen}`);
      }
      for (const entry of readdirSync(origen, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === ".git") continue;
        cpSync(join(origen, entry.name), join(skillsDir, entry.name), {
          recursive: true,
        });
      }
    },
    configurar(): void {
      writeFileSync(
        join(configDir, "opencode.jsonc"),
        // JSON puro: es JSONC válido, así que no hace falta un serializador de
        // comentarios ni plantilla.
        JSON.stringify(configuracionDelSandbox({ home, skillsDir }), null, 2) + "\n",
        "utf8",
      );
      // Solo se copian las cuentas conectadas; ningún otro estado del usuario
      // (sesiones, plugins, skills, config) entra en el sandbox.
      if (!existsSync(authOrigen)) {
        throw new Error(
          `No existe ${authOrigen}: OpenCode V2 no tiene con qué resolver ` +
            `${MODELO_FIJO} dentro del sandbox (lo conectas con \`opencode auth login\` en ` +
            "tu usuario). Ver ADR-0013.",
        );
      }
      cpSync(authOrigen, join(datosDir, "auth.json"));
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
