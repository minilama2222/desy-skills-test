import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CASOS_DIR, cargarCasos } from "../src/caso-loader.js";
import { esCasoDecision } from "../src/caso.js";
import {
  ANCHO_MOCKUP,
  capturarConAgentBrowser,
  dimensionesDePng,
  problemaDePng,
  TOLERANCIA_SCROLLBAR,
} from "../src/captura-gold.js";

/**
 * Verifica la Captura del mockup de los Casos-decisión (ver ADR-0011): que el
 * `input/mockup.png` de cada Caso que lo declara sea una fixture PNG **válida**
 * (firma + ancho canónico), y que no haya un `input/mockup.html` sin su PNG.
 *
 * Dos modos:
 * - por defecto: valida la fixture **commiteada**, sin abrir navegador (así
 *   corre en cualquier entorno, incluida la suite de verificación);
 * - `--recapturar`: regenera con `agent-browser` y valida el resultado (el modo
 *   del mantenedor, junto a `capturar-mockup`).
 *
 * Vive fuera de la suite porque el modo `--recapturar` abre un navegador, como
 * `scripts/verificar-captura-gold.ts`.
 *
 * Uso: npx tsx scripts/verificar-mockup.ts [--recapturar]
 */
interface CasoConMockup {
  ruta: string;
  dir: string;
}

function casosConMockup(): CasoConMockup[] {
  return cargarCasos(CASOS_DIR)
    .filter((c) => esCasoDecision(c))
    .map((c) => ({
      ruta: `${c.skill}/decision/${c.id}`,
      dir: join(CASOS_DIR, c.skill, "decision", c.id),
    }));
}

const recapturar = process.argv.slice(2).includes("--recapturar");
const hallazgos: string[] = [];

for (const caso of casosConMockup()) {
  const html = join(caso.dir, "input", "mockup.html");
  const png = join(caso.dir, "input", "mockup.png");

  if (recapturar && existsSync(html)) {
    console.log(`Recapturando mockup: ${caso.ruta}`);
    capturarConAgentBrowser(html, ANCHO_MOCKUP)(png);
  }

  if (existsSync(html) && !existsSync(png)) {
    hallazgos.push(
      `${caso.ruta}: tiene input/mockup.html pero no input/mockup.png ` +
        "(genera la fixture con `npm run capturar-mockup`)",
    );
    continue;
  }
  if (!existsSync(png)) continue;

  const bytes = readFileSync(png);
  const dims = dimensionesDePng(bytes);
  console.log(
    `  ${caso.ruta}: ${dims ? `${dims.firma} ${dims.ancho}x${dims.alto}` : "?"}, ` +
      `${bytes.length} bytes`,
  );

  // La captura de una página con scrollbar sale hasta ~20px más estrecha que el
  // viewport (1280 → 1265 en el perfil): se tolera la franja del scrollbar.
  const problema = problemaDePng(bytes, ANCHO_MOCKUP, TOLERANCIA_SCROLLBAR);
  if (problema !== undefined) {
    hallazgos.push(`${caso.ruta}: ${problema}`);
  }
}

if (hallazgos.length === 0) {
  console.log(
    recapturar
      ? "OK: los mockups recapturados son PNG válidos al ancho canónico."
      : "OK: los mockups commiteados son PNG válidos al ancho canónico.",
  );
  process.exit(0);
}

console.log(`\nLa verificación de mockups tiene ${hallazgos.length} problema/s:`);
for (const h of hallazgos) console.log(`  - ${h}`);
process.exit(1);
