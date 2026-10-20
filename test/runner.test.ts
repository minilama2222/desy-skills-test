import { existsSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { Pin } from "../src/pin.js";
import {
  MODELO_FIJO,
  buildOpencodeArgs,
  runCaso,
  type Artefacto,
  type CommandRunner,
  type Sandbox,
  type SandboxFactory,
} from "../src/runner.js";

const pin: Pin = {
  ref: "main",
  commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-20",
  repo: "https://github.com/minilama2222/desy-skills",
};

const caso = {
  skill: "implement-component",
  id: "boton-primario",
  prompt: "Genera un botón primario tamaño estándar con texto 'Enviar'",
};

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
  const fakeSandbox = (artefactos: Artefacto[]): Sandbox & {
    cerrado: number;
  } => {
    const sandbox = {
      workDir: "C:/sandbox/work",
      home: "C:/sandbox/home",
      configDir: "C:/sandbox/home/.config/opencode",
      skillsDir: "C:/sandbox/home/.config/opencode/skill",
      copySkills: vi.fn(),
      listArtefactos: vi.fn(() => artefactos),
      cleanup: vi.fn(),
      cerrado: 0,
    };
    return sandbox;
  };

  const factoryOf = (sandbox: Sandbox): SandboxFactory => ({
    create: () => sandbox,
  });

  it("devuelve { artefactos, transcript } con la forma estable", async () => {
    const sandbox = fakeSandbox([
      { path: "boton.html", contenido: "<button>Enviar</button>" },
    ]);
    const command: CommandRunner = {
      run: vi.fn(() => ({ stdout: "Listo\n", stderr: "", code: 0 })),
    };

    const resultado = await runCaso(caso, pin, {
      sandbox: factoryOf(sandbox),
      command,
    });

    expect(Object.keys(resultado).sort()).toEqual(["artefactos", "transcript"]);
    expect(resultado.artefactos).toEqual([
      { path: "boton.html", contenido: "<button>Enviar</button>" },
    ]);
    expect(resultado.transcript).toBe("Listo");
  });

  it("copia los skills del Pin al sandbox antes de ejecutar el SUT", async () => {
    const sandbox = fakeSandbox([]);
    const command: CommandRunner = {
      run: vi.fn(() => ({ stdout: "", stderr: "", code: 0 })),
    };

    await runCaso(caso, pin, { sandbox: factoryOf(sandbox), command });

    expect(sandbox.copySkills).toHaveBeenCalledWith(pin);
  });

  it("ejecuta opencode con un cwd limpio y el HOME del sandbox", async () => {
    const sandbox = fakeSandbox([]);
    const run = vi.fn(() => ({ stdout: "", stderr: "", code: 0 }));
    const command: CommandRunner = { run };

    await runCaso(caso, pin, { sandbox: factoryOf(sandbox), command });

    const [, opts] = run.mock.calls[0] as unknown as [
      string[],
      { cwd: string; env: Record<string, string> },
    ];
    expect(opts.cwd).toBe(sandbox.workDir);
    expect(opts.env.HOME).toBe(sandbox.home);
  });

  it("incluye stdout y stderr en el transcript", async () => {
    const sandbox = fakeSandbox([]);
    const command: CommandRunner = {
      run: () => ({ stdout: "salida", stderr: "aviso", code: 0 }),
    };

    const resultado = await runCaso(caso, pin, {
      sandbox: factoryOf(sandbox),
      command,
    });

    expect(resultado.transcript).toContain("salida");
    expect(resultado.transcript).toContain("aviso");
  });

  it("limpia el sandbox incluso si el SUT falla", async () => {
    const sandbox = fakeSandbox([]);
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
    const factory: SandboxFactory = { create: vi.fn() };

    await expect(
      runCaso({ ...caso, prompt: "  " }, pin, {
        sandbox: factory,
        command: { run: vi.fn() },
      }),
    ).rejects.toThrow(/prompt/i);
    expect(factory.create).not.toHaveBeenCalled();
  });
});
