import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Pin } from "../src/pin.js";
import { createSandbox, VENDOR_SKILLS_DIR } from "../src/runner.js";

const pin: Pin = {
  ref: "main",
  commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-20",
};

describe("createSandbox", () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
  });

  it("crea un HOME/config temporal aislado por Ejecución", () => {
    const sandbox = createSandbox();
    cleanup = () => sandbox.cleanup();

    expect(existsSync(sandbox.home)).toBe(true);
    expect(existsSync(sandbox.configDir)).toBe(true);
    expect(existsSync(sandbox.workDir)).toBe(true);
    expect(sandbox.configDir.startsWith(tmpdir())).toBe(true);
  });

  it("copia los skills del Pin al config del sandbox", () => {
    const sandbox = createSandbox();
    cleanup = () => sandbox.cleanup();

    sandbox.copySkills(pin);

    const copied = join(sandbox.skillsDir, "desy-preflight-check", "SKILL.md");
    expect(existsSync(copied)).toBe(true);
    const source = readFileSync(
      join(VENDOR_SKILLS_DIR, "desy-preflight-check", "SKILL.md"),
    );
    expect(readFileSync(copied)).toEqual(source);
  });

  it("recolecta los artefactos producidos en el working dir, sin el sandbox root", () => {
    const sandbox = createSandbox();
    cleanup = () => sandbox.cleanup();

    mkdirSync(join(sandbox.workDir, "sub"));
    writeFileSync(join(sandbox.workDir, "pagina.html"), "<h1>Hola</h1>");
    writeFileSync(join(sandbox.workDir, "sub", "nota.txt"), "nota");

    expect(sandbox.listArtefactos()).toEqual([
      { path: "pagina.html", contenido: "<h1>Hola</h1>" },
      { path: "sub/nota.txt", contenido: "nota" },
    ]);
  });

  it("al limpiarse elimina el sandbox y no toca la instalación real de skills", () => {
    const sandbox = createSandbox();
    sandbox.copySkills(pin);
    const root = sandbox.home;

    sandbox.cleanup();

    expect(existsSync(root)).toBe(false);
    expect(existsSync(VENDOR_SKILLS_DIR)).toBe(true);
  });
});
