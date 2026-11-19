import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CasoComponente } from "../src/caso.js";
import { readPin } from "../src/pin.js";
import {
  createSandbox,
  datosDirDeHome,
  runCaso,
  type CommandRunner,
  type Entorno,
} from "../src/runner.js";
import { REPO_ROOT } from "../src/repo.js";

const pin = readPin(join(process.cwd(), "pin.json"));

/**
 * Un `auth.json` de fixture: el smoke nunca lee el del usuario. Si lo leyera, su
 * clave entraría en el entorno del SUT y una aserción fallida la volcaría en el
 * log de la suite (ticket 15).
 */
function authDeFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "auth-fixture-"));
  const path = join(dir, "auth.json");
  writeFileSync(path, JSON.stringify({ deepinfra: { type: "api", key: "clave-de-fixture" } }));
  return path;
}

const caso: CasoComponente = {
  tipo: "caso-componente",
  skill: "implement-component",
  id: "boton-primario",
  prompt: "Genera un botón primario tamaño estándar con texto 'Enviar'",
  checks: [],
};

/**
 * Los ficheros sin rastrear del repo, antes y después de la Ejecución. Es la
 * pregunta de aislamiento do día: **¿apareció algo en el árbol del harness?**, no
 * «¿qué variables recibe el comando?». El smoke afirmaba el `cwd` del proceso y
 * ése era correcto mientras cada corrida real escribía en el repo (ADR-0019).
 */
function sinRastrear(): string[] {
  const r = spawnSync("git", ["status", "--porcelain"], { cwd: REPO_ROOT, encoding: "utf8" });
  return (r.stdout ?? "")
    .split("\n")
    .filter((linea) => linea.startsWith("?? "))
    .map((linea) => linea.slice(3).trim());
}

