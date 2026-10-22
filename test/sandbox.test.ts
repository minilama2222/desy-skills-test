import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, dirname } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readPin } from "../src/pin.js";
import { createSandbox, skillsDirDeHome, VENDOR_SKILLS_DIR } from "../src/runner.js";

const pin = readPin(join(process.cwd(), "pin.json"));

function skillsVendoreados(): string[] {
  return readdirSync(VENDOR_SKILLS_DIR).filter((entry) =>
    existsSync(join(VENDOR_SKILLS_DIR, entry, "SKILL.md")),
  );
}

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

  it("expone el skillsDir en la ruta que descubre opencode (~/.config/opencode/skills)", () => {
    const sandbox = createSandbox();
    cleanup = () => sandbox.cleanup();

    expect(sandbox.skillsDir).toBe(skillsDirDeHome(sandbox.home));
    expect(basename(sandbox.skillsDir)).toBe("skills");
    expect(dirname(sandbox.skillsDir)).toBe(sandbox.configDir);
    expect(existsSync(sandbox.skillsDir)).toBe(true);
  });

  it("copia los skills del Pin al skillsDir que descubre el SUT", () => {
    const sandbox = createSandbox();
    cleanup = () => sandbox.cleanup();

    sandbox.copySkills();

    for (const skill of skillsVendoreados()) {
      const copied = join(sandbox.skillsDir, skill, "SKILL.md");
      expect(existsSync(copied)).toBe(true);
      expect(readFileSync(copied)).toEqual(
        readFileSync(join(VENDOR_SKILLS_DIR, skill, "SKILL.md")),
      );
    }
  });

  it("recolecta los artefactos del directorio pedido, sin el resto del working dir", () => {
    const sandbox = createSandbox();
    cleanup = () => sandbox.cleanup();

    mkdirSync(join(sandbox.workDir, "dist"));
    mkdirSync(join(sandbox.workDir, "src"));
    writeFileSync(join(sandbox.workDir, "dist", "pagina.html"), "<h1>Hola</h1>");
    writeFileSync(join(sandbox.workDir, "src", "pagina.html"), "{% block x %}");
    writeFileSync(join(sandbox.workDir, "nota.txt"), "no es output");

    expect(sandbox.listArtefactos("src")).toEqual([
      { path: "src/pagina.html", contenido: "{% block x %}" },
    ]);
    expect(sandbox.listArtefactos("dist")).toEqual([
      { path: "dist/pagina.html", contenido: "<h1>Hola</h1>" },
    ]);
  });

  it("al limpiarse elimina el sandbox y no toca la instalación real de skills", () => {
    const sandbox = createSandbox();
    sandbox.copySkills();
    const root = sandbox.home;

    sandbox.cleanup();

    expect(existsSync(root)).toBe(false);
    expect(existsSync(VENDOR_SKILLS_DIR)).toBe(true);
  });
});
