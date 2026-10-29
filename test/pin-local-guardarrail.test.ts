import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { problemasDeArbolLocalSucio } from "../src/guardarrail-pin.js";

/**
 * Ticket 05: el guardarraíl del 04 se aplica igual a un checkout local. Un árbol
 * sucio se puede medir durante la iteración, pero no **en silencio**: el informe
 * tiene que poder decir qué se midió.
 *
 * Se prueba con un repo git de verdad porque lo que se comprueba es qué le
 * pregunta el adaptador a git —el subdirectorio `skills/` y no todo el
 * checkout—, y eso un doble no lo dice. El repo es `git init` + dos ficheros: no
 * es el fixture de 85 MB del scaffold, así que no lleva presupuesto de tiempo
 * propio (CODING_STANDARDS): el test entero ronda los 5 s, casi todo espera de
 * proceso en Windows.
 */

function conCheckout<T>(fn: (dir: string, porcelain: () => string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "checkout-local-"));
  const git = (...args: string[]): void => {
    execFileSync("git", args, { cwd: dir, stdio: "pipe" });
  };
  try {
    git("init", "--quiet");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "test");
    mkdirSync(join(dir, "skills", "desy-preflight-check"), { recursive: true });
    writeFileSync(join(dir, "skills", "desy-preflight-check", "SKILL.md"), "paso 0", "utf8");
    mkdirSync(join(dir, "skills", "desy-component-recognizer", "assets"), { recursive: true });
    writeFileSync(
      join(dir, "skills", "desy-component-recognizer", "assets", "catalog.json"),
      "{}",
      "utf8",
    );
    writeFileSync(join(dir, "README.md"), "repo de skills", "utf8");
    git("add", ".");
    git("commit", "--quiet", "-m", "inicial");
    const porcelain = (): string =>
      execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
        cwd: dir,
        encoding: "utf8",
      });
    return fn(dir, porcelain);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("problemasDeArbolLocalSucio: el guardarraíl del 04, sobre un checkout local", () => {
  it("un checkout limpio no da hallazgos", () => {
    conCheckout((dir, porcelain) => {
      expect(porcelain(), "el fixture tiene que estar limpio para que el test muerda").toBe("");
      expect(problemasDeArbolLocalSucio(dir)).toEqual([]);
    });
  });

  it("un SKILL.md modificado da un hallazgo que nombra el fichero y el árbol", () => {
    conCheckout((dir) => {
      writeFileSync(join(dir, "skills", "desy-preflight-check", "SKILL.md"), "paso 0, editado");

      const hallazgos = problemasDeArbolLocalSucio(dir);

      expect(hallazgos).toHaveLength(1);
      expect(hallazgos[0]).toContain("skills/desy-preflight-check/SKILL.md");
      expect(hallazgos[0]).toMatch(/sin commitear/);
    });
  });

  it("un fichero sin rastrear dentro de skills/ también cuenta", () => {
    conCheckout((dir) => {
      writeFileSync(join(dir, "skills", "desy-preflight-check", "nota.md"), "borrador");

      expect(problemasDeArbolLocalSucio(dir)[0]).toContain("skills/desy-preflight-check/nota.md");
    });
  });

  it("lo que cambia fuera de skills/ NO ensucia la medición: se mide skills/, no el repo", () => {
    // El usuario tiene el checkout para trabajar: su README, su .env o su rama no
    // cambian lo que el SUT ve.
    conCheckout((dir) => {
      writeFileSync(join(dir, "README.md"), "cambiado");
      writeFileSync(join(dir, "notas.txt"), "sin rastrear");

      expect(problemasDeArbolLocalSucio(dir)).toEqual([]);
    });
  });

  it("assets/catalog.json no cuenta: es el fichero que el hash del 04 excluye a propósito", () => {
    conCheckout((dir, porcelain) => {
      writeFileSync(
        join(dir, "skills", "desy-component-recognizer", "assets", "catalog.json"),
        '{"otro": true}',
      );
      // El cambio existe para git; el filtro que lo quita es el del guardarraíl.
      expect(porcelain()).toContain("assets/catalog.json");

      expect(problemasDeArbolLocalSucio(dir)).toEqual([]);
    });
  });

  it("una ruta que no existe es un error explícito, no un árbol limpio", () => {
    conCheckout((dir) => {
      expect(() => problemasDeArbolLocalSucio(join(dir, "no-existe"))).toThrow(/no-existe/);
    });
  });
});
