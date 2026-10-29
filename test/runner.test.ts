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
  configuracionDelSandbox,
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
  repo: "https://bitbucket.org/sdaragon/desy-skills",
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
  configurar: vi.fn(),
  listArtefactos: vi.fn(() => artefactos),
  cleanup: vi.fn(),
});

describe("MODELO_FIJO", () => {
  it("es el modelo con el que corre el agente que ejecuta la suite (ADR-0013)", () => {
    expect(MODELO_FIJO).toBe("deepinfra/deepseek-ai/DeepSeek-V4.1-Flash-1017");
  });
});

describe("buildOpencodeArgs", () => {
  it("lanza opencode run en --standalone (servidor privado) con el modelo fijado y el prompt", () => {
    // Sin `--standalone`, `run` se conecta al servicio de fondo compartido del
    // usuario y el HOME del sandbox deja de mandar (ADR-0013).
    expect(buildOpencodeArgs(caso.prompt)).toEqual([
      "run",
      "--standalone",
      "--model",
      "deepinfra/deepseek-ai/DeepSeek-V4.1-Flash-1017",
      caso.prompt,
    ]);
  });

  it("adjunta una imagen con --file cuando se pasa una Captura de Gold", () => {
    expect(buildOpencodeArgs("prompt", "gold.png")).toEqual([
      "run",
      "--standalone",
      "--model",
      "deepinfra/deepseek-ai/DeepSeek-V4.1-Flash-1017",
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

  it("el Caso-decisión no tiene directorio de artefacto: su salida es la prosa del SUT", () => {
    expect(dirArtefactoDeCaso("caso-decision")).toBeNull();
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

    expect(Object.keys(resultado).sort()).toEqual([
      "artefactos",
      "exitCode",
      "transcript",
    ]);
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
    // `OPENCODE_HOME` fija el directorio de datos (sesiones y `auth.json`): si no
    // se fija, V2 escribe en el del usuario real (ADR-0013).
    expect(opts.env).toEqual({
      HOME: sandbox.home,
      XDG_CONFIG_HOME: sandbox.configDir,
      OPENCODE_HOME: "C:/sandbox/home/.local/share/opencode",
    });
  });

  it("configura el sandbox (config de aislamiento + auth) antes de lanzar el SUT", async () => {
    const orden: string[] = [];
    const sandbox: Sandbox = {
      ...fakeSandbox(),
      copySkills: vi.fn(() => orden.push("copySkills")),
      configurar: vi.fn(() => orden.push("configurar")),
    };
    const command: CommandRunner = {
      run: () => {
        orden.push("run");
        return { stdout: "", stderr: "", code: 0 };
      },
    };

    await runCaso(caso, pin, { sandbox: factoryOf(sandbox), command });

    expect(orden).toEqual(["copySkills", "configurar", "run"]);
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

  it("un Caso-decisión toma como artefacto la prosa que el SUT emitió por stdout", async () => {
    // Un Caso-decisión no escribe ficheros: lo que se gradúa es su decisión, y
    // la decisión vive en el texto que imprimió. El artefacto es ese texto.
    const sandbox = fakeSandbox();
    const command: CommandRunner = {
      run: () => ({
        stdout:
          "| Nº | Componente | Variante |\n| 1 | input-group | text |\n",
        stderr: '→ Skill "desy-component-recognizer"\n',
        code: 0,
      }),
    };
    const decision = {
      tipo: "caso-decision" as const,
      skill: "component-recognizer",
      id: "login",
      prompt: "¿Qué componentes tiene esta imagen?",
      checks: [],
    };

    const resultado = await runCaso(decision, pin, {
      sandbox: factoryOf(sandbox),
      command,
    });

    expect(sandbox.listArtefactos).not.toHaveBeenCalled();
    expect(Object.values(resultado.artefactos.files).join("\n")).toContain("input-group");
    expect(resultado.transcript.invocaciones).toEqual(["component-recognizer"]);
  });

  it("el artefacto de un Caso-decisión son los dos streams del SUT (prosa + invocaciones)", async () => {
    const sandbox = fakeSandbox();
    const command: CommandRunner = {
      run: () => ({
        stdout: "Recomiendo desy-angular (Angular 19).\n",
        stderr: '→ Skill "desy-choose-library"\n',
        code: 0,
      }),
    };
    const decision = {
      tipo: "caso-decision" as const,
      skill: "choose-library",
      id: "webapp-gestion",
      prompt: "¿Qué librería uso?",
      checks: [],
    };

    const resultado = await runCaso(decision, pin, {
      sandbox: factoryOf(sandbox),
      command,
    });

    const texto = Object.values(resultado.artefactos.files).join("\n");
    expect(texto).toContain("desy-angular");
  });

  it("un Caso-decisión adjunta su mockup (input/mockup.png) al prompt", async () => {
    const dir = mkdtempSync(join(tmpdir(), "runner-mockup-"));
    const casoDir = mkdtempSync(join(tmpdir(), "runner-caso-"));
    try {
      const mockup = join(casoDir, "mockup.png");
      writeFileSync(mockup, "PNG");
      const sandbox = { ...fakeSandbox(), workDir: dir };
      const run = vi.fn(() => ({ stdout: "", stderr: "", code: 0 }));
      const decision = {
        tipo: "caso-decision" as const,
        skill: "component-recognizer",
        id: "login",
        prompt: "¿Qué componentes tiene esta imagen?",
        checks: [],
        mockupImagenPath: mockup,
      };

      await runCaso(decision, pin, { sandbox: factoryOf(sandbox), command: { run } });

      const [args] = run.mock.calls[0] as unknown as [string[]];
      expect(args).toContain("--file");
      const i = args.indexOf("--file");
      expect(args[i + 1]).toBe(join(dir, "mockup.png"));
      expect(args[args.length - 1]).toContain("mockup.png");
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(casoDir, { recursive: true, force: true });
    }
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

describe("configuracionDelSandbox", () => {
  const sandbox = { home: "/tmp/sut/home", skillsDir: "/tmp/sut/home/.config/opencode/skills" };

  it("solo deja usar el proveedor del modelo fijado (V2 no tiene enabled_providers)", () => {
    const config = configuracionDelSandbox(sandbox) as {
      policies: { action: string; resource: string; effect: string }[];
    };

    // Orden: la última regla que casa gana, así que el `allow` va después.
    expect(config.policies).toEqual([
      { action: "provider.use", resource: "*", effect: "deny" },
      { action: "provider.use", resource: "deepinfra", effect: "allow" },
    ]);
  });

  it("niega shell, red, subagentes y ficheros externos, y permite lo que el Caso necesita", () => {
    const permisos = (configuracionDelSandbox(sandbox) as {
      permissions: { action: string; resource: string; effect: string }[];
    }).permissions;
    const efectoDe = (action: string) =>
      [...permisos].reverse().find((p) => p.action === action && p.resource === "*")?.effect;

    // La base es deny y no allow: una acción que V2 añada mañana queda cerrada.
    expect(permisos[0]).toEqual({ action: "*", resource: "*", effect: "deny" });
    expect(efectoDe("*")).toBe("deny");
    expect(efectoDe("external_directory")).toBe("deny");
    for (const permitida of ["read", "edit", "glob", "grep", "skill"]) {
      expect(efectoDe(permitida)).toBe("allow");
    }
  });

  it("declara como fuente de skills el skillsDir del sandbox, no el HOME real", () => {
    expect(
      (configuracionDelSandbox(sandbox) as { skills: string[] }).skills,
    ).toEqual([sandbox.skillsDir]);
  });
});
