import { describe, expect, it } from "vitest";
import { seccionesCitadasEnRubric } from "../src/caso.js";

/**
 * Retro de la sesión del ticket 12: al anclar cada Check, la prosa de apoyo que
 * ya había se puede reescribir —o perder— sin que nada lo note. El estándar dice
 * que el ancla **se suma**; esto es la mitad mecánica, la que compara la rúbrica
 * con la versión anterior en git.
 */

const ANTES = [
  "## Anclaje en `desy-skills`",
  "",
  "- usa-selector: desy-angular-translator → «Tabla de equivalencias»",
  "",
  "Prosa de apoyo: el patrón (macro → selector), en `desy-angular-translator` →",
  "«Patrones generales de traducción»; la tabla, en `desy-angular-translator` →",
  "«Tabla de equivalencias».",
].join("\n");

describe("seccionesCitadasEnRubric: qué secciones nombra la rúbrica", () => {
  it("lee el ancla y la prosa, y no duplica la que sale en las dos", () => {
    expect(seccionesCitadasEnRubric(ANTES)).toEqual([
      "desy-angular-translator → «Tabla de equivalencias»",
      "desy-angular-translator → «Patrones generales de traducción»",
    ]);
  });

  it("una rúbrica sin anclas ni citas no cita nada", () => {
    expect(seccionesCitadasEnRubric("# Rúbrica\n\nSólo prosa.")).toEqual([]);
  });

  it("el ancla se lee con la forma canónica, aunque la prosa no tenga el skill", () => {
    // La prosa cita «… → «X»» sin el skill a veces; el ancla, siempre con las dos.
    const texto = "- id: desy-styles-reference → «Espaciado»";
    expect(seccionesCitadasEnRubric(`## Anclaje en desy-skills\n\n${texto}`)).toEqual([
      "desy-styles-reference → «Espaciado»",
    ]);
  });
});
