/**
 * Guardarraíl de los tests: la suite debe ser **determinista**, así que ningún
 * test abre un navegador **ni lanza un binario externo** sin declararlo.
 *
 * Nace del retro del ticket 06 en su primera mitad (nada de navegadores) y del
 * retro del ticket 13 en la segunda. En el 13, `test/suite-cli.test.ts` lanzaba
 * un `opencode` **real** con `spawnSync` y el guardarraíl no decía nada, porque
 * sólo miraba marcadores de navegador: un test que dependía del binario de la
 * máquina pasó en verde sin que nadie lo notara, y encima en Windows el
 * `spawn` ignoraba el `PATH` inyectado y respondía el `opencode` de verdad
 * (falso verde). El género del fallo es el del ticket 06 —un proceso externo
 * dentro de la suite— y la regla se generaliza a «ningún binario externo sin
 * una razón escrita».
 *
 * La regla es **pura**: recibe los ficheros a inspeccionar y devuelve un hallazgo
 * por fichero. Las excepciones se declaran en el recolector
 * (`scripts/verificar-tests.ts`), no aquí: este módulo sólo conoce los patrones.
 */

export interface FicheroDeTest {
  /** Ruta del fichero, para el mensaje. */
  path: string;
  contenido: string;
}

/**
 * Retro de la sesión del ticket 03: un temporal de depuración (`test/_dbg.test.ts`)
 * sobrevivió a la vuelta en que se escribió, y `npx vitest` lo cargó y arrastró la
 * CLI entera (`process.exit unexpectedly called with "2"`), que casi hizo pasar un
 * rojo por ruido. En `test/` sólo vive lo que es test o fixture declarada: un
 * fichero con otra forma no es un test a medias, es basura de una sesión.
 *
 * Los dobles de `suite-cli.test.ts` no cuentan: se escriben en un directorio
 * temporal en tiempo de ejecución, no en el árbol.
 */
export function ficherosQueNoSonTests(
  ficheros: { path: string; esTest: boolean }[],
): string[] {
  return ficheros
    .filter((f) => !f.esTest)
    .map(
      (f) =>
        `${f.path}: no es un test y no está en la fixture declarada de ` +
        "test/. Un temporal de una sesión (`_diag/`, `_dbg.test.ts`) " +
        "se borra al terminar: si se queda, vitest lo carga y arrastra la suite.",
    );
}

/**
 * Marcadores de "algo que abre un navegador". Deliberadamente concretos:
 * `agent-browser` es el binario, `capturarConAgentBrowser` es el adaptador real
 * de la Captura de Gold, y `playwright`/`puppeteer` son librerías de navegador.
 */
const MARCADORES_DE_NAVEGADOR = [
  "agent-browser",
  "capturarConAgentBrowser",
  "playwright",
  "puppeteer",
];

/**
 * Binarios externos que un test **no** debe lanzar por su cuenta: son el SUT
 * (`opencode`), o herramientas de red/nube. Un test que los invoca depende de la
 * máquina y de la red, y además tarda minutos.
 */
const BINARIOS_PROHIBIDOS = ["opencode"];

/**
 * Y **el doble que los suplanta también cuenta**. Un test que inyecta un preludio
 * (`NODE_OPTIONS=--require`) o sustituye `child_process` para fingir un binario
 * está haciendo precisamente el trabajo que la allowlist tiene que ver: el test
 * que originó esta regla (`test/suite-cli.test.ts`) no escribía
 * `spawnSync("opencode")` —lo escribe el **producto**, y el preludio lo
 * intercepta—, así que un patrón sobre la llamada literal no lo cazaba y el
 * guardarraíl daba verde con el agujero abierto. Se caza la **capacidad**, no la
 * cadena.
 */
const MARCADORES_DE_DOBLE = [
  "NODE_OPTIONS",
  "opencode-falso",
  "preludio",
  "child_process\\.spawn",
];

/**
 * Procesos externos que sí son legítimos en un test, porque son rápidos, locales
 * y no dependen de nada instalado aparte: `git` (lo usa `scaffold.test.ts` para
 * montar una caché) y `robocopy` (la copia del scaffold en Windows). Están aquí
 * para que la regla no los marque, no para bendecir cualquier `spawnSync`.
 */
const BINARIOS_PERMITIDOS = ["git", "robocopy"];

/**
 * Los árboles cuyo **contenido** no se afirma desde un test: el de skills del
 * `vendor/` y el de `casos/`. Un test dice que su **forma** está (la sección
 * existe, el Caso existe); el texto concreto (`gap-x-4`, «página de prueba») lo
 * presenta la checklist del tier rápido, o se prueba con un fixture. Con el árbol
 * real, cada mejora legítima de un Skill ponía rojo `npm test`, que es justo lo
 * que ese tier dice que no debe ser (ticket 08).
 */
