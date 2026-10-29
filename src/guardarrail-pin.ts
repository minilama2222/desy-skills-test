/**
 * Guardarraíl del Pin: el informe no puede declarar un commit que no es el que
 * se midió (ticket 04 del bucle de refinamiento).
 *
 * Hoy `runCaso(caso, pin, deps)` recibe el Pin y **no lo lee**; el commit del
 * informe sale de `pin.json` tal cual (`src/ejecutar.ts`). Editar a mano un
 * `SKILL.md` dentro de `vendor/desy-skills/` mide la edición y la reporta como el
 * commit pinchado. Este módulo aporta las dos piezas que lo evitan:
 *
 * - `hashDelArbol`: la identidad de **qué skills se midieron**, derivada del
 *   contenido que se copia al sandbox. Es lo que se compara entre versiones; el
 *   commit no basta, porque hay versiones sin commit (un checkout local sucio).
 * - `problemasDelArbolSucio`: un hallazgo si el árbol tiene cambios sin commitear,
 *   para que la suite se niegue a medir en silencio.
 *
 * Es **pura**: recibe rutas y listados, no toca el FS. El adaptador vive en
 * `scripts/verificar-pin.ts` y en el runner.
 */

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { REPO_ROOT } from "./repo.js";

/**
 * Ficheros excluidos del hash a propósito. `assets/catalog.json` es 627 KB de
 * catálogo de componentes que cambia por razones ajenas al texto de los skills:
 * incluirlo haría que cualquier refresco del catálogo invalidara todas las
 * versiones y ensuciaría el diff entre dos versiones idénticas en prosa.
 */
export const EXCLUIDOS_DEL_HASH: readonly string[] = ["desy-component-recognizer/assets/catalog.json"];

/** Un fichero del árbol de skills, con su ruta relativa a `skills/` y su texto. */
export interface FicheroDeSkill {
  /** Ruta relativa a `skills/`, con `/` como separador. */
  ruta: string;
  contenido: string;
}

/** ¿Este fichero cuenta para la identidad de la versión? */
export function cuentaParaElHash(ruta: string): boolean {
  return !EXCLUIDOS_DEL_HASH.includes(ruta);
}

/**
 * El hash de una versión de skills: SHA-256 sobre la lista ordenada de
 * `ruta\0contenido`, excluyendo `EXCLUIDOS_DEL_HASH`.
 *
 * El orden se normaliza aquí para que el hash no dependa de cómo el FS enumeró
 * los ficheros: misma versión, mismo hash, en cualquier plataforma.
 */
export function hashDelArbol(ficheros: FicheroDeSkill[]): string {
  const incluidos = ficheros
    .filter((f) => cuentaParaElHash(f.ruta))
    .map((f) => `${f.ruta}\u0000${f.contenido}`)
    .sort();
  return createHash("sha256").update(incluidos.join("\u0001"), "utf8").digest("hex");
}

/**
 * ¿El árbol tiene cambios sin commitear? `porcelain` es la salida de
 * `git status --porcelain <dir>`, sin filtrar. Devuelve los hallazgos legibles.
 *
 * Sólo cuentan los cambios **del propio árbol de skills**: un `bump-pin` reescribe
 * `vendor/` entero, y si el usuario tiene otra cosa en ese directorio el mensaje
 * ha de decir qué fichero es, no «hay cambios».
 */
export function problemasDelArbolSucio(porcelain: string, dir: string): string[] {
  const lineas = porcelain
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lineas.length === 0) return [];

  const rutas = lineas.map((l) => l.slice(3).trim()).filter((r) => r.length > 0);
  const listado = rutas.map((r) => `  - ${r}`).join("\n");
  return [
    `${dir} tiene ${rutas.length} cambio/s sin commitear. La suite no mide un ` +
      "árbol sucio: el informe diría que midió una versión que no es. " +
      "Commitea o descarta los cambios (o declara el pin local, ticket 05).\n" +
      listado,
  ];
}

/** Ruta relativa a `skills/` con `/`, sea cual sea el separador del SO. */
export function rutaDeSkill(base: string, absoluta: string): string {
  return relative(base, absoluta).split(sep).join("/");
}

