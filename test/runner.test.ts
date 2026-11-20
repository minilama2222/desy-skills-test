import { describe, expect, it, vi } from "vitest";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Caso, CasoComponente, Check } from "../src/caso.js";
import { grado } from "../src/grader.js";
import type { Pin } from "../src/pin.js";
import { pinLocal } from "../src/pin.js";
import {
  MODELO_FIJO,
  buildOpencodeArgs,
  configuracionDelSandbox,
  createSandbox,
  dirArtefactoDeCaso,
  entornoDelBuild,
  entornoDelSandbox,
  entornoDelSut,
  npmCommand,
  PERMISOS_DEL_SANDBOX,
  permisosDelSandbox,
  prosaDelSut,
  escriturasFueraDelSandbox,
  realCommand,
  runCaso,
  TIMEOUT_SUT_MS,
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
    // usuario y el HOME del sandbox deja de mandar (ADR-0013). Sin `--format
    // json`, el TUI se relanza con el cwd del padre y escribe en el repo del
    // harness (ticket 16, ADR-0019): el formato es lo que hace mandar al workDir.
    expect(buildOpencodeArgs(caso.prompt)).toEqual([
      "run",
      "--standalone",
      "--format",
      "json",
      "--model",
      "deepinfra/deepseek-ai/DeepSeek-V4.1-Flash-1017",
      caso.prompt,
    ]);
  });

  it("adjunta una imagen con --file cuando se pasa una Captura de Gold", () => {
    expect(buildOpencodeArgs("prompt", "gold.png")).toEqual([
      "run",
      "--standalone",
      "--format",
      "json",
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
      "arbolHash",
      "artefactos",
      "exitCode",
      "salida",
      "transcript",
    ]);
    expect(resultado.artefactos).toEqual({
      files: { "boton.html": "<button>Enviar</button>" },
    });
    // La salida cruda viaja sin fusionar: quien cite la prosa del SUT no puede
    // fiarse de un transcript donde stdout y stderr van mezclados.
    expect(resultado.salida).toEqual({ stdout: "» skill: implement-component\n", stderr: "" });
  });

  it("copia los skills del Pin al sandbox antes de ejecutar el SUT", async () => {
    const sandbox = fakeSandbox();
    const command: CommandRunner = {
      run: vi.fn(() => ({ stdout: "", stderr: "", code: 0 })),
    };

    await runCaso(caso, pin, { sandbox: factoryOf(sandbox), command });

    expect(sandbox.copySkills).toHaveBeenCalledOnce();
  });

  it("con un Pin remoto no pasa origen a copySkills: los skills salen de vendor/", async () => {
    // El Pin remoto no trae ruta. Antes, `runCaso` recibía el Pin y no lo leía, y
    // era lo mismo sacara de donde sacara los skills (ticket 05).
    const sandbox = fakeSandbox();

    await runCaso(caso, pin, {
      sandbox: factoryOf(sandbox),
      command: { run: () => ({ stdout: "", stderr: "", code: 0 }) },
    });

    expect(sandbox.copySkills).toHaveBeenCalledWith(undefined);
  });

  it("con un Pin local copia los skills de ese checkout, no de vendor/ (ticket 05)", async () => {
    const sandbox = fakeSandbox();
    // La ruta del Pin es el **checkout**; lo que se copia es su `skills/`, no él:
    // copiar la raíz entera metía un `skills/skills/` en el sandbox.
    const dir = mkdtempSync(join(tmpdir(), "checkout-"));
    try {
      mkdirSync(join(dir, "skills"), { recursive: true });
      const local = pinLocal(dir, "2026-10-29");

      await runCaso(caso, local, {
        sandbox: factoryOf(sandbox),
        command: { run: () => ({ stdout: "", stderr: "", code: 0 }) },
      });

      expect(sandbox.copySkills).toHaveBeenCalledWith(join(dir, "skills"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("con un Pin local apuntando a algo sin skills/ falla en voz alta, no mide un árbol vacío", async () => {
    const dir = mkdtempSync(join(tmpdir(), "checkout-vacio-"));
    try {
      await expect(
        runCaso(caso, pinLocal(dir, "2026-10-29"), {
          sandbox: factoryOf(fakeSandbox()),
          command: { run: () => ({ stdout: "", stderr: "", code: 0 }) },
        }),
      ).rejects.toThrow(/skills/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("copySkills corre el árbol que se le da, no vendor/: el sandbox del ticket 05", () => {
    // Sin este test, pasar `origen` al sandbox quedaría sin cubrir: los dobles de
    // arriba aceptan cualquier argumento y no copian nada.
    const dir = mkdtempSync(join(tmpdir(), "skills-local-"));
    try {
      mkdirSync(join(dir, "desy-preflight-check"), { recursive: true });
      writeFileSync(join(dir, "desy-preflight-check", "SKILL.md"), "versión local", "utf8");
      // Un `.git/` en el origen —lo que trae un checkout entero— no es una skill.
      mkdirSync(join(dir, ".git"), { recursive: true });
      writeFileSync(join(dir, ".git", "HEAD"), "ref: refs/heads/master", "utf8");
      const sandbox = createSandbox();
      try {
        sandbox.copySkills(dir);
        expect(
          readFileSync(join(sandbox.skillsDir, "desy-preflight-check", "SKILL.md"), "utf8"),
        ).toBe("versión local");
        expect(
          existsSync(join(sandbox.skillsDir, "desy-preflight-check")),
          "la skill del origen tiene que haber llegado",
        ).toBe(true);
        expect(
          existsSync(join(sandbox.skillsDir, "desy-preflight-check", "SKILL.md")),
        ).toBe(true);
        expect(existsSync(join(sandbox.skillsDir, ".git")), "el .git/ no entra").toBe(false);
        expect(
          existsSync(join(sandbox.skillsDir, "desy-implement-component")),
          "un árbol local no arrastra los skills de vendor/",
        ).toBe(false);
      } finally {
        sandbox.cleanup();
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("VENDOR_SKILLS_DIR sigue siendo el origen por defecto de copySkills", () => {
    // Sin argumento, el sandbox copia los skills vendidos: es lo que garantiza
    // que un Pin remoto sigue midiendo vendor/ y no un árbol vacío.
    const sandbox = createSandbox();
    try {
      sandbox.copySkills();
      expect(existsSync(join(sandbox.skillsDir, "desy-preflight-check", "SKILL.md"))).toBe(true);
    } finally {
      sandbox.cleanup();
    }
  });

  it("ejecuta opencode con un cwd limpio y el entorno del sandbox", async () => {
    const sandbox = fakeSandbox();
    const run = vi.fn(() => ({ stdout: "", stderr: "", code: 0 }));
    const command: CommandRunner = { run };

    await runCaso(caso, pin, { sandbox: factoryOf(sandbox), command });

    const [, opts] = run.mock.calls[0] as unknown as [string[], { cwd: string; env: Entorno }];
    expect(opts.cwd).toBe(sandbox.workDir);
    // `OPENCODE_HOME` fija el directorio de datos (sesiones y `auth.json`): si no
    // se fija, V2 escribe en el del usuario real (ADR-0013). `PWD` va con el
    // `workDir`: `spawnSync({ cwd })` no lo mueve y las rutas relativas del SUT se
    // resuelven contra `PWD` (ticket 16, ADR-0019). `XDG_CONFIG_HOME` es la
    // **raíz** (`<home>/.config`), no `configDir`: V2 le añade `opencode` para
    // encontrar `opencode.jsonc` y `skills/` (retro del ticket 19).
    expect(opts.env).toEqual({
      HOME: sandbox.home,
      PWD: sandbox.workDir,
      XDG_CONFIG_HOME: join(sandbox.home, ".config"),
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

  it("un stdout JSONL se decodifica: el artefacto tiene saltos de línea reales (ticket 29)", async () => {
    // Lo que `opencode run --format json` escribe: una línea por evento, con el
    // texto del modelo escapado dentro. Sin decodificar, la tabla de la respuesta
    // no tiene ni una línea y los Checks de fila no pueden pasar.
    const sandbox = fakeSandbox();
    const evento = (part: object) => JSON.stringify({ type: "x", part });
    const command: CommandRunner = {
      run: () => ({
        stdout: [
          evento({ type: "step-start" }),
          evento({ type: "text", text: "| Nº | Componente |\n| 1 | input-group |" }),
        ].join("\n"),
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

    const texto = Object.values(resultado.artefactos.files).join("\n");
    expect(texto.split("\n")).toContain("| 1 | input-group |");
    // El log crudo no se pierde: es de donde se lee el Flujo y la Evidencia.
    expect(resultado.salida.stdout).toContain("\"type\":\"step-start\"");
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

/**
 * Ticket 16: el SUT escribió en `src/pages/` del **repo del harness**, no en su
 * sandbox, y el Caso salía `sin-artefacto` con el árbol ensuciado.
 *
 * Estas pruebas fijan la mitad que no necesita el binario: la regla que dice qué
 * es una fuga, y que `realCommand` la aplica **con un proceso real** mientras
 * corre. El lado del binario —que `--format json` de verdad escribe en el
 * `workDir`— se midió a mano con la 2.2.1 (ADR-0019) y lo vuelve a medir el
 * smoke de la suite sobre el SUT falso, que corre desde el repo.
 */

/**
 * Ticket 16, la causa medida: el SUT resuelve las rutas relativas contra `PWD`,
 * no contra el `cwd` del proceso, y `spawnSync({ cwd })` no toca `PWD`.
 *
 * El `PWD` lo pinta `entornoDelSandbox` (el entorno del SUT se compone ahí, una
 * sola vez, para que doble y `realCommand` reciban lo mismo); `entornoDelSut`
 * fusiona ese entorno con el del lanzador y le quita la sesión de quien lanza.
 */
describe("entornoDelSut (ticket 16)", () => {
  const workDir = "/tmp/desy-sut-abc/work";

  it("el entorno del sandbox manda: el `PWD` del lanzador no gana", () => {
    // Con el `PWD` heredado, `shell pwd` da el repo y `write src/x.html` acaba
    // allí; con `PWD=<workDir>`, los dos dan el sandbox (medido con la 2.2.1).
    const env = entornoDelSut(
      { PWD: "/repo", HOME: "/Users/yo" },
      { HOME: workDir + "/../home", PWD: workDir },
    );
    expect(env.PWD).toBe(workDir);
    expect(env.HOME).toBe(workDir + "/../home");
  });

  it("no hereda la sesión del lanzador: se engancharía al proyecto de esa sesión", () => {
    const env = entornoDelSut(
      { OPENCODE_SESSION_ID: "ses_x", OPENCODE_TERMINAL: "1", AI_AGENT: "opencode", PATH: "/usr/bin:/bin" },
      {},
    );
    expect(env).not.toHaveProperty("OPENCODE_SESSION_ID");
    expect(env).not.toHaveProperty("OPENCODE_TERMINAL");
    expect(env).not.toHaveProperty("AI_AGENT");
    // Lo demás del lanzador sí viaja: la clave de proveedor y el PATH del usuario.
    expect(env.PATH).toBe("/usr/bin:/bin");
  });
});

describe("el SUT no escribe fuera de su sandbox (ticket 16)", () => {
  const repo = "/repo";
  const workDir = "/tmp/desy-sut-abc/work";
  const base = "/tmp";

  it("una escritura dentro del workDir es el trabajo del SUT, no una fuga", () => {
    expect(
      escriturasFueraDelSandbox([`${workDir}/src/boton-enviar.html`], { repoRoot: repo, workDir, baseSandbox: base }),
    ).toEqual([]);
  });

  it("el home del sandbox tampoco es una fuga: es estado del propio proceso", () => {
    expect(
      escriturasFueraDelSandbox(["/tmp/desy-sut-abc/home/.config/opencode/opencode.jsonc"], {
        repoRoot: repo,
        workDir,
        baseSandbox: base,
      }),
    ).toEqual([]);
  });

  it("el mismo fichero escrito en el repo es una fuga: es el hallazgo, entero", () => {
    // El escenario adversario completo: la ruta del bug real, en el repo.
    const fuga = "/repo/src/pages/boton-enviar.html";
    expect(escriturasFueraDelSandbox([fuga], { repoRoot: repo, workDir, baseSandbox: base })).toEqual([
      fuga,
    ]);
  });

  it("compara por segmento, no por prefijo: `/repo2` no está dentro de `/repo`", () => {
    expect(
      escriturasFueraDelSandbox(["/repo2/src/pages/x.html"], { repoRoot: repo, workDir, baseSandbox: base }),
    ).toEqual([]);
  });

  it("una ruta con `\\` de Windows se compara igual que con `/`", () => {
    // El vigilante recibe rutas absolutas de la plataforma: en Windows llegan con
    // `\`. Comparar contra `/` fijo hacía que ninguna casara y no acusara nunca
    // (lo cazó el CI en Windows).
    const win = "C:\\repo";
    const trabajoWin = "C:\\sandboxes\\desy-sut-abc\\work";
    const fuga = "C:\\repo\\src\\pages\\boton-enviar.html";
    expect(
      escriturasFueraDelSandbox([fuga], { repoRoot: win, workDir: trabajoWin, baseSandbox: "C:\\sandboxes" }),
    ).toEqual([fuga]);
    // Y el workDir de Windows también cuenta como dentro.
    expect(
      escriturasFueraDelSandbox([trabajoWin + "\\src\\x.html"], {
        repoRoot: win,
        workDir: trabajoWin,
        baseSandbox: "C:\\sandboxes",
      }),
    ).toEqual([]);
  });

  it("lo que no está en el repo no lo juzga este vigilante (ADR-0013 se ocupa de eso)", () => {
    expect(
      escriturasFueraDelSandbox(["/otro/sitio/fichero.txt"], { repoRoot: repo, workDir, baseSandbox: base }),
    ).toEqual([]);
  });

  it("realCommand acusa al SUT que escribe en el repo y no devuelve la Ejecución", () => {
    // Proceso de verdad, pero **no** el `opencode` de la máquina: un nodo que
    // escribe "el artefacto" en el repo de prueba y sale con 0. Sin el vigilante,
    // el runner lo daría por bueno y el artefacto se quedaría fuera del sandbox.
    //
    // Tres sitios distintos, como en la realidad: el repo que se vigila, la base
    // de sandboxes (el temporal: sus `desy-sut-*` no son fuga) y el sitio del
    // guion, que no es ninguno de los dos.
    const raiz = mkdtempSync(join(tmpdir(), "vigilante-"));
    const repo = join(raiz, "repo");
    const sandboxes = join(raiz, "sandboxes");
    const hijo = join(raiz, "hijo.mjs");
    const trabajo = join(sandboxes, "desy-sut-abc", "work");
    mkdirSync(repo, { recursive: true });
    mkdirSync(trabajo, { recursive: true });
    writeFileSync(
      hijo,
      [
        'import { mkdirSync, writeFileSync } from "node:fs";',
        'import { join } from "node:path";',
        'const raiz = process.argv[2];',
        'mkdirSync(join(raiz, "src"), { recursive: true });',
        'writeFileSync(join(raiz, "src", "boton-enviar.html"), "{# fuga #}");',
        'process.stdout.write("escrito\\n");',
      ].join("\n"),
      "utf8",
    );
    try {
      expect(() =>
        realCommand.run([], {
          cwd: trabajo,
          env: {
            // Punto de inyección: el binario es, para este test, este nodo. La
            // raíz que se vigila y la base de sandboxes son las del test.
            DESY_OPENCODE_BIN: process.execPath,
            DESY_OPENCODE_ARGS: JSON.stringify([hijo, repo]),
            DESY_REPO_ROOT: repo,
            DESY_SANDBOX_BASE: sandboxes,
          },
        }),
      ).toThrow(/fuera de su sandbox[\s\S]*src[\\/]boton-enviar\.html/);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it("control: el mismo SUT escribiendo en su workDir no se acusa", () => {
    // Mismo escenario, con la única condición que levanta la prohibición: el
    // fichero va al `workDir`. Sin este control, el verde de arriba podría venir
    // de un vigilante que no ve nada.
    const falso = mkdtempSync(join(tmpdir(), "opencode-falso-"));
    const hijo = join(falso, "hijo.mjs");
    const trabajo = join(falso, "work");
    mkdirSync(trabajo, { recursive: true });
    writeFileSync(
      hijo,
      [
        'import { mkdirSync, writeFileSync } from "node:fs";',
        'const raiz = process.argv[2];',
        'mkdirSync(raiz + "/src", { recursive: true });',
        'writeFileSync(raiz + "/src/boton-enviar.html", "{# bien #}");',
        'process.stdout.write("escrito\\n");',
      ].join("\n"),
      "utf8",
    );
    try {
      const r = realCommand.run([], {
        cwd: trabajo,
        env: {
          // El nodo corre el guion, y el guion escribe en el `workDir`, que es
          // la base de sandbox de este repo de prueba.
          DESY_OPENCODE_BIN: process.execPath,
          DESY_OPENCODE_ARGS: JSON.stringify([hijo, trabajo]),
          DESY_REPO_ROOT: falso,
        },
      });
      expect(r.code).toBe(0);
      expect(r.stdout).toBe("escrito\n");
      expect(existsSync(join(trabajo, "src", "boton-enviar.html"))).toBe(true);
    } finally {
      rmSync(falso, { recursive: true, force: true });
    }
  });
});

/**
 * Ticket 21. En la suite del 19/11/2026 dos Ejecuciones de
 * `politicas-privacidad` se quedaron 18 y 20 min con el stream del proveedor
 * mudo: 0 % de CPU, sin escribir en su log y con el socket `ESTABLISHED` pero
 * sin datos. No había ningún techo, así que la suite no seguía; el único que
 * las cortó fue una persona. Y al cortarlas a mano quedaron como fallo del
 * skill, que es la segunda mitad del problema.
 *
 * Este test fija la primera mitad con un proceso real (un nodo que duerme),
 * inyectado como en el resto del fichero: nunca se lanza el `opencode` de la
 * máquina.
 */
describe("el SUT que deja de responder no cuelga la suite (ticket 21)", () => {
  it("el techo por defecto es holgado: 20 min de pared", () => {
    // Si alguien lo baja a unos segundos, empezarán a cortarse intentos
    // legítimos (los normales tardan 1-6 min) y la medida se perderá en silencio.
    expect(TIMEOUT_SUT_MS).toBe(20 * 60 * 1000);
  });

  it("corta al llegar al techo, conserva lo andado y lo nombra en la Evidencia", () => {
    const falso = mkdtempSync(join(tmpdir(), "opencode-mudo-"));
    const hijo = join(falso, "mudo.mjs");
    const trabajo = join(falso, "work");
    mkdirSync(trabajo, { recursive: true });
    writeFileSync(
      hijo,
      [
        // Lo que un SUT real hace antes de quedarse mudo: algo escribe.
        'process.stdout.write("empiezo\\n");',
        // Y después no vuelve nunca: 60 s de reloj, muy por encima del techo.
        "setTimeout(() => {}, 60_000);",
      ].join("\n"),
      "utf8",
    );
    try {
      const antes = Date.now();
      const r = realCommand.run([], {
        cwd: trabajo,
        env: {
          DESY_OPENCODE_BIN: process.execPath,
          DESY_OPENCODE_ARGS: JSON.stringify([hijo]),
          DESY_REPO_ROOT: falso,
          DESY_SUT_TIMEOUT_MS: "800",
        },
      });
      // Lo que se mide es que **vuelve**: sin techo, este test no terminaría.
      expect(Date.now() - antes).toBeLessThan(15_000);
      expect(r.code).not.toBe(0);
      // Y que lo dice con la causa, no con un `exit 1` pelado que se leería
      // como fallo del skill.
      expect(r.stderr).toMatch(/no respondió en 800 ms/);
      expect(r.stderr).toMatch(/No es un fallo del skill/);
      // La salida parcial no se tira: es lo que el SUT alcanzó a decir.
      expect(r.stdout).toContain("empiezo");
    } finally {
      rmSync(falso, { recursive: true, force: true });
    }
  });
});

/**
 * Ticket 22, la decisión del mantenedor: el Caso-página se puntúa sobre `dist/`
 * (ADR-0006) y el SUT **no tiene shell** para compilar (sus permisos son
 * read/edit/glob/grep/list/skill; medido en la suite del 20/11: 0 usos de bash
 * en 47 Ejecuciones, y el propio SUT escribió «no shell tool is available»).
 *
 * Compila el harness, siempre, y no como reacción a un fallo del SUT: no hay
 * señal fiable de «lo intentó». Un build roto del fuente no lleva marca (es del
 * SUT); que falte `npm` o se pase del techo sí (es del entorno).
 */
describe("el harness compila el Caso-página (ticket 22)", () => {
  const montar = async (tipo: "caso-pagina" | "caso-componente") => {
    const raiz = mkdtempSync(join(tmpdir(), "caso-compila-"));
    const trabajo = join(raiz, "work");
    mkdirSync(trabajo, { recursive: true });
    const gold = join(raiz, "gold.png");
    writeFileSync(gold, "png", "utf8");
    const llamadas: { args: string[]; cwd: string }[] = [];
    const dirs: string[] = [];
    const caso: Caso =
      tipo === "caso-pagina"
        ? {
            tipo,
            skill: "implement-pattern",
            id: "patron-pagina",
            prompt: "Maqueta la página",
            checks: [],
            goldPath: join(raiz, "gold.html"),
            goldImagenPath: gold,
          }
        : {
            tipo,
            skill: "implement-component",
            id: "boton-primario",
            prompt: "Genera un botón",
            checks: [],
          };
    const evidencia = await runCaso(
      caso,
      pin,
      {
        sandbox: {
          create: () => ({
            workDir: trabajo,
            home: trabajo,
            configDir: trabajo,
            skillsDir: trabajo,
            copySkills: () => {},
            configurar: () => {},
            listArtefactos: (dir: string) => {
              dirs.push(dir);
              return dir === "dist"
                ? [{ path: "dist/pagina.html", contenido: "<h1>Página</h1>" }]
                : [];
            },
            cleanup: () => {},
          }),
        },
        command: { run: () => ({ stdout: "", stderr: "", code: 0 }) },
        build: {
          run: (args, opts) => {
            llamadas.push({ args, cwd: opts.cwd });
            return { stdout: "", stderr: "vite: plantilla rota", code: 1 };
          },
        },
      },
    );
    return { raiz, trabajo, llamadas, dirs, evidencia };
  };

  it("compila antes de recoger y gradúa el dist/, no el fuente", async () => {
    const { raiz, trabajo, llamadas, dirs, evidencia } = await montar("caso-pagina");
    try {
      expect(llamadas).toEqual([{ args: ["run", "build"], cwd: trabajo }]);
      expect(dirs).toEqual(["dist"]);
      expect(evidencia.artefactos.files).toEqual({
        "dist/pagina.html": "<h1>Página</h1>",
      });
      // La salida del build queda en la Evidencia, que es donde se lee el porqué.
      expect(evidencia.salida.stderr).toContain("vite: plantilla rota");
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });

  it("un Caso-componente no compila: su artefacto es el fuente", async () => {
    const { raiz, llamadas, dirs } = await montar("caso-componente");
    try {
      expect(llamadas).toEqual([]);
      expect(dirs).toEqual(["src"]);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});

/**
 * Ticket 25: el build del harness moría antes de compilar. `npmCommand` recibía
 * el entorno **cerrado** del sandbox —`HOME`, `PWD`, `XDG_CONFIG_HOME`,
 * `OPENCODE_HOME` y las claves del proveedor, sin `PATH`— y `spawnSync("npm")`
 * devolvía `ENOENT`. En la suite del 20/11 los 6 intentos del Caso-página
 * acabaron así, y 3 de ellos sí habían escrito su HTML.
 *
 * El build no es el SUT: es una herramienta de quien mide y necesita resolver
 * `npm`. Lo que no puede pasar es que ese `PATH` se cuele en el entorno del SUT.
 */
describe("npmCommand: el build resuelve npm con el PATH del harness (ticket 25)", () => {
  it("entornoDelBuild añade el PATH del harness sin tocar el del sandbox", () => {
    const delSandbox: Entorno = { HOME: "/home/sandbox", PWD: "/work" };
    const delBuild = entornoDelBuild(delSandbox);

    expect(delBuild.HOME).toBe("/home/sandbox");
    expect(delBuild.PATH).toBe(process.env.PATH);
    // El entorno del sandbox no se muta: es el mismo objeto que usa el SUT.
    expect(delSandbox).not.toHaveProperty("PATH");
  });

  it("sin PATH en el harness, el entorno del sandbox se queda como estaba", () => {
    const anterior = process.env.PATH;
    delete process.env.PATH;
    try {
      const delSandbox: Entorno = { HOME: "/home/sandbox" };
      expect(entornoDelBuild(delSandbox)).toEqual(delSandbox);
    } finally {
      if (anterior !== undefined) process.env.PATH = anterior;
    }
  });

  it("el entorno del sandbox sigue sin PATH: el SUT no gana variables", () => {
    const delSandbox = entornoDelSandbox({
      home: "/home/sandbox",
      configDir: "/home/sandbox/.config/opencode",
      workDir: "/work",
      authOrigen: "/no/existe.json",
    });
    expect(delSandbox).not.toHaveProperty("PATH");
  });

  // Proceso real a propósito: el fallo fue un `ENOENT` del propio `spawnSync`, y
  // un `CommandRunner` doble nunca busca un binario, así que no puede verlo. En
  // Windows se salta porque allí `npm` es un `npm.cmd` y `spawn` no lo lanza sin
  // `shell` — ese rojo sería otro asunto (y no es el que este ticket arregla).
  it.skipIf(process.platform === "win32")(
    "encuentra npm aunque el entorno del sandbox no traiga PATH",
    () => {
      const cwd = mkdtempSync(join(tmpdir(), "desy-npm-"));
      try {
        const r = npmCommand.run(["--version"], { cwd, env: { HOME: cwd } });

        expect(r.code).toBe(0);
        expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
        expect(r.stderr).not.toContain("ENOENT");
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    },
  );
});

/**
 * Ticket 27: los `assets/` de un skill viven en el `HOME` del sandbox, fuera del
 * `workDir`, y `external_directory: deny` los bloqueaba. `desy-component-recognizer`
 * pedía leer su catálogo y recibía `Permission denied: external_directory` 11
 * veces en la suite del 20/11: el Caso parecía un fallo del skill y era el sandbox.
 *
 * La excepción es **una carpeta**, no el disco: el resto de `external_directory`
 * sigue denegado.
 */
describe("permisosDelSandbox: los assets del skill, y nada más (ticket 27)", () => {
  const conSandbox = (fn: (skillsDir: string) => void) => {
    const raiz = mkdtempSync(join(tmpdir(), "permisos-"));
    const skillsDir = join(raiz, "home", ".config", "opencode", "skills");
    mkdirSync(skillsDir, { recursive: true });
    try {
      fn(skillsDir);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  };

  it("añade una excepción para la carpeta de skills, al final", () => {
    conSandbox((skillsDir) => {
      const permisos = permisosDelSandbox(skillsDir);
      const ultima = permisos.at(-1);

      expect(ultima).toEqual({
        action: "external_directory",
        resource: `${skillsDir}/*`,
        effect: "allow",
      });
      // La base se conserva: la negación general sigue estando, y antes.
      expect(permisos).toContainEqual({
        action: "external_directory",
        resource: "*",
        effect: "deny",
      });
      expect(permisos.indexOf(ultima!)).toBeGreaterThan(
        permisos.findIndex((p) => p.action === "external_directory" && p.resource === "*"),
      );
      expect(PERMISOS_DEL_SANDBOX).toHaveLength(permisos.length - 1);
    });
  });

  it("la excepción no abre el disco: su recurso es una carpeta, no `*`", () => {
    conSandbox((skillsDir) => {
      const [excepcion] = permisosDelSandbox(skillsDir).slice(-1);
      expect(excepcion!.resource).not.toBe("*");
      expect(excepcion!.resource.endsWith("/*")).toBe(true);
      // Y sigue sin haber ningún `allow` general de `external_directory`.
      expect(
        permisosDelSandbox(skillsDir).filter(
          (p) => p.action === "external_directory" && p.effect === "allow" && p.resource === "*",
        ),
      ).toEqual([]);
    });
  });

  it("la configuración del sandbox la usa, y apunta a su propio skillsDir", () => {
    conSandbox((skillsDir) => {
      const config = configuracionDelSandbox({ home: join(skillsDir, "../../.."), skillsDir }) as {
        permissions: { action: string; resource: string; effect: string }[];
        skills: string[];
      };
      expect(config.permissions.at(-1)).toEqual({
        action: "external_directory",
        resource: `${skillsDir}/*`,
        effect: "allow",
      });
      expect(config.skills).toEqual([skillsDir]);
    });
  });
});

/**
 * Ticket 29: `salida.md` de un Caso-decisión era el log JSONL, con el texto del
 * modelo escapado en una sola línea. Los Checks que miran filas de tabla no veían
 * ninguna: `reconocimiento-login` daba 0 de 6 por el formato. El ADR-0011 dice que
 * el Artefacto es «el texto que el SUT emitió», así que se decodifica.
 */
describe("prosaDelSut: el artefacto de un Caso-decisión es la prosa (ticket 29)", () => {
  const evento = (part: object) => JSON.stringify({ type: "x", part });

  it("decodifica los textos del JSONL y deja saltos de línea reales", () => {
    const stdout = [
      evento({ type: "step-start" }),
      evento({ type: "text", text: "## Identificación\n\n| 1 | input-group |" }),
      JSON.stringify({ type: "tool_use", part: { type: "tool", tool: "read" } }),
      evento({ type: "text", text: "Fin." }),
    ].join("\n");

    const prosa = prosaDelSut(stdout);

    expect(prosa).toContain("| 1 | input-group |");
    // La fila de la tabla es una línea de verdad, no un trozo escapado.
    expect(prosa.split("\n")).toContain("| 1 | input-group |");
    expect(prosa).not.toContain("\\n");
  });

  it("si el stdout no es JSONL, devuelve lo que llegó (un doble no lo rompe)", () => {
    expect(prosaDelSut("una respuesta en texto plano")).toBe("una respuesta en texto plano");
  });

  it("un stdout JSONL sin textos no se queda vacío: cae al crudo", () => {
    const stdout = evento({ type: "step-start" });
    expect(prosaDelSut(stdout)).toBe(stdout);
  });
});
