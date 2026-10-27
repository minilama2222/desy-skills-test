import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT } from "../src/repo.js";
import {
  problemasDeCodificacion,
  type FicheroDeTexto,
} from "../src/guardarrail-codificacion.js";

/**
 * Guardarraíl de codificación (ver la review del ticket 13): los ficheros de
 * texto del repo van en UTF-8 **sin BOM** y sin mojibake.
 *
 * El caso que lo motivó: al verificar a mano otro guardarraíl se corrompió un
 * fichero con un round-trip de PowerShell (BOM + acentos destrozados) y pasó
 * typecheck, los guardarraíles y el commit, porque el daño estaba en comentarios.
 *
 * Se excluyen los directorios que no son fuente del repo (`node_modules`,
 * `vendor`, `.scaffold-cache`, `.git`) y los ficheros binarios por extensión.
 *
 * Uso: npx tsx scripts/verificar-codificacion.ts
 */
const RAICES = [
  join(REPO_ROOT, "src"),
  join(REPO_ROOT, "test"),
  join(REPO_ROOT, "scripts"),
  join(REPO_ROOT, "docs"),
  join(REPO_ROOT, ".scratch"),
];

/** Ficheros de texto sueltos en la raíz que también se versionan. */
const SUELTOS = [
  "AGENTS.md",
  "CODING_STANDARDS.md",
  "GLOSSARY.md",
  "README.md",
  "package.json",
].map((n) => join(REPO_ROOT, n));

const DIRECTORIOS_EXCLUIDOS = new Set([
  "node_modules",
  "vendor",
  ".scaffold-cache",
  ".git",
  "reports",
]);

/** Extensiones de texto: lo demás (PNG, lockfiles binarios) no se mira. */
const EXTENSIONES = [".ts", ".md", ".json", ".ps1", ".yml", ".yaml", ".njk", ".sh"];

function recolectar(): FicheroDeTexto[] {
  const ficheros: FicheroDeTexto[] = [];
  const visitar = (path: string): void => {
    const nombre = path.split(/[\\/]/).pop() ?? "";
    if (DIRECTORIOS_EXCLUIDOS.has(nombre)) return;
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const full = join(path, entry.name);
      if (entry.isDirectory()) {
        visitar(full);
      } else if (EXTENSIONES.some((ext) => entry.name.endsWith(ext))) {
        ficheros.push({
          path: relative(REPO_ROOT, full).split("\\").join("/"),
          bytes: readFileSync(full),
        });
      }
    }
  };

  for (const raiz of RAICES) visitar(raiz);
  for (const suelto of SUELTOS) {
    ficheros.push({
      path: relative(REPO_ROOT, suelto).split("\\").join("/"),
      bytes: readFileSync(suelto),
    });
  }
  return ficheros;
}

const hallazgos = problemasDeCodificacion(recolectar());

if (hallazgos.length === 0) {
  console.log("OK: los ficheros de texto van en UTF-8 sin BOM y sin mojibake.");
  process.exit(0);
}

console.log(`Hay ${hallazgos.length} fichero/s con problema de codificación:`);
for (const h of hallazgos) console.log(`  - ${h}`);
console.log(
  "\nOjo con el round-trip de PowerShell: `Get-Content -Raw` + `Set-Content " +
    "-Encoding utf8` mete BOM y destroza acentos. Reescribe el fichero desde su " +
    "contenido correcto.",
);
process.exit(1);
