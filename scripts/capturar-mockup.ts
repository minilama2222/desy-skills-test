import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CASOS_DIR, cargarCasos } from "../src/caso-loader.js";
import { esCasoDecision } from "../src/caso.js";
import { ANCHO_MOCKUP, capturarConAgentBrowser } from "../src/captura-gold.js";

/**
 * Genera la Captura del mockup de un Caso-decisión (ver ADR-0011): renderiza el
 * `input/mockup.html` del Caso a PNG con `agent-browser`, igual que la Captura de
 * Gold de un Caso-página (ADR-0008). El PNG es una **fixture versionada**: no se
 * regenera en cada Ejecución.
 *
 * Vive fuera de la suite porque abre un navegador (lento y con proceso propio),
 * como `scripts/verificar-captura-gold.ts`.
 *
 * Uso: npx tsx scripts/capturar-mockup.ts [<skill>/<caso> ...]
 *   Sin argumentos, recaptura el mockup de todos los Casos-decisión que tengan
 *   `input/mockup.html`.
 */
function capturar(casoDir: string): void {
  const origen = join(casoDir, "input", "mockup.html");
  const destino = join(casoDir, "input", "mockup.png");
  console.log(`Capturando mockup: ${origen} → ${destino}`);
  capturarConAgentBrowser(origen, ANCHO_MOCKUP)(destino);
  console.log(`  ${readFileSync(destino).length} bytes`);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length > 0) {
    for (const ref of args) {
      const [skill, _tipo, id] = ref.replace(/\\/g, "/").split("/");
      capturar(join(CASOS_DIR, skill!, "decision", id!));
    }
    return;
  }

  const casos = cargarCasos(CASOS_DIR).filter(
    (c) =>
      esCasoDecision(c) &&
      existsSync(join(CASOS_DIR, c.skill, "decision", c.id, "input", "mockup.html")),
  );
  if (casos.length === 0) {
    console.log("No hay Casos-decisión con input/mockup.html.");
    return;
  }
  for (const caso of casos) {
    capturar(join(CASOS_DIR, caso.skill, "decision", caso.id));
  }
}

main();
