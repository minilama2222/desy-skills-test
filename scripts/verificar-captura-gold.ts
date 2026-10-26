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
  console.log("\nOK: la Captura de Gold mide el ancho canónico.");
} finally {
  rmSync(dir, { recursive: true, force: true });
}
