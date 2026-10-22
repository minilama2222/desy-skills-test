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
import type { Pin } from "./pin.js";
import { REPO_ROOT } from "./repo.js";

export const VENDOR_SKILLS_DIR = join(REPO_ROOT, "vendor", "desy-skills", "skills");

/** Starter DESY cacheado que se pre-scaffoldea en cada sandbox (ver ADR-0005). */
export const SCAFFOLD_CACHE_DIR = join(REPO_ROOT, ".scaffold-cache", "desy-html-starter");

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

export function buildOpencodeArgs(prompt: string): string[] {
  return ["run", "--model", MODELO_FIJO, prompt];
}

/**
 * Directorio del `workDir` que contiene el artefacto que se gradúa, según el
 * tipo de Caso. No es lo mismo para los dos tipos (ver ADR-0006):
 *
 * - **Caso-componente** → `src/`: lo que se juzga es el contrato del componente,
 *   y el contrato es la *llamada al macro*, que sólo existe en el fuente. Al
 *   compilar se expande y desaparece (las props y el nombre del macro se
 *   pierden), así que el `dist/` no sirve para medirlo.
 * - **Caso-página** → `dist/`: lo que se juzga es la página renderizada (HTML y
 *   a11y), y eso sólo existe compilado.
 *
 * El SUT escribe el fuente en `src/` como `.html` (convención del propio skill),
 * así que el Caso-componente no necesita compilar nada.
 */
export function dirArtefactoDeCaso(tipo: Caso["tipo"]): string {
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
    const args = buildOpencodeArgs(prompt);
    const { stdout, stderr } = deps.command.run(args, {
      cwd: sandbox.workDir,
      env: { HOME: sandbox.home, XDG_CONFIG_HOME: sandbox.configDir },
    });
    return {
      artefactos: {
        files: artefactosToFiles(sandbox.listArtefactos(dirArtefactoDeCaso(caso.tipo))),
      },
      transcript: { invocaciones: parseInvocaciones(mergeTranscript(stdout, stderr)) },
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
      rmSync(root, { recursive: true, force: true });
    },
  };
}

/** Copia el contenido de `origen` dentro de `destino` (no el directorio en sí). */
function copiarContenido(origen: string, destino: string): void {
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
 */
export function listarArtefactosDeSalida(
  workDir: string,
  lineaBase: Map<string, string>,
  dir: string,
): { path: string; contenido: string }[] {
  const raiz = join(workDir, dir);
  if (!existsSync(raiz)) return [];
  return collectArtefactos(raiz)
    .filter((a) => lineaBase.get(`${dir}/${a.path}`) !== a.contenido)
    .map((a) => ({ path: `${dir}/${a.path}`, contenido: a.contenido }));
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
