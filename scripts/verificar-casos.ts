import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import {
  problemasDelArbolDeCasos,
  type CasoEnDisco,
} from "../src/guardarrail-casos.js";
import { REPO_ROOT } from "../src/repo.js";

/**
 * Guardarraíl del árbol de Casos (ver el retro del ticket 09): todo Caso
 * declarado en `casos/` debe ser **cargable**. Es la parte adaptadora del
 * guardarraíl puro `problemasDelArbolDeCasos`: recorre el FS, describe cada Caso
 * (qué ficheros tiene) e intenta cargarlo para capturar un `checks.json`
 * malformado. Corre en el pre-commit. `npm run verificar-casos`.
 */
function rutaRelativa(path: string): string {
  return relative(REPO_ROOT, path).split("\\").join("/");
}

/** Describe cada Caso del árbol: sus ficheros y, si falla, el error del loader. */
function describirArbol(): CasoEnDisco[] {
  if (!existsSync(CASOS_DIR)) return [];
  const casos: CasoEnDisco[] = [];
  for (const skill of readdirSync(CASOS_DIR, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const skillDir = join(CASOS_DIR, skill.name);
    for (const tipo of readdirSync(skillDir, { withFileTypes: true })) {
      if (!tipo.isDirectory()) continue;
      const tipoDir = join(skillDir, tipo.name);
      for (const caso of readdirSync(tipoDir, { withFileTypes: true })) {
        if (!caso.isDirectory()) continue;
        const dir = join(tipoDir, caso.name);
        casos.push(describirCaso(dir, skill.name, tipo.name, caso.name));
      }
    }
  }
  return casos;
}

function describirCaso(
  dir: string,
  skill: string,
  tipo: string,
  id: string,
): CasoEnDisco {
  const base: CasoEnDisco = {
    ruta: rutaRelativa(dir),
    skill,
    tipo,
    id,
    tienePrompt: existsSync(join(dir, "input", "prompt.md")),
    tieneChecks: existsSync(join(dir, "expected", "checks.json")),
    tieneRubric: existsSync(join(dir, "rubric.md")),
    tieneGold: existsSync(join(dir, "input", "gold.html")),
    ...leerRubric(dir),
  };
  try {
    const caso = cargarCaso(dir);
    return { ...base, idsDeChecks: caso.checks.map((c) => c.id) };
  } catch (error) {
    return { ...base, errorDeCarga: (error as Error).message };
  }
}

/**
 * El texto de la rúbrica, para contrastarla con los Checks del Caso (ver
 * `problemasDeRubric`). Si el fichero no existe, no se lee nada: la falta ya la
 * señala `tieneRubric`.
 */
function leerRubric(dir: string): Pick<CasoEnDisco, "textoRubric"> {
  const path = join(dir, "rubric.md");
  return existsSync(path) ? { textoRubric: readFileSync(path, "utf8") } : {};
}

const hallazgos = problemasDelArbolDeCasos(describirArbol());

if (hallazgos.length === 0) {
  console.log("OK: todos los Casos del árbol son cargables.");
  process.exit(0);
}

console.log(`El árbol de Casos tiene ${hallazgos.length} problema/s:`);
for (const h of hallazgos) console.log(`  - ${h}`);
console.log(
  "\nUn Caso malformado no se valida sólo (cada test nombra su ruta): " +
    "arréglalo o quítalo del árbol.",
);
process.exit(1);
