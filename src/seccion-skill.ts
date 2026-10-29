import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AnclaDeSkill } from "./caso.js";

/**
 * El adaptador que el informe por Caso usa para citar la sección del skill
 * (ticket 06 del bucle de refinamiento). El informe es puro y sólo sabe
 * «dame el texto de esta sección»; aquí se resuelve **dónde** vive el skill y se
 * extrae la sección por su **título**, nunca por número de línea: el ancla es una
 * frase del skill, y las líneas se mueven con cada edición.
 *
 * Los skills de un árbol tienen la forma `<dir>/<skill>/SKILL.md`: el `skills/`
 * de `vendor/desy-skills`, el de un checkout local, o el que copia el sandbox.
 */

/**
 * El texto de una sección de un `SKILL.md`, desde su título hasta el siguiente
 * título del mismo nivel o superior. `undefined` si esa sección no existe.
 *
 * El título se compara **literal** (no normalizado): dos secciones que se
 * distinguen sólo por una tilde o una mayúscula son dos secciones, y el ancla
 * del Caso cita una de ellas por su nombre exacto. Se tolera el `#` final de
 * estilo ATX (`## Título ##`) y los espacios de sobra.
 */
export function seccionDeSkill(
  skillMd: string,
  titulo: string,
): string | undefined {
  const lineas = skillMd.split(/\r?\n/);
  const buscado = titulo.trim();

  let inicio = -1;
  let nivel = 0;
  for (let i = 0; i < lineas.length; i++) {
    const match = /^(#{1,6})\s+(.*?)\s*$/.exec(lineas[i]!);
    if (!match) continue;
    const texto = match[2]!.replace(/\s*#+$/, "").trim();
    if (inicio === -1) {
      if (texto === buscado) {
        inicio = i;
        nivel = match[1]!.length;
      }
      continue;
    }
    if (match[1]!.length <= nivel) {
      return lineas.slice(inicio, i).join("\n").trimEnd();
    }
  }
  if (inicio === -1) return undefined;
  return lineas.slice(inicio).join("\n").trimEnd();
}

/**
 * Los títulos de todas las secciones de un `SKILL.md`. Lo usa el guardarraíl de
 * Casos para contrastar el ancla contra lo que el skill **tiene**: citar una
 * sección inexistente es citar una frase que nadie escribió.
 */
export function titulosDeSkill(skillMd: string): Set<string> {
  const titulos = new Set<string>();
  for (const match of skillMd.matchAll(/^#{1,6}\s+(.*?)\s*$/gm)) {
    titulos.add(match[1]!.replace(/\s*#+$/, "").trim());
  }
  return titulos;
}

/**
 * El lector de secciones sobre un árbol de skills. Devuelve `undefined` si el
 * `SKILL.md` del skill no está en el árbol: el informe lo dirá («la sección no se
 * encontró en el árbol medido»), en vez de citar el `vendor/` cuando se midió
 * otro árbol.
 */
export function lectorDeSecciones(
  arbolDeSkills: string,
): (ancla: AnclaDeSkill) => string | undefined {
  const cache = new Map<string, string | undefined>();
  return (ancla) => {
    if (!cache.has(ancla.skill)) {
      const path = join(arbolDeSkills, ancla.skill, "SKILL.md");
      cache.set(
        ancla.skill,
        existsSync(path) ? readFileSync(path, "utf8") : undefined,
      );
    }
    const skillMd = cache.get(ancla.skill);
    if (skillMd === undefined) return undefined;
    return seccionDeSkill(skillMd, ancla.seccion);
  };
}
