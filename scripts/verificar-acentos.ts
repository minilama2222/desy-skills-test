import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { problemasDeAcentos, type FicheroDeTexto } from "../src/guardarrail-acentos.js";
import { REPO_ROOT } from "../src/repo.js";

/**
 * Guardarraíl ortográfico (ver la retro del ticket 06): la prosa del repo no
 * puede llevar palabras españolas sin su tilde. Es la parte adaptadora del
 * guardarraíl puro `problemasDeAcentos`.
 *
 * Complementa a `verificar-codificacion`, que mira **bytes** (BOM y mojibake):
 * un fichero con los acentos aplanados está perfectamente codificado y pasaba
 * todos los checks. Esto mira **palabras**.
 *
 * Se excluyen los mismos directorios que el guardarraíl de codificación, más
 * `vendor/` (los skills vienen de aguas arriba: su ortografía no es de este repo).
 *
 * Uso: npx tsx scripts/verificar-acentos.ts
 */
const RAICES = [
  join(REPO_ROOT, "src"),
  join(REPO_ROOT, "test"),
  join(REPO_ROOT, "scripts"),
  join(REPO_ROOT, "docs"),
  join(REPO_ROOT, ".scratch"),
  join(REPO_ROOT, "casos"),
];

/** Ficheros de texto sueltos en la raíz que también se versionan. */
const SUELTOS = ["AGENTS.md", "CODING_STANDARDS.md", "GLOSSARY.md", "README.md"].map((n) =>
  join(REPO_ROOT, n),
);

const DIRECTORIOS_EXCLUIDOS = new Set([
  "node_modules",
  "vendor",
  ".scaffold-cache",
  ".git",
  "reports",
]);

/** Extensiones de **código**: de ellas sólo se mira el comentario. */
const EXTENSIONES_DE_CODIGO = [".ts"];

/** Extensiones de **prosa**: se miren sus líneas, salvo el bloque de código. */
const EXTENSIONES_DE_PROSA = [".md", ".json", ".ps1", ".sh", ".njk", ".yml", ".yaml"];

/**
 * El fichero que **contiene** el diccionario: sus entradas son, por definición,
 * las formas incorrectas, así que se marcaría a sí mismo.
 */
const DICCIONARIO = join(REPO_ROOT, "src", "guardarrail-acentos.ts");

function recolectar(): FicheroDeTexto[] {
  const ficheros: FicheroDeTexto[] = [];
  const visitar = (path: string): void => {
    const nombre = path.split(/[\\/]/).pop() ?? "";
    if (DIRECTORIOS_EXCLUIDOS.has(nombre)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) {
        visitar(full);
      } else if (full === DICCIONARIO) {
        continue;
      } else if (EXTENSIONES_DE_CODIGO.some((ext) => entry.name.endsWith(ext))) {
        ficheros.push({
          path: relative(REPO_ROOT, full).split("\\").join("/"),
          lineas: readFileSync(full, "utf8").split(/\r?\n/),
          contexto: "codigo",
        });
      } else if (EXTENSIONES_DE_PROSA.some((ext) => entry.name.endsWith(ext))) {
        ficheros.push({
          path: relative(REPO_ROOT, full).split("\\").join("/"),
          lineas: readFileSync(full, "utf8").split(/\r?\n/),
        });
      }
    }
  };

  for (const raiz of RAICES) visitar(raiz);
  for (const suelto of SUELTOS) {
    ficheros.push({
      path: relative(REPO_ROOT, suelto).split("\\").join("/"),
      lineas: readFileSync(suelto, "utf8").split(/\r?\n/),
    });
  }
  return ficheros;
}

const hallazgos = problemasDeAcentos(recolectar());

if (hallazgos.length === 0) {
  console.log("OK: la prosa del repo lleva sus tildes.");
  process.exit(0);
}

console.log(`Hay ${hallazgos.length} palabra/s sin tilde en la prosa:`);
for (const h of hallazgos) console.log(`  - ${h}`);
console.log(
  "\nUn check de codificación no lo ve: un fichero con los acentos aplanados es\n" +
    "UTF-8 válido. Reescribe la prosa desde un original correcto.",
);
process.exit(1);
