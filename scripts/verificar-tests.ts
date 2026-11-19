import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT } from "../src/repo.js";
import {
  ficherosQueNoSonTests,
  pruebasConNavegador,
  pruebasQueAfirmanContenidoDelArbol,
  type FicheroDeTest,
} from "../src/guardarrail-tests.js";

/**
 * Guardarraíl: ningún test de la suite abre un navegador **ni lanza un binario
 * externo** sin declararlo (ver el retro del ticket 06 y el del 13), ni **afirma
 * el contenido de un árbol real** (retro del ticket 08).
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
 * - `runner.test.ts`: los dos casos del vigilante del ticket 16 lanzan un
 *   **proceso real** por `realCommand` a propósito —medir que el vigilante acusa
 *   a un SUT que escribe fuera del sandbox no se puede con un doble que nunca
 *   escribe—, pero el binario es `process.execPath` (un guion de Node que escribe
 *   un fichero y sale), nunca el `opencode` de la máquina: se inyecta con
 *   `DESY_OPENCODE_BIN` y `DESY_OPENCODE_ARGS`.
 */
const FICHEROS_EXCLUIDOS = new Set([
  "test/guardarrail-tests.test.ts",
  "test/suite-cli.test.ts",
  "test/runner.test.ts",
]);

/**
 * Ficheros exentos de la regla del árbol real, con el motivo. Leer `vendor/` o
 * `casos/` desde un test se permite cuando lo que se afirma es la **forma** o el
 * **texto que un Caso real mide**, no una instantánea de la prosa del Skill:
 *
 * - `informe.test.ts` cita la sección **que el Caso ancla** (`desy-styles-reference`
 *   → «Componentes con `c-*`», la que `verificar-casos` ya obliga a que exista) y
 *   comprueba que el informe la recorta por título. Si esa sección cambiara de
 *   texto, la cita seguiría valiendo: no se afirma el texto, se afirma que el
 *   informe toma la sección y no el fichero entero.
 * - `sandbox.test.ts` enumera los subdirectorios con `SKILL.md` del `vendor/` para
 *   que el sandbox copie lo mismo que el runner. Es la forma del árbol.
 */
const ARBOL_REAL_EXENTO = new Map<string, string>([
  ["test/informe.test.ts", "cita la sección anclada por el Caso; no afirma su texto"],
  ["test/sandbox.test.ts", "enumera las skills del vendor para copiarlas al sandbox"],
  [
    "test/caso-pagina-paso-1.test.ts",
    "lee el Gold del propio Caso (una fixture), no la prosa del Skill",
  ],
  [
    "test/runner.test.ts",
    "lee un fichero de su sandbox temporal; el vendor sólo dice de dónde se copia",
  ],
  [
    "test/guardarrail-tests-arbol.test.ts",
    "es el test de esta regla: lee el tier rápido para fijar que ya no lee el árbol",
  ],
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

/** Todos los tests del árbol, sin excluir nada: la regla del árbol real juzga también los exentos de binarios. */
function todosLosTests(): FicheroDeTest[] {
  const ficheros: FicheroDeTest[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".test.ts")) {
        ficheros.push({
          path: relative(REPO_ROOT, full).split("\\").join("/"),
          contenido: readFileSync(full, "utf8"),
        });
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
  ...pruebasQueAfirmanContenidoDelArbol(todosLosTests()).filter((h) => {
    const path = h.split(":")[0]!;
    return !ARBOL_REAL_EXENTO.has(path);
  }),
];

if (hallazgos.length === 0) {
  console.log(
    "OK: ningún test abre un navegador, lanza un binario externo ni afirma el " +
      "contenido de un árbol real, y test/ no tiene restos.",
  );
  process.exit(0);
}

console.log(`La suite tiene ${hallazgos.length} test/s con un problema:`);
for (const h of hallazgos) console.log(`  - ${h}`);
console.log(
  "\nMueve la verificación a un script en scripts/ (como " +
    "scripts/verificar-captura-gold.ts), inyecta un doble, prueba el texto con un " +
    "fixture, o declara la excepción con motivo en FICHEROS_EXCLUIDOS o " +
    "ARBOL_REAL_EXENTO de este fichero.",
);
process.exit(1);
