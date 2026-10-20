import { describe, expect, it, vi } from "vitest";
import type { CasoComponente } from "../src/caso.js";
import type { Pin } from "../src/pin.js";
import {
  MODELO_FIJO,
  buildOpencodeArgs,
  runCaso,
  type CommandRunner,
  type Entorno,
  type Sandbox,
} from "../src/runner.js";

const pin: Pin = {
  ref: "main",
  commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-20",
  repo: "https://github.com/minilama2222/desy-skills",
};

const caso: CasoComponente = {
  tipo: "caso-componente",
  skill: "implement-component",
  id: "boton-primario",
  prompt: "Genera un botón primario tamaño estándar con texto 'Enviar'",
  checks: [],
};

const fakeSandbox = (artefactos: { path: string; contenido: string }[] = []): Sandbox => ({
  workDir: "C:/sandbox/work",
  home: "C:/sandbox/home",
  configDir: "C:/sandbox/home/.config/opencode",
  skillsDir: "C:/sandbox/home/.config/opencode/skills",
  copySkills: vi.fn(),
  listArtefactos: vi.fn(() => artefactos),
  cleanup: vi.fn(),
});

describe("MODELO_FIJO", () => {
  it("es el modelo fijado por ADR-0001", () => {
    expect(MODELO_FIJO).toBe("deepinfra/deepseek-ai/DeepSeek-V4.1-Flash");
  });
});

describe("buildOpencodeArgs", () => {
  it("lanza opencode run no-interactivo con el modelo fijado y el prompt", () => {
    expect(buildOpencodeArgs(caso.prompt)).toEqual([
      "run",
      "--model",
      "deepinfra/deepseek-ai/DeepSeek-V4.1-Flash",
      caso.prompt,
    ]);
  });
});

describe("runCaso", () => {
  const factoryOf = (sandbox: Sandbox) => ({ create: () => sandbox });

  it("devuelve la Evidencia (artefactos + transcript) con la forma que consume el grader", async () => {
    const sandbox = fakeSandbox([
      { path: "boton.html", contenido: "<button>Enviar</button>" },
    ]);
    const command: CommandRunner = {
      run: vi.fn(() => ({
        stdout: "» skill: implement-component\n",
        stderr: "",
        code: 0,
      })),
    };

    const resultado = await runCaso(caso, pin, {
      sandbox: factoryOf(sandbox),
      command,
    });

    expect(Object.keys(resultado).sort()).toEqual(["artefactos", "transcript"]);
    expect(resultado.artefactos).toEqual({
      files: { "boton.html": "<button>Enviar</button>" },
    });
    expect(resultado.transcript).toEqual({ invocaciones: ["implement-component"] });
  });

  it("copia los skills del Pin al sandbox antes de ejecutar el SUT", async () => {
    const sandbox = fakeSandbox();
    const command: CommandRunner = {
      run: vi.fn(() => ({ stdout: "", stderr: "", code: 0 })),
    };

    await runCaso(caso, pin, { sandbox: factoryOf(sandbox), command });

    expect(sandbox.copySkills).toHaveBeenCalledOnce();
  });

  it("ejecuta opencode con un cwd limpio y el entorno del sandbox", async () => {
    const sandbox = fakeSandbox();
    const run = vi.fn(() => ({ stdout: "", stderr: "", code: 0 }));
    const command: CommandRunner = { run };

    await runCaso(caso, pin, { sandbox: factoryOf(sandbox), command });

    const [, opts] = run.mock.calls[0] as unknown as [string[], { cwd: string; env: Entorno }];
    expect(opts.cwd).toBe(sandbox.workDir);
    expect(opts.env).toEqual({
      HOME: sandbox.home,
      XDG_CONFIG_HOME: sandbox.configDir,
    });
  });

  it("extrae el Flujo observado de las invocaciones del transcript", async () => {
    const sandbox = fakeSandbox();
    const command: CommandRunner = {
      run: () => ({
        stdout: "» skill: preflight-check\n» skill: implement-component\n",
        stderr: "",
        code: 0,
      }),
    };

    const resultado = await runCaso(caso, pin, {
      sandbox: factoryOf(sandbox),
      command,
    });

    expect(resultado.transcript.invocaciones).toEqual([
      "preflight-check",
      "implement-component",
    ]);
  });

  it("limpia el sandbox incluso si el SUT falla", async () => {
    const sandbox = fakeSandbox();
    const command: CommandRunner = {
      run: () => {
        throw new Error("opencode explotó");
      },
    };

    await expect(
      runCaso(caso, pin, { sandbox: factoryOf(sandbox), command }),
    ).rejects.toThrow();
    expect(sandbox.cleanup).toHaveBeenCalledOnce();
  });

  it("rechaza un prompt vacío sin crear sandbox", async () => {
    const create = vi.fn();

    await expect(
      runCaso({ ...caso, prompt: "  " }, pin, {
        sandbox: { create },
        command: { run: vi.fn() },
      }),
    ).rejects.toThrow(/prompt/i);
    expect(create).not.toHaveBeenCalled();
  });
});
