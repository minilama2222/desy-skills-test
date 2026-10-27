import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT } from "../src/repo.js";
import { pruebasConNavegador, type FicheroDeTest } from "../src/guardarrail-tests.js";

/**
 * GuardarraÃ­l: ningÃºn test de la suite abre un navegador **ni lanza un binario
 * externo** sin declararlo (ver el retro del ticket 06 y el del 13).
 *
 * Un adaptador asÃ­ (p. ej. el de la Captura de Gold) vive en `scripts/`, porque
 * dentro de la suite deja procesos vivos y la cuelga â€” y el pre-commit corre
 * `npm test` en cada commit. El caso del `opencode` (retro del ticket 13) es el
 * mismo gÃ©nero: un test que lanzaba el binario real de la mÃ¡quina, y que en
 * Windows acabÃ³ llamÃ¡ndolo de verdad porque `spawn` ignora un `PATH` inyectado.
 *
 * Uso: npx tsx scripts/verificar-tests.ts
 */
const TEST_DIR = join(REPO_ROOT, "test");

/**
 * Ficheros exentos de la regla de binarios, con el motivo escrito. Cada entrada
 * es una decisiÃ³n, no una comodidad: si el motivo no cabe en una lÃ­nea, el test
 * estÃ¡ haciendo demasiado.
 *
 * - `guardarrail-tests.test.ts`: es el test de la propia regla; nombra los
 *   marcadores a propÃ³sito (como datos), no para abrir nada.
 * - `suite-cli.test.ts`: lanza `src/cli.ts` como **proceso** a propÃ³sito â€”medir
 *   el exit code real de CI es el objeto del test (ticket 13)â€”, y el SUT que ese
 *   proceso invoca va sustituido por un doble inyectado (`opencode-falso.cjs` +
 *   preludio), nunca el `opencode` de la mÃ¡quina. El patrÃ³n estÃ¡ documentado en
 *   la cabecera del propio test.
 */
const FICHEROS_EXCLUIDOS = new Set([
  "test/guardarrail-tests.test.ts",
  "test/suite-cli.test.ts",
]);

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
  console.log("OK: ningÃºn test abre un navegador ni lanza un binario externo.");
  process.exit(0);
}

console.log(`La suite tiene ${hallazgos.length} test/s con un proceso externo:`);
for (const h of hallazgos) console.log(`  - ${h}`);
console.log(
  "\nMueve la verificaciÃ³n a un script en scripts/ (como " +
    "scripts/verificar-captura-gold.ts), inyecta un doble, o declara la " +
    "excepciÃ³n con motivo en FICHEROS_EXCLUIDOS de este fichero.",
);
process.exit(1);
