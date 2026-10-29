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

  const rutas = lineas.map((l) => l.slice(3).trim()).filter((r) => r.length > 0);  const listado = rutas.map((r) => `  - ${r}`).join("\n");
  return [
    `${dir} tiene ${rutas.length} cambio/s sin commitear. La suite no mide un ` +
      "árbol sucio: el informe declararía el commit de pin.json sin serlo. " +
      "Commitea o descarta los cambios (o usa el pin local, ticket 05).\n" +
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
  const porcelain = execFileSync("git", ["status", "--porcelain", vendorDir], {
    cwd: vendorDir,
    encoding: "utf8",
  });
  return problemasDelArbolSucio(porcelain, "vendor/desy-skills");
}

/** La ruta de un fichero dentro del árbol, uniendo con `/`. */
export function rutaEnArbol(base: string, ruta: string): string {
  return join(base, ...ruta.split("/"));
}
