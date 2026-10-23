import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT } from "../src/repo.js";
import { pruebasConNavegador, type FicheroDeTest } from "../src/guardarrail-tests.js";

/**
 * Guardarraíl (ver el retro del ticket 06): ningún test de la suite debe abrir
 * un navegador. Un adaptador así (p. ej. el de la Captura de Gold) vive en
 * `scripts/`, porque dentro de la suite deja procesos vivos y la cuelga — y el
 * pre-commit corre `npm test` en cada commit.
 *
 * Se excluye el test que prueba esta propia regla: es el único que nombra los
 * marcadores a propósito (como datos), no para abrir un navegador.
 *
 * Uso: npx tsx scripts/verificar-tests.ts
 */
const TEST_DIR = join(REPO_ROOT, "test");

/** El test de la propia regla nombra los marcadores como datos. */
const FICHEROS_EXCLUIDOS = new Set(["test/guardarrail-tests.test.ts"]);

function ficherosDeTest(): FicheroDeTest[] {
  const ficheros: FicheroDeTest[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith(".test.ts")) {
        const path = relative(REPO_ROOT, full).split("\\").join("/");
        if (FICHEROS_EXCLUIDOS.has(path)) continue;
        ficheros.push({ path, contenido: readFileSync(full, "utf8") });
      }
    }
  };
  walk(TEST_DIR);
  return ficheros;
}

const hallazgos = pruebasConNavegador(ficherosDeTest());

if (hallazgos.length === 0) {
  console.log("OK: ningún test abre un navegador.");
  process.exit(0);
}

console.log(`La suite tiene ${hallazgos.length} test/s que abren un navegador:`);
for (const h of hallazgos) console.log(`  - ${h}`);
console.log(
  "\nMueve la verificación a un script en scripts/ (como " +
    "scripts/verificar-captura-gold.ts) y deja el test determinista.",
);
process.exit(1);
