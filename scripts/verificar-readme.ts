import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CASOS_DIR, cargarCasos } from "../src/caso-loader.js";
import { problemasDelReadme } from "../src/guardarrail-readme.js";
import { REPO_ROOT } from "../src/repo.js";

/**
 * Guardarraíl del README (ver el retro del ticket 10): el conteo de Casos que el
 * README declara debe coincidir con los que hay en disco. Es la parte adaptadora
 * del guardarraíl puro `problemasDelReadme`: cuenta los Casos cargables del árbol
 * y compara con la declaración `**N** Caso(s)` del README.
 *
 * Corre en el pre-commit. `npm run verificar-readme`.
 */
const README = join(REPO_ROOT, "README.md");

const enDisco = cargarCasos(CASOS_DIR).length;
const readme = readFileSync(README, "utf8");
const hallazgos = problemasDelReadme(readme, enDisco);

if (hallazgos.length === 0) {
  console.log(
    `OK: el README declara los ${enDisco} Casos que hay en disco.`,
  );
  process.exit(0);
}

console.log(`El README tiene ${hallazgos.length} problema/s:`);
for (const h of hallazgos) console.log(`  - ${h}`);
console.log(
  "\nEl conteo del README es una claim que ningún otro guardarraíl lee: " +
    "mantenlo al día o quítalo de la prosa.",
);
process.exit(1);
