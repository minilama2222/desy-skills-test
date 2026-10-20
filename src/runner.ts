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
import { join, relative, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pin } from "./pin.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const VENDOR_SKILLS_DIR = join(REPO_ROOT, "vendor", "desy-skills", "skills");

export const MODELO_FIJO = "deepinfra/deepseek-ai/DeepSeek-V4.1-Flash";

export interface Caso {
  skill: string;
  id: string;
  prompt: string;
}

export interface Artefacto {
  path: string;
  contenido: string;
}

export interface ResultadoEjecucion {
  artefactos: Artefacto[];
  transcript: string;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface CommandOptions {
  cwd: string;
  env: Record<string, string>;
}

export interface CommandRunner {
  run(args: string[], opts: CommandOptions): CommandResult;
}

export interface Sandbox {
  readonly workDir: string;
  readonly home: string;
  readonly configDir: string;
  readonly skillsDir: string;
  copySkills(pin: Pin): void;
  listArtefactos(): Artefacto[];
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
): Promise<ResultadoEjecucion> {
  const prompt = caso.prompt.trim();
  if (!prompt) {
    throw new Error(`Caso ${caso.skill}/${caso.id} inválido: prompt vacío`);
  }

  const sandbox = deps.sandbox.create();
  try {
    sandbox.copySkills(pin);
    const args = buildOpencodeArgs(prompt);
    const { stdout, stderr } = deps.command.run(args, {
      cwd: sandbox.workDir,
      env: { HOME: sandbox.home },
    });
    return {
      artefactos: sandbox.listArtefactos(),
      transcript: mergeTranscript(stdout, stderr),
    };
  } finally {
    sandbox.cleanup();
  }
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

export const realSandboxFactory: SandboxFactory = {
  create(): Sandbox {
    return createSandbox();
  },
};

export function createSandbox(base: string = tmpdir()): Sandbox {
  const root = mkdtempSync(join(base, "desy-sut-"));
  const home = join(root, "home");
  const configDir = join(home, ".config", "opencode");
  const skillsDir = join(configDir, "skill");
  const workDir = join(root, "work");

  mkdirSync(skillsDir, { recursive: true });
  mkdirSync(workDir, { recursive: true });

  return {
    workDir,
    home,
    configDir,
    skillsDir,
    copySkills(_pin: Pin): void {
      if (!existsSync(VENDOR_SKILLS_DIR)) {
        throw new Error(
          `No existe el vendor de skills en ${VENDOR_SKILLS_DIR}`,
        );
      }
      for (const entry of readdirSync(VENDOR_SKILLS_DIR)) {
        cpSync(join(VENDOR_SKILLS_DIR, entry), join(skillsDir, entry), {
          recursive: true,
        });
      }
    },
    listArtefactos(): Artefacto[] {
      return collectArtefactos(workDir);
    },
    cleanup(): void {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function collectArtefactos(dir: string): Artefacto[] {
  const artefactos: Artefacto[] = [];
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
