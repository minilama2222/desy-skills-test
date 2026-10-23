import { describe, expect, it } from "vitest";
import { pruebasConNavegador } from "../src/guardarrail-tests.js";

describe("pruebasConNavegador", () => {
  it("una suite sin navegador no tiene hallazgos", () => {
    const ficheros = [
      { path: "grader.test.ts", contenido: 'import { grado } from "../src/grader.js";' },
      {
        path: "scaffold.test.ts",
        contenido: 'import { spawnSync } from "node:child_process";\nspawnSync("git", ["init"]);',
      },
    ];

    expect(pruebasConNavegador(ficheros)).toEqual([]);
  });

  it("marca el fichero que importa el capturador real de Gold", () => {
    const ficheros = [
      {
        path: "captura.test.ts",
        contenido: 'import { capturarConAgentBrowser } from "../src/captura-gold.js";',
      },
    ];

    const hallazgos = pruebasConNavegador(ficheros);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("captura.test.ts");
  });

  it("marca el fichero que invoca el binario agent-browser", () => {
    const ficheros = [
      { path: "captura.test.ts", contenido: 'spawnSync("agent-browser", ["open", url]);' },
    ];

    expect(pruebasConNavegador(ficheros)).toHaveLength(1);
  });

  it("marca un fichero que usa una librería de navegador (puppeteer/playwright)", () => {
    const ficheros = [
      { path: "e2e.test.ts", contenido: 'import { chromium } from "playwright";' },
    ];

    expect(pruebasConNavegador(ficheros)).toHaveLength(1);
  });

  it("no marca los tests que sólo usan git (proceso externo rápido y legítimo)", () => {
    const ficheros = [
      { path: "sandbox.test.ts", contenido: 'spawnSync("git", ["status"]);' },
    ];

    expect(pruebasConNavegador(ficheros)).toEqual([]);
  });
});