/**
 * El adaptador: lee el estado de git del árbol vendido y devuelve los hallazgos.
 * Lo comparten `npm run suite` (antes de gastar una corrida) y `verificar-pin`
 * (en el precommit), para que la regla se aplique en un solo sitio.
 */
export function problemasDeVendorSucio(vendorDir: string): string[] {
  if (!existsSync(vendorDir)) {
    throw new Error(`No existe el vendor de skills en ${vendorDir}`);
  }
  return problemasDelArbolSucio(porcelainDe(vendorDir, "."), etiquetaDeArbol(vendorDir));
}

/**
 * La salida de `git status --porcelain` del **árbol que se mide**, no del repo que
 * lo contiene.
 *
 * `git status <dir>` desde cualquier sitio filtra por ruta, no se limita a ella:
 * los modos de fichero y los tags no se filtran, y con un `dir` que es la raíz del
 * repo superior la salida es la del repo entero. Da igual cuando el vendor es su
 * propio repositorio (hoy), pero la pregunta es «¿está limpio este árbol?», y eso
 * se contesta igual para un checkout local (ticket 05) y para un subdirectorio
 * `vendor/desy-skills/`.
 *
 * Por eso el `cwd` es **el propio árbol** y el pathspec `.`: lo que quede fuera de
 * él no se pregunta. `--untracked-files=all` cuenta las notas de un skill sin
 * fichero raíz, que el [`normal` por defecto colapsaría a la carpeta y cuyo nombre
 * el mensaje tiene que decir.
 */
function porcelainDe(dir: string, pathspec: string): string {
  if (!existsSync(dir)) {
    throw new Error(`No existe el árbol de skills en ${dir}`);
  }
  return execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", pathspec], {
    cwd: dir,
    encoding: "utf8",
  });
}

/**
 * El árbol de skills **local** de una corrida con Pin local (ticket 05): el mismo
 * guardarraíl del ticket 04, y por la misma razón. Un checkout local sucio es
 * legal mientras dura la iteración, pero **no se mide en silencio**: si
 * `vendor/` no puede mentir, un árbol local tampoco.
 *
 * Se pregunta por `skills/`, el subdirectorio que se copia al sandbox: el resto
 * del checkout es del usuario y no cambia lo que el SUT ve.
 */
export function problemasDeArbolLocalSucio(checkoutDir: string): string[] {
  if (!existsSync(checkoutDir)) {
    throw new Error(`No existe el checkout local de skills en ${checkoutDir}`);
  }
  const porcelain = porcelainDe(checkoutDir, "skills");
  // Git devuelve la ruta relativa al repo (`skills/<skill>/…`);
  // `cuentaParaElHash` habla en la forma del hash, relativa a `skills/`, y el
  // mensaje dice la del repo, que es la que el usuario ve en su `git status`.
  const contadas = porcelain
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .filter((l) => cuentaParaElHash(l.slice(3).trim().slice("skills/".length)));
  return problemasDelArbolSucio(contadas.join("\n"), etiquetaDeArbol(checkoutDir));
}

/**
 * Las skills de un checkout local: `skills/`, que es lo que se copia al SUT. Un
 * checkout sin él no es un árbol de skills y se dice en voz alta: sin esto, los
 * skills serían un directorio **vacío** y las Ejecuciones dirían «sin artefacto»,
 * que se leería como un fallo del skill.
 */
export function skillsDeCheckout(checkoutDir: string): string {
  const skills = join(checkoutDir, "skills");
  if (!existsSync(skills)) {
    throw new Error(`No existe el árbol de skills local en ${skills}`);
  }
  return skills;
}

/**
 * Cómo se nombra un árbol en los mensajes. El vendor tiene nombre fijo; cualquier
 * otro —el checkout local, o el directorio padre en los tests— se dice relativo a
 * su padre, para no imprimir una ruta absoluta que no le dice nada a nadie.
 */
function etiquetaDeArbol(dir: string): string {
  if (dir === join(REPO_ROOT, "vendor", "desy-skills")) return "vendor/desy-skills";
  const nombre = dir.split(/[\\/]/).filter(Boolean).pop() ?? dir;
  return `../${nombre}`;
}

/** La ruta de un fichero dentro del árbol, uniendo con `/`. */
export function rutaEnArbol(base: string, ruta: string): string {
  return join(base, ...ruta.split("/"));
}
