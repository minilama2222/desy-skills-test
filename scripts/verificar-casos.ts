import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";
import { anclajesDeRubric, contradiccionesDeRubric, seccionesCitadasEnRubric } from "../src/caso.js";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import {
  problemaDeCapturaDesactualizada,
  problemaDeDimensionesDeLaCaptura,
} from "../src/captura-gold.js";
import {
  deudaDeAnclaje,
  problemasDeAnclajePerdidas,
  problemasDelArbolDeCasos,
  type CasoEnDisco,
  type SeccionesCitadas,
} from "../src/guardarrail-casos.js";
import { REPO_ROOT } from "../src/repo.js";
import { VENDOR_SKILLS_DIR } from "../src/runner.js";
import { titulosDeSkill } from "../src/seccion-skill.js";

/**
 * Guardarraíl del árbol de Casos (ver el retro del ticket 09): todo Caso
 * declarado en `casos/` debe ser cargable. Es la parte adaptadora del
 * guardarraíl puro `problemasDelArbolDeCasos`: recorre el FS, describe cada Caso
 * (qué ficheros tiene) e intenta cargarlo para capturar un `checks.json`
 * malformado. Corre en el pre-commit. `npm run verificar-casos`.
 *
 * Desde el ticket 06 contrasta además las anclas de skill del `rubric.md` contra
 * los títulos reales de los `SKILL.md` de `vendor/desy-skills/skills/`: el árbol
 * canónico, porque es el que el repo versiona y contra el que se mide.
 *
 * Desde el retro del ticket 12 compara cada `rubric.md` con su versión en `HEAD`:
 * el ancla **se suma** a la prosa, así que una reescritura que se lleva por
 * delante una sección citada es un hallazgo (`problemasDeAnclajePerdidas`). La
 * referencia es `HEAD` —no el índice— para que el check diga lo mismo antes y
 * después de `git add`.
 */
function rutaRelativa(path: string): string {
  return relative(REPO_ROOT, path).split("\\").join("/");
}

/**
 * Los títulos de sección de cada skill del árbol canónico. Se lee vendor/, no un
 * checkout local: el ancla del Caso es una claim del repo y tiene que valer
 * contra lo versionado; que un checkout del usuario no la tenga aún es normal
 * mientras la petición sigue abierta.
 */