describe("runCaso (smoke de integración con sandbox real)", () => {
  it("crea el sandbox, copia los skills del Pin, corre opencode y captura Evidencia, y limpia", async () => {
    let sandboxCreado: ReturnType<typeof createSandbox> | undefined;
    let entornoVisto: Entorno | undefined;
    let cwdVisto: string | undefined;
    let promptVisto: string | undefined;
    let skillsDuranteElRun: boolean | undefined;
    let skillsDeclaradas: string[] | undefined;
    let skillsDeclaradasExisten: boolean | undefined;
    let desdeElSandbox: { pwdReemplazado: boolean; relativaResueltaDentro: boolean } | undefined;

    // El SUT escribe su artefacto en el `src/` del sandbox, como el de verdad: es
    // la entrega del Caso-componente (ADR-0006). Escribirlo desde el doble es lo
    // que deja al smoke preguntar **dónde** cayó el fichero.
    const command: CommandRunner = {
      run: (args, opts) => {
        cwdVisto = opts.cwd;
        entornoVisto = opts.env;
        promptVisto = args[args.length - 1];
        skillsDuranteElRun = existsSync(
          // `XDG_CONFIG_HOME` es la **raíz** (`<home>/.config`); V2 le añade
          // `opencode`, que es donde viven `opencode.jsonc` y las skills (retro
          // del ticket 19). Ese `opencode` es el que un `debug config` de V2 busca.
          join(opts.env.XDG_CONFIG_HOME ?? "", "opencode", "skills", "desy-preflight-check", "SKILL.md"),
        );
        // El PRODUCT claim que importa: que el SUT vea la ruta que declara su
        // `opencode.jsonc`, no que exista un fichero en algún sitio.
        const decl = JSON.parse(
          readFileSync(join(opts.env.XDG_CONFIG_HOME ?? "", "opencode", "opencode.jsonc"), "utf8"),
        ) as { skills: string[] };
        skillsDeclaradas = decl.skills;
        skillsDeclaradasExisten = decl.skills.every((d) =>
          existsSync(join(d, "desy-preflight-check", "SKILL.md")),
        );
        skillsDuranteElRun = skillsDeclaradasExisten;
        // El doble escribe por el **mismo camino** que el SUT: una ruta relativa,
        // resuelta contra su cwd y su `PWD`.
        mkdirSync(join(opts.cwd, "src", "pages"), { recursive: true });
        writeFileSync(join(opts.cwd, "src", "pages", "boton-primario.html"), "{# SUT #}", "utf8");
        // Control positivo de la regla: `PWD` es el sandbox y no la raíz del repo,
        // así que una ruta relativa cae dentro. Con el `PWD` del lanzador caería
        // fuera y la aserción de abajo lo diría (ADR-0019).
        desdeElSandbox = {
          pwdReemplazado: opts.env.PWD === opts.cwd,
          relativaResueltaDentro: !existsSync(join(REPO_ROOT, "src", "pages", "boton-primario.html")) &&
            existsSync(join(opts.env.PWD ?? "", "src", "pages", "boton-primario.html")),
        };
        return {
          stdout: "» skill: preflight-check\n» skill: implement-component\n",
          stderr: "",
          code: 0,
        };
      },
    };

    const auth = authDeFixture();
    const sandboxFactory = {
      create: () => {
        sandboxCreado = createSandbox({ authOrigen: auth });
        return sandboxCreado;
      },
    };

    let resultado;
    let antes: string[];
    try {
      antes = sinRastrear();
      resultado = await runCaso(caso, pin, { sandbox: sandboxFactory, command });
    } finally {
      rmSync(join(auth, ".."), { recursive: true, force: true });
    }

    const sandbox = sandboxCreado;
    if (!sandbox) throw new Error("el sandbox no se creó");
    expect(skillsDuranteElRun).toBe(true);
    expect(skillsDeclaradasExisten, `opencode.jsonc declara ${JSON.stringify(skillsDeclaradas)}`).toBe(
      true,
    );
    expect(cwdVisto).toBe(sandbox.workDir);
    // La regla del smoke: el entorno es **el del sandbox**, no una lista de claves.
    // `PWD` va con el `workDir`: `spawnSync({ cwd })` no lo mueve, y opencode
    // resuelve sus rutas relativas contra él (ADR-0019).
    expect(entornoVisto).toMatchObject({
      HOME: sandbox.home,
      PWD: sandbox.workDir,
      XDG_CONFIG_HOME: join(sandbox.home, ".config"),
      OPENCODE_HOME: datosDirDeHome(sandbox.home),
      // El `auth.json` real del usuario no entra en un test: si lo hiciera, el
      // entorno del SUT llevaría su clave y una comparación fallida la volcaría en
      // el log de la suite (pasó al construir el ticket 15). Con un fichero de
      // fixture, la clave es la del fixture y la aserción fija justo la regla.
      DEEPINFRA_API_KEY: "clave-de-fixture",
    });
    // Y el sandbox no hereda la sesión del lanzador: con ella, el SUT usaría el
    // proyecto de esa sesión en vez de su `workDir` (ADR-0019).
    expect(entornoVisto).not.toHaveProperty("OPENCODE_SESSION_ID");
    expect(desdeElSandbox).toEqual({ pwdReemplazado: true, relativaResueltaDentro: true });
    expect(promptVisto).toBe(caso.prompt);

    expect(resultado.transcript.invocaciones).toEqual([
      "preflight-check",
      "implement-component",
    ]);
    // El artefacto se graduó donde el SUT lo escribió: en el `src/` del sandbox.
    expect(Object.keys(resultado.artefactos.files)).toEqual(["src/pages/boton-primario.html"]);

    // La pregunta de aislamiento, entera: **ningún fichero nuevo en el repo**.
    // Es lo que este smoke no preguntaba y por lo que sobrevivió el bug.
    expect(sinRastrear()).toEqual(antes);

    expect(existsSync(sandbox.home)).toBe(false);
    expect(existsSync(sandbox.workDir)).toBe(false);
  });
});
