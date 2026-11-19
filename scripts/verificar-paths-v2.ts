import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createSandbox, entornoDelSandbox } from "../src/runner.js";

/**
 * Guardarraíl de la **convención de rutas de OpenCode V2** (retro del ticket 19).
 *
 * Nace de un fallo que vivió semanas oculto: el sandbox ponía `XDG_CONFIG_HOME`
 * un nivel de más, V2 buscaba su config en `<XDG>/opencode/` y leía una carpeta
 * **vacía**; el SUT corría sin ninguna skill y la suite lo contaba como «el
 * agente no invoca». Ningún test lo veía, porque los tests reconstruían la ruta
 * desde **la misma suposición que el código**: un test así no protege de que la
 * suposición sea falsa.
 *
 * La única fuente de verdad es el binario, así que aquí se le pregunta:
 * `opencode debug paths` imprime la carpeta de config que usaría, y ha de ser la
 * del sandbox. Si no coincide, el `opencode.jsonc` que escribimos no se lee.
 *
 * Es un **script** y no un test porque la regla de `test/` prohíbe lanzar
 * `opencode` (ver `docs/agents/testing.md`), y con razón: en un runner limpio no
 * está. Por eso, si el binario no está, lo **dice y sale 0**: no comprueba nada,
 * pero tampoco inventa un verde.
 *
 * Uso: `npx tsx scripts/verificar-paths-v2.ts` — en el precommit.
 */

/** ¿Está `opencode` en esta máquina? Sólo ENOENT es «no está»; otro fallo se propaga. */
function hayOpencode(): boolean {
  try {
    execFileSync("opencode", ["--version"], { stdio: "pipe" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

/** La carpeta de config que el binario dice que usaría con este entorno. */
function configQueVeElBinario(env: NodeJS.ProcessEnv, cwd: string): string {
  const salida = execFileSync("opencode", ["debug", "paths"], { env, cwd, encoding: "utf8" });
  const linea = salida
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("config"));
  if (linea === undefined) {
    throw new Error(`«opencode debug paths» no imprimió la carpeta de config:\n${salida}`);
  }
  // `config <ruta>`; la ruta puede llevar espacios (macOS), así que se toma el resto.
  return linea.replace(/^config\s+/, "").trim();
}

if (!hayOpencode()) {
  console.log(
    "OK: no hay `opencode` en esta máquina; la convención de rutas de V2 no se comprueba.",
  );
  process.exit(0);
}

const raiz = mkdtempSync(join(tmpdir(), "desy-paths-v2-"));
const auth = join(raiz, "auth.json");
writeFileSync(
  auth,
  JSON.stringify({ deepinfra: { type: "api", key: "clave-de-fixture" } }) + "\n",
  "utf8",
);

try {
  // Se crea el sandbox **con el producto** (`createSandbox` + `entornoDelSandbox`),
  // no con una copia de las rutas: si el producto deriva, esto lo ve.
  const sandbox = createSandbox({ base: raiz, authOrigen: auth });
  sandbox.configurar();
  const env = {
    ...process.env,
    ...entornoDelSandbox({
      home: sandbox.home,
      configDir: sandbox.configDir,
      workDir: sandbox.workDir,
      authOrigen: auth,
    }),
  };

  const delBinario = resolve(configQueVeElBinario(env, sandbox.workDir));
  const delSandbox = resolve(sandbox.configDir);

  if (delBinario !== delSandbox) {
    console.log("La convención de rutas de V2 no cuadra con el sandbox:");
    console.log(`  - opencode cree que su config está en: ${delBinario}`);
    console.log(`  - el sandbox escribe opencode.jsonc en: ${delSandbox}`);
    console.log(
      "\nEl SUT correría SIN las skills del sandbox. Ajusta `entornoDelSandbox` (el\n" +
        "`XDG_CONFIG_HOME` es la raíz; V2 le añade `opencode`) hasta que coincidan.",
    );
    process.exit(1);
  }

  console.log(
    `OK: opencode V2 resuelve su config en la del sandbox (${delSandbox}) y lee su opencode.jsonc.`,
  );
} finally {
  rmSync(raiz, { recursive: true, force: true });
}
