import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ANCHO_CAPTURA,
  asegurarCaptura,
  capturarConAgentBrowser,
  dimensionesDePng,
  problemaDePng,
} from "../src/captura-gold.js";

/**
 * Verifica el adaptador real de la Captura de Gold (ver ADR-0008): abre un
 * Gold-HTML con `agent-browser` a 1900px, captura y comprueba las dimensiones
 * del PNG.
 *
 * Vive fuera de la suite porque abre un navegador (lento y con proceso propio);
 * el test de invalidación es determinista y no lo necesita.
 *
 * Uso: npx tsx scripts/verificar-captura-gold.ts
 */
const dir = mkdtempSync(join(tmpdir(), "verificar-captura-"));
const gold = join(dir, "gold.html");
writeFileSync(
  gold,
  '<!doctype html><html lang="es"><body><main id="main"><h1>Gold</h1></main></body></html>',
);

try {
  console.log("Capturando con agent-browser a 1900px ...");
  const png = asegurarCaptura(dir, {
    capturar: capturarConAgentBrowser(gold, ANCHO_CAPTURA),
  });

  const bytes = readFileSync(png);
  const dims = dimensionesDePng(bytes);
  console.log(`PNG: ${png}`);
  console.log(
    `  firma: ${dims?.firma ?? "?"}, ${dims?.ancho ?? "?"}x${dims?.alto ?? "?"}, ` +
      `${bytes.length} bytes`,
  );

  const problema = problemaDePng(bytes, ANCHO_CAPTURA);
  if (problema !== undefined) {
    throw new Error(problema);
  }

  // Ticket 22: un Gold local que enlaza un CSS inexistente no se captura a
  // ciegas —así salió el PNG sin estilos—. La comprobación ocurre antes de
  // abrir el navegador.
  const dirSinCss = mkdtempSync(join(tmpdir(), "verificar-sin-css-"));
  try {
    const goldSinCss = join(dirSinCss, "gold.html");
    writeFileSync(
      goldSinCss,
      '<!doctype html><html><head><link rel="stylesheet" href="css/styles.css"></head>' +
        "<body><main><h1>Sin CSS</h1></main></body></html>",
    );
    let error: Error | undefined;
    try {
      capturarConAgentBrowser(goldSinCss, ANCHO_CAPTURA)(join(dirSinCss, "gold.png"));
    } catch (e) {
      error = e as Error;
    }
    if (error === undefined || !/no existen/.test(error.message)) {
      throw new Error(
        "un Gold local con CSS inexistente se capturó en vez de fallar: " +
          "volvería a producir un PNG sin estilos",
      );
    }
    console.log("  un Gold local sin su CSS falla antes de capturar.");
  } finally {
    rmSync(dirSinCss, { recursive: true, force: true });
  }

  console.log("\nOK: la Captura de Gold mide el ancho canónico.");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
