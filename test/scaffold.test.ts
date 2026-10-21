import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSandbox, listarArtefactosDeSalida } from "../src/runner.js";

function scaffoldFalso(base: string): string {
  const dir = join(base, "starter-falso");
  mkdirSync(join(dir, "src", "templates"), { recursive: true });
  mkdirSync(join(dir, "node_modules", "desy-html"), { recursive: true });
  writeFileSync(join(dir, ".nvmrc"), "22");
  writeFileSync(join(dir, "package.json"), '{ "name": "desy-html-starter" }');
  writeFileSync(join(dir, "src", "index.html"), "<h1>Starter</h1>");
  writeFileSync(join(dir, "node_modules", "desy-html", "index.js"), "// dep");
  return dir;
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

  it("listArtefactos sólo devuelve el dist/ que el SUT produce, no el del starter", () => {
    const base = join(tmpdir(), `scaffold-artefactos-${Date.now()}`);
    mkdirSync(base, { recursive: true });
    const origen = scaffoldFalso(base);
    mkdirSync(join(origen, "dist"), { recursive: true });
    writeFileSync(join(origen, "dist", "starter-ejemplo.html"), "starter");

    const sandbox = createSandbox({ scaffoldDir: origen });
    cleanup = () => {
      sandbox.cleanup();
      rmSync(base, { recursive: true, force: true });
    };

    // El SUT compila su propia página.
    writeFileSync(join(sandbox.workDir, "dist", "botones.html"), "<button>Enviar</button>");

    expect(sandbox.listArtefactos().map((a) => a.path)).toEqual(["dist/botones.html"]);
  });
});

describe("listarArtefactosDeSalida", () => {
  it("sólo recolecta el dist/ compilado, no los fuentes del starter", () => {
    const dir = join(tmpdir(), `artefactos-${Date.now()}`);
    mkdirSync(join(dir, "dist"), { recursive: true });
    mkdirSync(join(dir, "src"), { recursive: true });
    mkdirSync(join(dir, "node_modules", "x"), { recursive: true });
    writeFileSync(join(dir, "dist", "botones.html"), "<button>Enviar</button>");
    writeFileSync(join(dir, "src", "botones.html"), "{{ componentButton() }}");
    writeFileSync(join(dir, "node_modules", "x", "index.js"), "// dep");

    const artefactos = listarArtefactosDeSalida(dir);

    expect(artefactos.map((a) => a.path)).toEqual(["dist/botones.html"]);
    expect(artefactos[0]!.contenido).toBe("<button>Enviar</button>");

    rmSync(dir, { recursive: true, force: true });
  });

  it("devuelve vacío si no hay dist/", () => {
    const dir = join(tmpdir(), `artefactos-vacio-${Date.now()}`);
    mkdirSync(dir, { recursive: true });

    expect(listarArtefactosDeSalida(dir)).toEqual([]);

    rmSync(dir, { recursive: true, force: true });
  });

  it("ignora los ficheros del dist/ que ya venían en la línea base (scaffold)", () => {
    const dir = join(tmpdir(), `artefactos-base-${Date.now()}`);
    mkdirSync(join(dir, "dist"), { recursive: true });
    writeFileSync(join(dir, "dist", "existente.html"), "starter");
    writeFileSync(join(dir, "dist", "nuevo.html"), "del SUT");

    const lineaBase = new Map([["dist/existente.html", "starter"]]);
    const artefactos = listarArtefactosDeSalida(dir, lineaBase);

    expect(artefactos.map((a) => a.path)).toEqual(["dist/nuevo.html"]);

    rmSync(dir, { recursive: true, force: true });
  });

  it("cuenta como artefacto un fichero de la línea base que el SUT modifica", () => {
    const dir = join(tmpdir(), `artefactos-mod-${Date.now()}`);
    mkdirSync(join(dir, "dist"), { recursive: true });
    writeFileSync(join(dir, "dist", "tocado.html"), "ahora distinto");

    const lineaBase = new Map([["dist/tocado.html", "contenido original"]]);
    const artefactos = listarArtefactosDeSalida(dir, lineaBase);

    expect(artefactos.map((a) => a.path)).toEqual(["dist/tocado.html"]);

    rmSync(dir, { recursive: true, force: true });
  });
});
