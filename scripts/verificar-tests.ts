import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT } from "../src/repo.js";
import {
  ficherosQueNoSonTests,
  pruebasConNavegador,
  type FicheroDeTest,
} from "../src/guardarrail-tests.js";

/**
 * Guardarraíl: ningún test de la suite abre un navegador **ni lanza un binario
 * externo** sin declararlo (ver el retro del ticket 06 y el del 13).
 *
 * Un adaptador así (p. ej. el de la Captura de Gold) vive en `scripts/`, porque
 * dentro de la suite deja procesos vivos y la cuelga — y el pre-commit corre
 * `npm test` en cada commit. El caso del `opencode` (retro del ticket 13) es el
 * mismo género: un test que lanzaba el binario real de la máquina, y que en
 * Windows acabó llamándolo de verdad porque `spawn` ignora un `PATH` inyectado.
 *
 * Uso: npx tsx scripts/verificar-tests.ts
 */
const TEST_DIR = join(REPO_ROOT, "test");

/**
 * Ficheros exentos de la regla de binarios, con el motivo escrito. Cada entrada
 * es una decisión, no una comodidad: si el motivo no cabe en una línea, el test
 * está haciendo demasiado.
 *
 * - `guardarrail-tests.test.ts`: es el test de la propia regla; nombra los
 *   marcadores a propósito (como datos), no para abrir nada.
 * - `suite-cli.test.ts`: lanza `src/cli.ts` como **proceso** a propósito —medir
 *   el exit code real de CI es el objeto del test (ticket 13)—, y el SUT que ese
 *   proceso invoca va sustituido por un doble inyectado (`opencode-falso.cjs` +
 *   preludio), nunca el `opencode` de la máquina. El patrón está documentado en
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

/**
 * Fixture declarada: lo que vive en `test/` sin ser un test. Hoy no hay nada; si
 * algún test necesita un fichero de apoyo, se declara aquí **con su motivo**, igual
 * que los binarios exentos.
 */
const FIXTURE_DECLARADA = new Set<string>([]);

function ficherosDeTestDir(): { path: string; esTest: boolean }[] {
  const ficheros: { path: string; esTest: boolean }[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const path = relative(REPO_ROOT, full).split("\\").join("/");
      ficheros.push({ path, esTest: entry.name.endsWith(".test.ts") || FIXTURE_DECLARADA.has(path) });
    }
  };
  walk(TEST_DIR);
  return ficheros;
}

const hallazgos = [
  ...pruebasConNavegador(ficherosDeTest()),
  ...ficherosQueNoSonTests(ficherosDeTestDir()),
];

if (hallazgos.length === 0) {
  console.log(
    "OK: ningún test abre un navegador ni lanza un binario externo, y test/ no tiene restos.",
  );
  process.exit(0);
}

console.log(`La suite tiene ${hallazgos.length} test/s con un proceso externo:`);
for (const h of hallazgos) console.log(`  - ${h}`);
console.log(
  "\nMueve la verificación a un script en scripts/ (como " +
    "scripts/verificar-captura-gold.ts), inyecta un doble, o declara la " +
    "excepción con motivo en FICHEROS_EXCLUIDOS de este fichero.",
);
process.exit(1);
