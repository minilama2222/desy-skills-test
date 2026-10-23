import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CasoComponente, Check } from "../src/caso.js";
import { grado } from "../src/grader.js";
import type { Pin } from "../src/pin.js";
import {
  MODELO_FIJO,
  buildOpencodeArgs,
  dirArtefactoDeCaso,
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

  it("adjunta una imagen con --file cuando se pasa una Captura de Gold", () => {
    expect(buildOpencodeArgs("prompt", "gold.png")).toEqual([
      "run",
      "--model",
      "deepinfra/deepseek-ai/DeepSeek-V4.1-Flash",
      "--file",
      "gold.png",
      "prompt",
    ]);
  });
});

describe("dirArtefactoDeCaso", () => {
  it("el Caso-componente se mide sobre el fuente (src/): el contrato del macro sólo vive ahí", () => {
    expect(dirArtefactoDeCaso("caso-componente")).toBe("src");
  });

  it("el Caso-página se mide sobre el compilado (dist/): el HTML y la a11y sólo existen ahí", () => {
    expect(dirArtefactoDeCaso("caso-pagina")).toBe("dist");
  });
});

describe("runCaso", () => {
  const factoryOf = (sandbox: Sandbox) => ({ create: () => sandbox });

  it("pide los artefactos al directorio que marca el tipo de Caso (componente -> src)", async () => {
    // El bug original: un Caso-componente devolvía el dist/ compilado, donde la
    // llamada al macro ya se ha expandido y los guards de macro no ven nada.
    const sandbox = fakeSandbox();
    const command: CommandRunner = {
      run: () => ({ stdout: "", stderr: "", code: 0 }),
    };

    await runCaso(caso, pin, { sandbox: factoryOf(sandbox), command });

    expect(sandbox.listArtefactos).toHaveBeenCalledWith("src");
  });

  it("pide el dist/ compilado para un Caso-página", async () => {
    const dir = mkdtempSync(join(tmpdir(), "runner-pagina-"));
    const casoDir = mkdtempSync(join(tmpdir(), "runner-caso-"));
    try {
      const goldPng = join(casoDir, "gold.png");
      writeFileSync(goldPng, "PNG");
      const sandbox = { ...fakeSandbox(), workDir: dir };
      const command: CommandRunner = {
        run: () => ({ stdout: "", stderr: "", code: 0 }),
      };
      const casoPagina = {
        ...caso,
        tipo: "caso-pagina" as const,
        goldPath: join(casoDir, "gold.html"),
        goldImagenPath: goldPng,
      };

      await runCaso(casoPagina, pin, { sandbox: factoryOf(sandbox), command });

      expect(sandbox.listArtefactos).toHaveBeenCalledWith("dist");
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(casoDir, { recursive: true, force: true });
    }
  });

  it("un Caso-página adjunta la Captura de Gold al prompt (referencia visual)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "runner-gold-"));
    const casoDir = mkdtempSync(join(tmpdir(), "runner-caso-"));
    try {
      const goldPng = join(casoDir, "gold.png");
      writeFileSync(goldPng, "PNG");
      const sandbox = { ...fakeSandbox(), workDir: dir };
      const run = vi.fn(() => ({ stdout: "", stderr: "", code: 0 }));
      const casoPagina = {
        ...caso,
        tipo: "caso-pagina" as const,
        goldPath: join(casoDir, "gold.html"),
        goldImagenPath: goldPng,
      };

      await runCaso(casoPagina, pin, {
        sandbox: factoryOf(sandbox),
        command: { run },
      });

      const [args] = run.mock.calls[0] as unknown as [string[]];
      expect(args).toContain("--file");
      const i = args.indexOf("--file");
      expect(args[i + 1]).toBe(join(dir, "gold.png"));
      // El prompt referencia la imagen adjunta para que el modelo la use.
      expect(args[args.length - 1]).toContain("gold.png");
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(casoDir, { recursive: true, force: true });
    }
  });

  it("un Caso-página sin Captura de Gold revienta con un error claro", async () => {
    const dir = mkdtempSync(join(tmpdir(), "runner-sin-gold-"));
    try {
      const sandbox = { ...fakeSandbox(), workDir: dir };
      const casoPagina = {
        ...caso,
        tipo: "caso-pagina" as const,
        goldPath: join(dir, "gold.html"),
        goldImagenPath: join(dir, "no-existe.png"),
      };

      await expect(
        runCaso(casoPagina, pin, {
          sandbox: factoryOf(sandbox),
          command: { run: vi.fn() },
        }),
      ).rejects.toThrow(/Captura de Gold/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

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

  it("parsea el formato real de opencode: → Skill \"nombre\" (sin prefijo de dos puntos)", async () => {
    const sandbox = fakeSandbox();
    const command: CommandRunner = {
      run: () => ({
        stdout: [
          "> build · deepseek-ai/DeepSeek-V4.1-Flash",
          '→ Skill "desy-implement-component" ',
          "> build · deepseek-ai/DeepSeek-V4.1-Flash",
          '→ Skill "desy-scaffold-project" ',
          '→ Skill "desy-choose-library" ',
        ].join("\n"),
        stderr: "",
        code: 0,
      }),
    };

    const resultado = await runCaso(caso, pin, { sandbox: factoryOf(sandbox), command });

    expect(resultado.transcript.invocaciones).toEqual([
      "implement-component",
      "scaffold-project",
      "choose-library",
    ]);
  });

  it("ignora los códigos ANSI y espacios de cola que opencode añade al nombre del skill", async () => {
    const sandbox = fakeSandbox();
    const command: CommandRunner = {
      run: () => ({
        stdout: '\u001b[0m→ \u001b[0mSkill "desy-implement-component" \n',
        stderr: "",
        code: 0,
      }),
    };

    const resultado = await runCaso(caso, pin, { sandbox: factoryOf(sandbox), command });

    expect(resultado.transcript.invocaciones).toEqual(["implement-component"]);
  });

  it("no confunde una mención cualquiera del nombre con una Invocación real", async () => {
    const sandbox = fakeSandbox();
    const command: CommandRunner = {
      run: () => ({
        stdout: 'Usaré desy-implement-component para esto. Skill "otro" no es invocación.\n',
        stderr: "",
        code: 0,
      }),
    };

    const resultado = await runCaso(caso, pin, { sandbox: factoryOf(sandbox), command });

    expect(resultado.transcript.invocaciones).toEqual([]);
  });

  it("extrae el Flujo observado aunque las Invocaciones lleguen por stderr (formato real de opencode)", async () => {
    // `opencode run` escribe las líneas `→ Skill "..."` por stderr, con ANSI,
    // y la prosa del modelo por stdout. El Flujo observado vive en stderr.
    const sandbox = fakeSandbox();
    const command: CommandRunner = {
      run: () => ({
        stdout: "Genero el botón primario con el macro componentButton.\n",
        stderr: [
          "opencode : \u001b[0m",
          "> build · deepseek-ai/DeepSeek-V4.1-Flash",
          '\u001b[0m→ \u001b[0mSkill "desy-implement-component" ',
          "> build · deepseek-ai/DeepSeek-V4.1-Flash",
          '\u001b[0m→ \u001b[0mSkill "desy-scaffold-project" ',
          '\u001b[0m→ \u001b[0mSkill "desy-validate-accessibility" ',
        ].join("\n"),
        code: 0,
      }),
    };

    const resultado = await runCaso(caso, pin, { sandbox: factoryOf(sandbox), command });

    expect(resultado.transcript.invocaciones).toEqual([
      "implement-component",
      "scaffold-project",
      "validate-accessibility",
    ]);
  });

  it("normaliza el nombre del Skill a la forma del Flujo canónico (sin prefijo desy-)", async () => {
    // El glosario define el Flujo canónico como
    // `preflight-check → recognizer → choose-page-template → implement-* → ...`
    // (sin prefijo). opencode imprime `desy-preflight-check`, así que el Flujo
    // observado debe hablar el mismo idioma que el Flujo canónico o los guards
    // de flujo fallarán siempre.
    const sandbox = fakeSandbox();
    const command: CommandRunner = {
      run: () => ({
        stdout: "",
        stderr: [
          '\u001b[0m→ \u001b[0mSkill "desy-preflight-check" ',
          '\u001b[0m→ \u001b[0mSkill "desy-implement-component" ',
          '\u001b[0m→ \u001b[0mSkill "desy-styles-reference" ',
        ].join("\n"),
        code: 0,
      }),
    };

    const resultado = await runCaso(caso, pin, { sandbox: factoryOf(sandbox), command });

    expect(resultado.transcript.invocaciones).toEqual([
      "preflight-check",
      "implement-component",
      "styles-reference",
    ]);
  });

  it("un Flujo observado normalizado satisface el guard de Flujo canónico", async () => {
    const sandbox = fakeSandbox([
      {
        path: "index.njk",
        contenido: '{{ componentButton({ "classes": "c-button--primary" }) }}',
      },
    ]);
    const command: CommandRunner = {
      run: () => ({
        stdout: "",
        stderr: [
          '\u001b[0m→ \u001b[0mSkill "desy-preflight-check" ',
          '\u001b[0m→ \u001b[0mSkill "desy-implement-component" ',
        ].join("\n"),
        code: 0,
      }),
    };

    const resultado = await runCaso(caso, pin, { sandbox: factoryOf(sandbox), command });

    const check: Check = {
      id: "flujo",
      severity: "guard",
      weight: 0,
      assert: { kind: "flujo_canonico", pasos: ["preflight-check", "implement-component"] },
    };
    const veredicto = grado(
      { artefactos: resultado.artefactos, transcript: resultado.transcript },
      { tipo: "caso-componente", checks: [check] },
    );

    expect(veredicto.detalle.find((d) => d.id === "flujo")?.passed).toBe(true);
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
