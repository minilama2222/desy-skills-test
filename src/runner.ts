import { execFileSync } from "node:child_process";
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
  listArtefactos(): { path: string; contenido: string }[];
  cleanup(): void;
}

export interface SandboxFactory {
  create(): Sandbox;
}

export function buildOpencodeArgs(prompt: string): string[] {
  return ["run", "--model", MODELO_FIJO, prompt];
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
      artefactos: { files: artefactosToFiles(sandbox.listArtefactos()) },
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

const INVOCACION_RE = /^»\s*skill:\s*(\S+)/gm;

function parseInvocaciones(transcript: string): string[] {
  const invocaciones: string[] = [];
  for (const match of transcript.matchAll(INVOCACION_RE)) {
    invocaciones.push(match[1]!);
  }
  return invocaciones;
}

function mergeTranscript(stdout: string, stderr: string): string {
  return [stdout, stderr].filter((s) => s.length > 0).join("\n").trim();
}

export const realCommand: CommandRunner = {
  run(args: string[], opts: CommandOptions): CommandResult {
    try {
      const stdout = execFileSync("opencode", args, {
        cwd: opts.cwd,
        env: { ...process.env, ...opts.env },
        encoding: "utf8",
      });
      return { stdout, stderr: "", code: 0 };
    } catch (error) {
      const failure = error as {
        stdout?: string;
        stderr?: string;
        status?: number;
        code?: string;
      };
      if (failure.code === "ENOENT") {
        throw new Error(
          "No se encontró el binario `opencode`. Instálalo o usa un command runner inyectado.",
        );
      }
      return {
        stdout: failure.stdout ?? "",
        stderr: failure.stderr ?? String(error),
        code: failure.status ?? 1,
      };
    }
  },
};

export function skillsDirDeHome(home: string): string {
  return join(home, ".config", "opencode", "skills");
}

export function createSandbox(base: string = tmpdir()): Sandbox {
  const root = mkdtempSync(join(base, "desy-sut-"));
  const home = join(root, "home");
  const configDir = join(home, ".config", "opencode");
  const skillsDir = skillsDirDeHome(home);
  const workDir = join(root, "work");

  mkdirSync(skillsDir, { recursive: true });
  mkdirSync(workDir, { recursive: true });

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
    listArtefactos() {
      return collectArtefactos(workDir);
    },
    cleanup(): void {
      rmSync(root, { recursive: true, force: true });
    },
  };
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