function seccionesDelArbol(): Map<string, Set<string>> {
  const porSkill = new Map<string, Set<string>>();
  if (!existsSync(VENDOR_SKILLS_DIR)) return porSkill;
  for (const skill of readdirSync(VENDOR_SKILLS_DIR, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    const path = join(VENDOR_SKILLS_DIR, skill.name, "SKILL.md");
    if (!existsSync(path)) continue;
    porSkill.set(skill.name, titulosDeSkill(readFileSync(path, "utf8")));
  }
  return porSkill;
}

/** Describe cada Caso del árbol: sus ficheros y, si falla, el error del loader. */
function describirArbol(secciones: Map<string, Set<string>>): CasoEnDisco[] {
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
        casos.push(describirCaso(dir, skill.name, tipo.name, caso.name, secciones));
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
  secciones: Map<string, Set<string>>,
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
    seccionesPorSkill: secciones,
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
 * El texto de la rúbrica (para contrastarla con los Checks: ver
 * `problemasDeRubric`), sus anclas de skill (ticket 06) y sus contradicciones
 * declaradas (ticket 13). Si el fichero no existe no se lee nada: la falta ya la
 * señala `tieneRubric`.
 */
function leerRubric(
  dir: string,
): Pick<CasoEnDisco, "textoRubric" | "anclas" | "contradicciones"> {
  const path = join(dir, "rubric.md");
  if (!existsSync(path)) return {};
  const texto = readFileSync(path, "utf8");
  const anclas = anclajesDeRubric(texto);
  const contradicciones = contradiccionesDeRubric(texto);
  return {
    textoRubric: texto,
    ...(anclas.size === 0 ? {} : { anclas }),
    ...(contradicciones.size === 0 ? {} : { contradicciones }),
  };
}

const arbol = describirArbol(seccionesDelArbol());
const hallazgos = problemasDelArbolDeCasos(arbol);

// La Captura de Gold tiene que corresponder al gold.html actual (ticket 40):
// el manifiesto guarda la clave, pero sin este contraste nadie la mira y un PNG
// viejo se queda midiendo contra una referencia que ya no es la del Caso.
for (const caso of arbol) {
  if (caso.tipo !== "pagina") continue;
  const problema = problemaDeCapturaDesactualizada(
    join(REPO_ROOT, caso.ruta, "input"),
  );
  if (problema !== undefined) hallazgos.push(`${caso.ruta}: ${problema}`);

  // Y el PNG tiene que medir lo que declara el manifiesto (ticket 22): un
  // fichero capturado sin CSS también conserva la clave y antes colaba.
  const dimensiones = problemaDeDimensionesDeLaCaptura(
    join(REPO_ROOT, caso.ruta, "input"),
  );
  if (dimensiones !== undefined) hallazgos.push(`${caso.ruta}: ${dimensiones}`);
}

/**
 * Las secciones que citaba cada rúbrica en `HEAD`, y las que **no se pudieron
 * leer**. `undefined` en `citas` significa «el Caso no está en HEAD» (es nuevo);
 * un `error` significa «no pude medir».
 *
 * La distinción es la que la revisión del diff del ticket 12 echó de menos: el
 * primer adaptador devolvía `undefined` en ambos casos, así que un `git` ausente
 * (CI Windows) o un clon sin `HEAD` **desactivaba la regla entera imprimiendo
 * OK** —el alibi que `CODING_STANDARDS.md` prohíbe—. Aquí el fallo se dice.
 */
function citasEnHead(ruta: string): { citas?: string[]; error?: string } {
  try {
    const texto = execFileSync("git", ["show", `HEAD:${ruta}`], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return { citas: seccionesCitadasEnRubric(texto) };
  } catch (error) {
    // `git show` falla igual si el fichero no está en HEAD (Caso nuevo) que si no
    // hay git o no hay HEAD. Lo segundo se detecta preguntando si el fichero
    // estaba versionado: `git ls-files` con el fichero en el índice.
    if (!gitDisponible()) {
      return { error: "no se pudo ejecutar git: la comparación con HEAD no se midió" };
    }
    const err = error as { stderr?: unknown; status?: number };
    const stderr = typeof err.stderr === "string" ? err.stderr : "";
    if (/does not exist|path .* does not exist|unknown revision/i.test(stderr)) {
      return {};
    }
    return { error: `git show HEAD:${ruta} falló: ${stderr.trim() || String(error)}` };
  }
}

let gitOk: boolean | undefined;
function gitDisponible(): boolean {
  if (gitOk === undefined) {
    try {
      execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: REPO_ROOT,
        stdio: ["ignore", "ignore", "ignore"],
      });
      gitOk = true;
    } catch {
      gitOk = false;
    }
  }
  return gitOk;
}

function citasHoy(): SeccionesCitadas[] {
  if (!existsSync(CASOS_DIR)) return [];
  const rubricas: SeccionesCitadas[] = [];
  for (const skill of readdirSync(CASOS_DIR, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    for (const tipo of readdirSync(join(CASOS_DIR, skill.name), { withFileTypes: true })) {
      if (!tipo.isDirectory()) continue;
      for (const caso of readdirSync(join(CASOS_DIR, skill.name, tipo.name), {
        withFileTypes: true,
      })) {
        if (!caso.isDirectory()) continue;
        const path = join(CASOS_DIR, skill.name, tipo.name, caso.name, "rubric.md");
        if (!existsSync(path)) continue;
        const ruta = rutaRelativa(path);
        const anterior = citasEnHead(ruta);
        rubricas.push({
          ruta,
          actuales: seccionesCitadasEnRubric(readFileSync(path, "utf8")),
          ...(anterior.citas === undefined ? {} : { anteriores: anterior.citas }),
          ...(anterior.error === undefined ? {} : { error: anterior.error }),
        });
      }
    }
  }
  return rubricas;
}

hallazgos.push(...problemasDeAnclajePerdidas(citasHoy()));

// La deuda declarada se dice aunque no bloquee: un pendiente que no se nombra
// se olvida, y la lista de `PENDIENTES_DE_ANCLAR` dejaría de vaciarse. Se mide
// por Check (`deudaDeAnclaje`): anclar uno de doce no es estar más cerca según la
// lista, pero sí según lo que queda por hacer. Desde el ticket 12 la lista está
// vacía y este bloque no imprime nada; sigue aquí por si vuelve a haber deuda.
const deuda = deudaDeAnclaje(arbol);
if (deuda.length > 0) {
  const checks = deuda.reduce((suma, d) => suma + d.sinAncla.length, 0);
  console.log(
    `${deuda.length} Caso/s sin anclar ${checks} Check/s (PENDIENTES_DE_ANCLAR, ` +
      "se anclan al tocar cada skill):",
  );
  for (const d of deuda) {
    console.log(
      `  - ${d.ruta} (${d.ticket}): ${d.sinAncla.length} de ${d.total} Check/s sin ancla ` +
        `(${d.ancladas} hecha/s) — ${d.sinAncla.join(", ")}`,
    );
  }
}

if (hallazgos.length === 0) {
  console.log(
    "OK: todos los Casos del árbol son cargables y sus anclas apuntan a secciones reales.",
  );
  process.exit(0);
}

console.log("El árbol de Casos tiene " + hallazgos.length + " problema/s:");
for (const h of hallazgos) console.log("  - " + h);
console.log(
  "\nUn Caso malformado no se valida sólo (cada test nombra su ruta): " +
    "arréglalo o quítalo del árbol.\n" +
    "Un Check sin ancla: bajo «## Anclaje en «desy-skills»» de su rubric.md, cada\n" +
    "Check necesita una línea «- <id>: <skill> → «<sección>»»; la prosa de apoyo\n" +
    "sigue valiendo, pero el informe necesita el ancla por Check.",
);
process.exit(1);