const ARBOLES_DE_CONTENIDO_MARCADORES = [
  "VENDOR_SKILLS_DIR",
  "CASOS_DIR",
  "lectorDeSecciones",
  "lectorDeSkillMd",
];

/** ¿El fichero lanza un proceso externo con `spawn`/`exec`/`fork`? */
function lanzaProcesoExterno(contenido: string): boolean {
  return /\b(?:spawn|spawnSync|exec|execSync|execFile|execFileSync|fork)\s*\(/.test(
    contenido,
  );
}

/** ¿El contenido nombra el binario como primer argumento de un lanzamiento? */
function lanzaBinario(contenido: string, binario: string): boolean {
  const re = new RegExp(
    `\\b(?:spawn|spawnSync|exec|execSync|execFile|execFileSync)\\s*\\(\\s*["'\`]${binario}["'\`]`,
    "i",
  );
  return re.test(contenido);
}

/**
 * Devuelve una descripción por fichero de test que abre un navegador o lanza un
 * binario externo no declarado, o vacío si la suite está limpia.
 *
 * El orden de comprobación importa: un navegador se reporta como tal (es el
 * hallazgo original del ticket 06) antes de la regla general de binarios.
 */
export function pruebasConNavegador(ficheros: FicheroDeTest[]): string[] {
  const hallazgos: string[] = [];
  for (const fichero of ficheros) {
    const navegador = MARCADORES_DE_NAVEGADOR.find((marcador) =>
      fichero.contenido.includes(marcador),
    );
    if (navegador !== undefined) {
      hallazgos.push(
        `${fichero.path}: referencia "${navegador}"; un test no debe abrir un navegador ` +
          "(usa un capturador inyectado o un script de verificación)",
      );
      continue;
    }

    if (!lanzaProcesoExterno(fichero.contenido)) continue;

    // El doble que suplanta un binario prohibido cuenta igual que la llamada
    // directa: es la capacidad de depender de él lo que la allowlist debe ver.
    const doble = MARCADORES_DE_DOBLE.find((marcador) =>
      new RegExp(marcador, "i").test(fichero.contenido),
    );
    const prohibido = BINARIOS_PROHIBIDOS.find((binario) =>
      lanzaBinario(fichero.contenido, binario),
    );
    if (prohibido === undefined && doble === undefined) continue;
    if (BINARIOS_PERMITIDOS.some((binario) => lanzaBinario(fichero.contenido, binario))) {
      continue;
    }

    hallazgos.push(
      `${fichero.path}: ${
        prohibido !== undefined
          ? `lanza el binario externo "${prohibido}"`
          : `inyecta un doble de un binario externo ("${doble}")`
      }; un test de la suite no puede depender de un binario instalado ni de la red ` +
        "(y en Windows `spawn` ignora un `PATH` inyectado, así que puede acabar " +
        "llamando al real). Sustitúyelo por un doble inyectado de verdad o declara " +
        "la excepción con motivo en scripts/verificar-tests.ts",
    );
  }
  return hallazgos;
}

/**
 * Devuelve una descripción por test que **afirma el contenido** de un árbol real
 * (el skill vendido o `casos/`) en vez de su forma, o vacío si la suite está
 * limpia.
 *
 * La regla nace de la revisión del ticket 08, donde el mismo género apareció dos
 * veces: un test del tier rápido afirmaba que los hechos seguían vigentes en el
 * `vendor/`, y cada mejora legítima de un Skill —mover un `gap-x-4`, reescribir
 * una sección— ponía rojo `npm test` por algo que no era un defecto del harness.
 * Después vinieron `test/informe.test.ts` y `test/sandbox.test.ts`, que leen el
 * árbol a propósito.
 *
 * La regla **no prohíbe leer el árbol**: lo que caza es leerlo **para afirmar su
 * texto**. Se declara por fichero en `scripts/verificar-tests.ts`, con el motivo.
 */
export function pruebasQueAfirmanContenidoDelArbol(
  ficheros: FicheroDeTest[],
): string[] {
  const hallazgos: string[] = [];
  for (const fichero of ficheros) {
    const arbol = ARBOLES_DE_CONTENIDO_MARCADORES.find((marcador) =>
      fichero.contenido.includes(marcador),
    );
    if (arbol === undefined) continue;
    // Sin lectura de fichero no hay contenido que afirmar: importar la ruta no
    // basta (p. ej. para montar un sandbox).
    if (!/readFileSync\s*\(/.test(fichero.contenido)) continue;
    hallazgos.push(
      `${fichero.path}: lee un árbol real (${arbol}) y puede estar afirmando su ` +
        "contenido; un test afirma la forma (la sección existe, el Caso existe) y " +
        "prueba el texto con un fixture, para que una mejora legítima de un Skill no " +
        "rompa `npm test`. Si aquí se lee a propósito, declara el fichero con su " +
        "motivo en ARBOL_REAL_EXENTO de scripts/verificar-tests.ts",
    );
  }
  return hallazgos;
}
