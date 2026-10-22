import { existsSync } from "node:fs";
import { contaminacionDelScaffold, estadoDelScaffold, SCAFFOLD_CACHE_DIR } from "../src/runner.js";

/**
 * Diagnóstico de la caché del scaffold (ver ADR-0005): dice si se puede usar o
 * si una corrida anterior la dejó contaminada.
 *
 * El runner ya se niega a copiar una caché sucia, así que este script es para
 * enterarse **antes** de lanzar nada, y para saber qué fichero sobra.
 *
 * Uso: npx tsx scripts/verificar-scaffold.ts
 */
if (!existsSync(SCAFFOLD_CACHE_DIR)) {
  console.log(`No hay caché de scaffold en ${SCAFFOLD_CACHE_DIR}.`);
  console.log("Prepárala con: powershell -File scripts/preparar-scaffold.ps1");
  process.exit(0);
}

const estado = estadoDelScaffold(SCAFFOLD_CACHE_DIR);
const problemas = contaminacionDelScaffold(estado);

console.log(`Caché: ${SCAFFOLD_CACHE_DIR}`);
console.log(`  sin rastrear: ${estado.noRastreados.join(", ") || "(ninguno)"}`);
console.log(`  dist/: ${estado.existeDist ? "presente" : "ausente"}`);

if (problemas.length === 0) {
  console.log("\nLimpia. El runner la puede copiar.");
  process.exit(0);
}

console.log(`\nCONTAMINADA (${problemas.length} problema/s):`);
for (const p of problemas) console.log(`  - ${p}`);
console.log(
  "\nArréglalo regenerando la caché:\n" +
    "  bórrala (rm -rf .scaffold-cache)\n" +
    "  powershell -File scripts/preparar-scaffold.ps1",
);
process.exit(1);
