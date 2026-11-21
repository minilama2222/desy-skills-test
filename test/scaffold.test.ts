import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  contaminacionDelScaffold,
  createSandbox,
  listarArtefactosDeSalida,
} from "../src/runner.js";

/**
 * Caché de scaffold falsa que imita la real: un repo git (la preparación es un
 * `git clone`), así que `git status` funciona y el check de contaminación tiene
 * qué leer.
 */
function scaffoldFalso(base: string): string {
  const dir = join(base, "starter-falso");
  mkdirSync(join(dir, "src", "templates"), { recursive: true });
  mkdirSync(join(dir, "node_modules", "desy-html"), { recursive: true });
  writeFileSync(join(dir, "package.json"), '{ "name": "desy-html-starter" }');
  writeFileSync(join(dir, "src", "index.html"), "<h1>Starter</h1>");
  writeFileSync(join(dir, "node_modules", "desy-html", "index.js"), "// dep");
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "starter");
  // La preparación crea .nvmrc DESPUÉS del commit, así que queda sin rastrear
  // (igual que en la caché real).
  writeFileSync(join(dir, ".nvmrc"), "22");
  return dir;
}

function git(cwd: string, ...args: string[]): void {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} falló: ${r.stderr}`);
}

describe("scaffold pre-cacheado en el sandbox", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it("copia el starter cacheado al workDir antes de lanzar el SUT", () => {
    const base = join(tmpdir(), `scaffold-${Date.now()}`);
    mkdirSync(base, { recursive: true });
    const origen = scaffoldFalso(base);

    const sandbox = createSandbox({ scaffoldDir: origen });
    cleanup = () => {
      sandbox.cleanup();
      rmSync(base, { recursive: true, force: true });
    };

    expect(existsSync(join(sandbox.workDir, "package.json"))).toBe(true);
    expect(readFileSync(join(sandbox.workDir, ".nvmrc"), "utf8")).toBe("22");
    expect(existsSync(join(sandbox.workDir, "src", "templates"))).toBe(true);
    expect(existsSync(join(sandbox.workDir, "node_modules", "desy-html"))).toBe(true);
  });

  it("sin scaffoldDir no copia nada y deja el workDir limpio (modo sin starter)", () => {
    const sandbox = createSandbox();
    cleanup = () => sandbox.cleanup();

    expect(existsSync(sandbox.workDir)).toBe(true);
    expect(existsSync(join(sandbox.workDir, "package.json"))).toBe(false);
  });

  it("cada sandbox recibe su propia copia del starter (aislamiento entre Ejecuciones)", () => {
    const base = join(tmpdir(), `scaffold-${Date.now()}`);
    mkdirSync(base, { recursive: true });
    const origen = scaffoldFalso(base);

    const uno = createSandbox({ scaffoldDir: origen });
    const dos = createSandbox({ scaffoldDir: origen });
    cleanup = () => {
      uno.cleanup();
      dos.cleanup();
      rmSync(base, { recursive: true, force: true });
    };

    writeFileSync(join(uno.workDir, "solo-en-uno.txt"), "x");
    expect(existsSync(join(dos.workDir, "solo-en-uno.txt"))).toBe(false);
  });

  it("revienta si la caché está contaminada, en vez de copiarla al sandbox", () => {
    const base = join(tmpdir(), `scaffold-sucia-${Date.now()}`);
    mkdirSync(base, { recursive: true });
    const origen = scaffoldFalso(base);
    cleanup = () => rmSync(base, { recursive: true, force: true });

    // Un SUT anterior dejó su página en la caché: se colaría en la línea base.
    writeFileSync(join(origen, "src", "botones.html"), "{{ componentButton() }}");

    expect(() => createSandbox({ scaffoldDir: origen })).toThrow(/contaminada/i);
  });

  it("revienta si la caché tiene un dist/ (el SUT compiló dentro de ella)", () => {
    const base = join(tmpdir(), `scaffold-sucia-dist-${Date.now()}`);
    mkdirSync(base, { recursive: true });
    const origen = scaffoldFalso(base);
    cleanup = () => rmSync(base, { recursive: true, force: true });

    mkdirSync(join(origen, "dist"), { recursive: true });
    writeFileSync(join(origen, "dist", "botones.html"), "<button>Enviar</button>");

    expect(() => createSandbox({ scaffoldDir: origen })).toThrow(/contaminada/i);
  });

  it("acepta una caché limpia (solo .nvmrc sin rastrear, sin dist/)", () => {
    const base = join(tmpdir(), `scaffold-limpia-${Date.now()}`);
    mkdirSync(base, { recursive: true });
    const origen = scaffoldFalso(base);
    const sandbox = createSandbox({ scaffoldDir: origen });
    cleanup = () => {
      sandbox.cleanup();
      rmSync(base, { recursive: true, force: true });
    };

    expect(existsSync(join(sandbox.workDir, "src", "index.html"))).toBe(true);
  });

  it("listArtefactos devuelve el fuente (src/) que el SUT produce en un Caso-componente", () => {
    const base = join(tmpdir(), `scaffold-artefactos-${Date.now()}`);
    mkdirSync(base, { recursive: true });
    const origen = scaffoldFalso(base);

    const sandbox = createSandbox({ scaffoldDir: origen });
    cleanup = () => {
      sandbox.cleanup();
      rmSync(base, { recursive: true, force: true });
    };

    // El SUT escribe el fuente de su página (convención del skill: .html en src/).
    mkdirSync(join(sandbox.workDir, "src"), { recursive: true });
    writeFileSync(join(sandbox.workDir, "src", "botones.html"), "{{ componentButton() }}");

    expect(sandbox.listArtefactos("src").map((a) => a.path)).toEqual(["src/botones.html"]);
  });
});

describe("listarArtefactosDeSalida", () => {
  it("recolecta lo nuevo o modificado del directorio pedido, no el resto", () => {
    const dir = join(tmpdir(), `artefactos-${Date.now()}`);
    mkdirSync(join(dir, "dist"), { recursive: true });
    mkdirSync(join(dir, "src"), { recursive: true });
    mkdirSync(join(dir, "node_modules", "x"), { recursive: true });
    writeFileSync(join(dir, "dist", "botones.html"), "<button>Enviar</button>");
    writeFileSync(join(dir, "src", "botones.html"), "{{ componentButton() }}");
    writeFileSync(join(dir, "node_modules", "x", "index.js"), "// dep");

    expect(listarArtefactosDeSalida(dir, new Map(), "src").map((a) => a.path)).toEqual([
      "src/botones.html",
    ]);
    expect(listarArtefactosDeSalida(dir, new Map(), "dist").map((a) => a.path)).toEqual([
      "dist/botones.html",
    ]);

    rmSync(dir, { recursive: true, force: true });
  });

  it("devuelve vacío si no existe el directorio pedido", () => {
    const dir = join(tmpdir(), `artefactos-vacio-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    expect(listarArtefactosDeSalida(dir, new Map(), "src")).toEqual([]);
    expect(listarArtefactosDeSalida(dir, new Map(), "dist")).toEqual([]);

    rmSync(dir, { recursive: true, force: true });
  });

  it("ignora los ficheros que ya venían en la línea base (scaffold)", () => {
    const dir = join(tmpdir(), `artefactos-base-${Date.now()}`);
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "existente.html"), "starter");
    writeFileSync(join(dir, "src", "nuevo.html"), "del SUT");

    const lineaBase = new Map([["src/existente.html", "starter"]]);
    const artefactos = listarArtefactosDeSalida(dir, lineaBase, "src");

    expect(artefactos.map((a) => a.path)).toEqual(["src/nuevo.html"]);

    rmSync(dir, { recursive: true, force: true });
  });

  it("cuenta como artefacto un fichero de la línea base que el SUT modifica", () => {
    const dir = join(tmpdir(), `artefactos-mod-${Date.now()}`);
    mkdirSync(join(dir, "src"), { recursive: true });
    writeFileSync(join(dir, "src", "tocado.html"), "ahora distinto");

    const lineaBase = new Map([["src/tocado.html", "contenido original"]]);
    const artefactos = listarArtefactosDeSalida(dir, lineaBase, "src");

    expect(artefactos.map((a) => a.path)).toEqual(["src/tocado.html"]);

    rmSync(dir, { recursive: true, force: true });
  });

  it("en un Caso-página, sólo es artefacto el dist/ de la página que el SUT escribió en src/", () => {
    // El dist/ entero lo genera el build (la caché no lo trae), así que la línea
    // base no separa la página del SUT de las ~20 de ejemplo del starter. El
    // artefacto es el dist/X.html cuya fuente src/X.html cambió.
    const dir = join(tmpdir(), `artefactos-pagina-${Date.now()}`);
    mkdirSync(join(dir, "src"), { recursive: true });
    mkdirSync(join(dir, "dist"), { recursive: true });
    // Página del starter: src intacto -> su dist no es artefacto.
    writeFileSync(join(dir, "src", "index.html"), "starter");
    writeFileSync(join(dir, "dist", "index.html"), "<h1>starter</h1>");
    // Página del SUT: src nuevo -> su dist SÍ es artefacto.
    writeFileSync(join(dir, "src", "mi-pagina.html"), "{% extends 'x' %}");
    writeFileSync(join(dir, "dist", "mi-pagina.html"), "<h1>Mi página</h1>");
    // Assets del build: no son la página.
    writeFileSync(join(dir, "dist", "styles.css"), "body{}");

    const lineaBase = new Map([["src/index.html", "starter"]]);
    const artefactos = listarArtefactosDeSalida(dir, lineaBase, "dist").map((a) => a.path);

    expect(artefactos).toEqual(["dist/mi-pagina.html"]);

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("contaminacionDelScaffold", () => {
  // Una caché limpia es exactamente lo que produce `git clone` + `npm install`:
  // el `src/` del starter sin tocar y el `dist/` AUSENTE (el script de preparación
  // no corre `npm run build`). Cualquier otra cosa la dejó una corrida anterior.
  it("una caché limpia no tiene contaminación", () => {
    expect(contaminacionDelScaffold({ noRastreados: [], existeDist: false })).toEqual([]);
  });

  it(".nvmrc no es contaminación: lo crea la propia preparación", () => {
    expect(
      contaminacionDelScaffold({ noRastreados: [".nvmrc"], existeDist: false }),
    ).toEqual([]);
  });

  it("un fichero no rastreado en src/ es contaminación", () => {
    const problemas = contaminacionDelScaffold({
      noRastreados: ["src/botones.html"],
      existeDist: false,
    });

    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain("src/botones.html");
  });

  it("un dist/ presente es contaminación: la caché limpia no compila", () => {
    const problemas = contaminacionDelScaffold({ noRastreados: [], existeDist: true });

    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toContain("dist/");
  });

  it("lista las dos clases de contaminación a la vez", () => {
    const problemas = contaminacionDelScaffold({
      noRastreados: ["src/botones.html"],
      existeDist: true,
    });

    expect(problemas).toHaveLength(2);
  });
});

/**
 * Ticket 36: un Caso con premisa de «carpeta vacía» trae su `input/fixture/` y
 * el sandbox copia sólo eso. Antes, el starter entraba siempre y el SUT veía un
 * proyecto donde el Caso decía que no había ninguno.
 */
describe("fixture del Caso en el sandbox (ticket 36)", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it("copia el fixture y no el starter, aunque haya caché", () => {
    const base = join(tmpdir(), `fixture-${Date.now()}`);
    mkdirSync(base, { recursive: true });
    const fixture = join(base, "fixture");
    mkdirSync(join(fixture, "attached_assets"), { recursive: true });
    writeFileSync(join(fixture, "README.md"), "# Página\n");
    writeFileSync(join(fixture, "attached_assets", "mockup.png"), "PNG");
    const origen = scaffoldFalso(base);

    const sandbox = createSandbox({ fixtureDir: fixture, scaffoldDir: origen });
    cleanup = () => {
      sandbox.cleanup();
      rmSync(base, { recursive: true, force: true });
    };

    expect(readFileSync(join(sandbox.workDir, "README.md"), "utf8")).toBe("# Página\n");
    expect(existsSync(join(sandbox.workDir, "attached_assets", "mockup.png"))).toBe(true);
    expect(existsSync(join(sandbox.workDir, "package.json"))).toBe(false);
    expect(existsSync(join(sandbox.workDir, "node_modules"))).toBe(false);
  });
});
