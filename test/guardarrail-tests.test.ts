import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pruebasConNavegador } from "../src/guardarrail-tests.js";
import { REPO_ROOT } from "../src/repo.js";

/**
 * Retro del ticket 06: el hook de pre-commit enumeraba los pasos a mano y se
 * quedó corto —no corría `verificar-pin`, que sí estaba en `npm run precommit`—,
 * así que el gate que de verdad se ejecutaba al commitear era más débil que el
 * documentado. La causa era tener **dos** listas; el arreglo, que el hook delegue
 * en el script npm. Este test fija que no vuelva a haber dos.
 */
describe("el hook de pre-commit delega en `npm run precommit`", () => {
  const hook = readFileSync(join(REPO_ROOT, "scripts", "git-hooks", "pre-commit"), "utf8");
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };

  it("llama al script npm en vez de repetir la lista de guardarraíles", () => {
    expect(hook).toContain("npm run precommit");
  });

  it("no vuelve a enumerar los `verificar-*` a mano", () => {
    // Los pasos viven en `package.json` y sólo ahí: un `verificar-` en el hook es
    // la segunda lista que ya divergió una vez.
    expect(hook).not.toMatch(/npm run verificar-/);
  });

  it("el `precommit` de npm incluye los guardarraíles que el hook dejaba fuera", () => {
    // `verificar-pin` es el que se quedó fuera entonces; y el de acentos es el de
    // esta retro. Si se cae de la lista, el hook deja de correrlo en silencio.
    expect(pkg.scripts.precommit).toContain("verificar-pin");
    expect(pkg.scripts.precommit).toContain("verificar-acentos");
  });
});

/**
 * Retro de la sesión del ticket 03: el gate corría `vitest` pelado, que escribe
 * el detalle de los fallos por **stderr**, y PowerShell convierte stderr en un
 * `NativeCommandError` que deja el exit 1 aunque el proceso haya salido con 0.
 * El «rojo de Windows» costaba un `git log` por commit para saber si había
 * entrado, y `AGENTS.md` sólo podía pedir que se leyera con cuidado.
 *
 * `test:gate` corre vitest como hijo, por tubería, y reproduce su exit code: el
 * exit **es** el veredicto, sin ambigüedad. Si el gate vuelve a llamar a vitest
 * directamente, el ruido regresa y este test lo dice.
 */
describe("el gate corre la suite por `test:gate`, no por vitest pelado", () => {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  };

  it("el `precommit` termina en `test:gate`", () => {
    expect(pkg.scripts.precommit).toMatch(/&& npm run test:gate$/);
  });

  it("`test:gate` no es a su vez un `vitest` pelado", () => {
    // Un `test:gate` que llamase a `vitest` directo conservaría el ruido: tiene
    // que pasar por el lanzador que recoge los dos canales.
    expect(pkg.scripts["test:gate"]).toBe("node scripts/test-gate.mjs");
  });

  it("el lanzador existe y reproduce el exit code de vitest", () => {
    const lanzador = readFileSync(join(REPO_ROOT, "scripts", "test-gate.mjs"), "utf8");
    // La propiedad que quita el ruido: los dos canales van por tubería al
    // lanzador, así que PowerShell no ve stderr de vitest.
    expect(lanzador).toContain('spawnSync(');
    expect(lanzador).toMatch(/process\.exit\(status \?\? 1\)/);
  });
});

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
