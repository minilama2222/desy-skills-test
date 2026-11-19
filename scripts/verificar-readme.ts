import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CASOS_DIR, cargarCasos } from "../src/caso-loader.js";
import {
  problemasDeEnlaces,
  problemasDelReadme,
  rutasEnlazadas,
} from "../src/guardarrail-readme.js";
import { REPO_ROOT } from "../src/repo.js";

/**
 * Guardarraíl de la prosa de la raíz (ver el retro del ticket 10): el conteo de
 * Casos que el README declara debe coincidir con los que hay en disco. Es la parte
 * adaptadora del guardarraíl puro `problemasDelReadme`: cuenta los Casos cargables
 * del árbol y compara con la declaración `**N** Caso(s)` del README.
 *
 * Desde el ticket 11 hace también lo mismo con los **enlaces relativos** de los
 * tres documentos que son la puerta de entrada —README, GLOSSARY y AGENTS—: que
 * cada `](./ruta)` lleve a algo. Las dos reglas son claims de la misma prosa y el
 * adaptador ya está aquí; separarlas en dos scripts daría dos entradas para la
 * misma cosa. Con `verificar-readme` en el `precommit` vigila lo que el conteo: el
 * README y sus vecinos, en el gate y sin que nadie se acuerde de mirarlos.
 *
 * Corre en el pre-commit. `npm run verificar-readme`.
 */
const README = join(REPO_ROOT, "README.md");

/** ¿Existe la ruta? `existsSync` captura el demás ruido del FS; aquí basta. */
const existe = existsSync;

/** Los documentos de la raíz cuyos enlaces relativos se comprueban. */
const PROSA_DE_LA_RAIZ = ["README.md", "GLOSSARY.md", "AGENTS.md"];

const enDisco = cargarCasos(CASOS_DIR).length;
const readme = readFileSync(README, "utf8");
// Las rutas se enumeran en el módulo puro: aquí sólo se pregunta al FS. Volver a
// escribir la regex aquí la dejaría derivar de la que se prueba.
const rutasDelReadme = rutasEnlazadas(readme);
const hallazgos = [
  ...problemasDelReadme(readme, enDisco),
  ...PROSA_DE_LA_RAIZ.flatMap((documento) =>
    problemasDeEnlaces(
      documento,
      readFileSync(join(REPO_ROOT, documento), "utf8"),
      (ruta) => existe(join(REPO_ROOT, ruta)),
    ),
  ),
];

if (hallazgos.length === 0) {
  console.log(
    `OK: el README declara los ${enDisco} Casos que hay en disco y los enlaces de ` +
      `${PROSA_DE_LA_RAIZ.join(", ")} resuelven (${rutasDelReadme.length} en el README).`,
  );
  process.exit(0);
}

console.log(`La prosa de la raíz tiene ${hallazgos.length} problema/s:`);
for (const h of hallazgos) console.log(`  - ${h}`);
console.log(
  "\nEl conteo y los enlaces de la prosa son claims que ningún otro guardarraíl " +
    "lee: manténlos al día o quítalos de la prosa.",
);
process.exit(1);
