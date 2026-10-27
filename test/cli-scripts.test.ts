import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../src/repo.js";

/**
 * El comando de la suite (ticket 13) tiene que ser el que un pipeline teclea:
 * `npm run suite`. Un script que falta en `package.json` deja el ciclo de CI sin
 * arranque —el README documentaría un comando que no existe— y es un fallo
 * mecánico que se caza sin correr nada.
 */
describe("npm run suite: el comando de CI está cableado", () => {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };

  it("existe el script y arranca el CLI con el subcomando suite", () => {
    expect(pkg.scripts.suite).toBeDefined();
    expect(pkg.scripts.suite).toContain("cli.ts suite");
  });

  it("`npm test` sigue siendo la suite de tests del harness (vitest), no la de Casos", () => {
    // `npm test` corre los tests unitarios del propio harness; la suite de Casos
    // (opencode + red + ~1 min por Ejecución) es `npm run suite`. Confundirlos
    // haría que un `npm test` local pague el SUT entero.
    expect(pkg.scripts.test).toContain("vitest");
  });
});
