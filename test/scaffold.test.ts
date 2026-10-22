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

  it("listArtefactos devuelve el fuente (src/) que el SUT produce en un Caso-componente", () => {
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
});
