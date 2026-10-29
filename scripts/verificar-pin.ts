import { join } from "node:path";
import { problemasDeVendorSucio } from "../src/guardarrail-pin.js";
import { REPO_ROOT } from "../src/repo.js";

/**
 * Guardarraíl del Pin (ticket 04 del bucle de refinamiento): la suite no mide un
 * `vendor/desy-skills/` con cambios sin commitear.
 *
 * El runner copia `vendor/` al sandbox y el informe declara el commit de
 * `pin.json`, pero **nada compara los dos**. Una edición a mano se mide y se
 * reporta como el commit pinchado: el informe miente sobre qué se evaluó. La
 * regla es pura (`problemasDelArbolSucio`) y su adaptador de git vive en
 * `src/guardarrail-pin.ts`, compartido con `npm run suite`. Corre en el
 * pre-commit. `npm run verificar-pin`.
 */

const hallazgos = problemasDeVendorSucio(join(REPO_ROOT, "vendor", "desy-skills"));
if (hallazgos.length === 0) {
  console.log("OK: el árbol de skills vendido está limpio.");
  process.exit(0);
}

for (const h of hallazgos) console.log(h);
console.log(
  "\nMientras haya cambios ahí, el informe declararía un commit que no es el " +
    "medido. Commitea o descarta antes de correr la suite.",
);
process.exit(1);
