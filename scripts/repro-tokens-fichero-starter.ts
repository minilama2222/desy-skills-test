import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import { grado } from "../src/grader.js";

/**
 * Bucle de reproducción del hallazgo `tokens-del-sistema` (ver
 * `.scratch/.../HALLAGZO-*.md`): replaya el artefacto REAL que el SUT dejó en la
 * Ejecución 2 por el grader, sin modelo ni red. Va rojo mientras el Guard de
 * tokens se deje contaminar por el boilerplate del starter.
 *
 * Uso: npx tsx scripts/repro-tokens-fichero-starter.ts [ruta-al-artefacto]
 */

const CASO = join(CASOS_DIR, "implement-component", "componente", "boton-primario");
const ARTEFACTO =
  process.argv[2] ?? join(process.env.TEMP ?? "/tmp", "artefacto-2.html");

const caso = cargarCaso(CASO);
const html = readFileSync(ARTEFACTO, "utf8");

const { grade, detalle } = grado(
  {
    artefactos: { files: { "src/pagina-prueba-EDITA-PARA-EMPEZAR.html": html } },
    transcript: { invocaciones: ["preflight-check", "implement-component"] },
  },
  { tipo: caso.tipo, checks: caso.checks },
);

for (const d of detalle) {
  console.log(`${d.passed ? "OK  " : "FALLA"} ${d.id} [${d.severity}]`);
}
console.log(`\nGrade: ${grade}`);

const tokens = detalle.find((d) => d.id === "tokens-del-sistema");
if (tokens === undefined) {
  console.log("No existe el check tokens-del-sistema: el Caso cambió.");
  process.exit(2);
}

// El síntoma del usuario: la entrega es correcta pero el Guard la hunde.
if (grade === "INACEPTABLE" && !tokens.passed) {
  console.log(
    "\nROJO: el Guard de tokens hunde una entrega correcta por el boilerplate " +
      "del fichero de ejemplo del starter.",
  );
  process.exit(1);
}

console.log("\nVERDE: el Guard ya no se contamina con el starter.");
process.exit(0);
