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
import type { CasoComponente, Check } from "../src/caso.js";
import { grado } from "../src/grader.js";
import type { Pin } from "../src/pin.js";
import { pinLocal } from "../src/pin.js";
import {
  MODELO_FIJO,
  buildOpencodeArgs,
  configuracionDelSandbox,
  createSandbox,
  dirArtefactoDeCaso,
  entornoDelSut,
  escriturasFueraDelSandbox,
  realCommand,
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
    // resuelven contra `PWD` (ticket 16, ADR-0019).
    expect(opts.env).toEqual({
      HOME: sandbox.home,
      PWD: sandbox.workDir,
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
