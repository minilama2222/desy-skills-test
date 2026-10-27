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

  it("marca el test que lanza el binario `opencode` (el SUT real)", () => {
    // El fallo del ticket 13: un test lanzaba el `opencode` de la máquina y el
    // guardarraíl, que sólo miraba navegadores, no decía nada.
    const ficheros = [
      { path: "cli.test.ts", contenido: 'spawnSync(process.execPath, ["cli.ts"]);\nrun({ command: realCommand });\nconst r = spawnSync("opencode", ["run", prompt]);' },
    ];

    const hallazgos = pruebasConNavegador(ficheros);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("opencode");
  });

  it("marca el test que monta el doble aunque sólo lo nombre por su ruta", () => {
    // Sustituir el binario es la capacidad que la allowlist debe ver: da igual
    // que la llamada sea a `opencode-falso.cjs` en vez de a `opencode`.
    const ficheros = [
      {
        path: "doble.test.ts",
        contenido:
          'const guion = join(dir, "opencode-falso.cjs");\n' +
          "spawnSync(process.execPath, [guion]);",
      },
    ];

    expect(pruebasConNavegador(ficheros)).toHaveLength(1);
  });

  it("marca el test que inyecta un doble de un binario (la capacidad, no la cadena)", () => {
    // El caso real del ticket 13: el test NO escribe `spawnSync("opencode")`
    // —lo escribe el producto y el preludio lo intercepta—, así que un patrón
    // sobre la llamada literal daba verde con el agujero abierto.
    const ficheros = [
      {
        path: "cli.test.ts",
        contenido:
          'import { spawnSync } from "node:child_process";\n' +
          'const r = spawnSync(process.execPath, [TSX, "src/cli.ts", "suite"], {\n' +
          '  env: { ...process.env, NODE_OPTIONS: `--require "${preludio}"` },\n' +
          "});",
      },
    ];

    const hallazgos = pruebasConNavegador(ficheros);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("doble");
  });

  it("no marca el test sin procesos externos aunque nombre opencode en prosa", () => {
    const ficheros = [
      {
        path: "grader.test.ts",
        contenido: "// el SUT (opencode) no entra aqui\nconst x = 1;",
      },
    ];

    expect(pruebasConNavegador(ficheros)).toEqual([]);
  });

  it("no marca un test que no lanza ningún proceso externo", () => {
    const ficheros = [{ path: "grader.test.ts", contenido: "const x = 1;" }];

    expect(pruebasConNavegador(ficheros)).toEqual([]);
  });

  it("reporta un navegador como navegador, no como binario genérico", () => {
    const ficheros = [
      {
        path: "captura.test.ts",
        contenido: 'spawnSync("agent-browser", ["open"]);',
      },
    ];

    const hallazgos = pruebasConNavegador(ficheros);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("navegador");
  });
});
