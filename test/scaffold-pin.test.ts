import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readScaffoldPin } from "../src/scaffold-pin.js";

/**
 * Ticket 39: la versión del starter entra en la evidencia. El fichero es una
 * declaración del mantenedor; si falta o está mal, el lector lo dice con
 * `undefined` en vez de inventarse un pin.
 */
describe("readScaffoldPin (ticket 39)", () => {
  let dir: string | undefined;

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  const escribir = (contenido: string): string => {
    dir = mkdtempSync(join(tmpdir(), "scaffold-pin-"));
    const path = join(dir, "scaffold-pin.json");
    writeFileSync(path, contenido);
    return path;
  };

  it("lee ref, commit, fecha y repo", () => {
    const path = escribir(
      JSON.stringify({
        ref: "37748bd",
        commit: "37748bdede1ba8d5b0190f24cdbc14c91f7059f5",
        fecha: "2026-07-24",
        repo: "https://bitbucket.org/sdaragon/desy-html-starter.git",
      }),
    );

    expect(readScaffoldPin(path)).toEqual({
      ref: "37748bd",
      commit: "37748bdede1ba8d5b0190f24cdbc14c91f7059f5",
      fecha: "2026-07-24",
      repo: "https://bitbucket.org/sdaragon/desy-html-starter.git",
    });
  });

  it("un fichero que falta no se inventa", () => {
    expect(readScaffoldPin("/no/existe/scaffold-pin.json")).toBeUndefined();
  });

  it("un fichero malformado o incompleto no se inventa", () => {
    expect(readScaffoldPin(escribir("{ no es json"))).toBeUndefined();
    expect(readScaffoldPin(escribir(JSON.stringify({ ref: "37748bd" })))).toBeUndefined();
  });
});
