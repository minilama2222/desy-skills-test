/**
 * Guardarraíl de los tests: la suite debe ser determinista, así que **ningún
 * test abre un navegador**. Un adaptador que lanza un navegador vive en
 * `scripts/` (ver `scripts/verificar-captura-gold.ts` y ADR-0008): dentro de la
 * suite deja procesos vivos y la cuelga, y el pre-commit corre `npm test` en
 * cada commit.
 *
 * Esta regla es pura: recibe los ficheros a inspeccionar y devuelve los que
 * referencian un navegador. (El proceso externo rápido y legítimo —`git` en
 * `scaffold.test.ts`— no cuenta.)
 */
export interface FicheroDeTest {
  /** Ruta del fichero, para el mensaje. */
  path: string;
  contenido: string;
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
 * Devuelve una descripción por fichero de test que abre un navegador, o vacío si
 * la suite está limpia.
 */
export function pruebasConNavegador(ficheros: FicheroDeTest[]): string[] {
  const hallazgos: string[] = [];
  for (const fichero of ficheros) {
    for (const marcador of MARCADORES_DE_NAVEGADOR) {
      if (fichero.contenido.includes(marcador)) {
        hallazgos.push(
          `${fichero.path}: referencia "${marcador}"; un test no debe abrir un navegador ` +
            "(usa un capturador inyectado o un script de verificación)",
        );
        break;
      }
    }
  }
  return hallazgos;
}
