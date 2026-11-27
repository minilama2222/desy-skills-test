import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { seccionesCitadasEnRubric } from "../src/caso.js";

/**
 * Retro de la sesión del ticket 12: al anclar cada Check, la prosa de apoyo que
 * ya había se puede reescribir —o perder— sin que nada lo note. El estándar dice
 * que el ancla **se suma**; esto es la mitad mecánica, la que compara la rúbrica
 * con la versión anterior en git.
 */

/**
 * Las 13 rúbricas del ticket 12 que tenían prosa de apoyo en `465a071`. El ticket
 * 17 les devuelve esa prosa **literal**, con las anclas por Check sumadas encima.
 *
 * Las tres que no están (choose-library, choose-page-template,
 * component-recognizer) no tenían epígrafe: su prosa la escribió el ticket 12, así
 * que no hay nada a lo que volver.
 */
const CON_PROSA_DE_465A071 = [
  "casos/angular-translator/componente/boton-primario-angular/rubric.md",
  "casos/design-match/decision/afinado-paso-1/rubric.md",
  "casos/implement-pattern/componente/politicas-privacidad/rubric.md",
  "casos/implement-pattern/pagina/patron-pagina-paso-1-nombre-nif/rubric.md",
  "casos/preflight-check/decision/proyecto-no-existe/rubric.md",
  "casos/preflight-check/decision/proyecto-ok-libreria-version/rubric.md",
  "casos/scaffold-project/decision/no-scaffoldea-sin-permiso/rubric.md",
  "casos/styles-reference/decision/token-espaciado/rubric.md",
  "casos/validate-accessibility/decision/checklist-sin-servidor/rubric.md",
  "casos/implement-layout-patterns/componente/fieldset-grid-acciones/rubric.md",
];

const EPIGRAFE = "## Anclaje en `desy-skills`";

/** El cuerpo del epígrafe de anclaje, sin el título y sin los bordes en blanco. */
function cuerpoDelAnclaje(texto: string): string {
  // `core.autocrlf=true` en Windows deja la rúbrica del working tree en CRLF,
  // mientras `git show` devuelve el blob en LF. Sin normalizar, cada línea
  // «falta» aunque esté: el invariante compara texto, no finales de línea.
  texto = texto.replace(/\r\n/g, "\n");
  const i = texto.indexOf(EPIGRAFE);
  if (i === -1) throw new Error(`no hay «${EPIGRAFE}»`);
  const desde = i + EPIGRAFE.length;
  const siguiente = texto.indexOf("\n## ", desde);
  return texto
    .slice(desde, siguiente === -1 ? texto.length : siguiente)
    .replace(/^\n+/, "")
    .replace(/\n+$/, "");
}

/** Sin las líneas de ancla (`- <id>: <skill> → «<sección>»…`) ni las que siguen. */
function soloProsa(cuerpo: string): string[] {
  return cuerpo
    .split("\n")
    .filter((l) => !/^\s*[-*]\s+`?[a-z][a-z0-9-]+`?\s*:\s*`?[a-z][a-z0-9-]+`?\s*→/.test(l))
    .filter((l) => l.trim() !== "");
}

describe("seccionesCitadasEnRubric: qué secciones nombra la rúbrica", () => {
  const ANTES = [
    "## Anclaje en `desy-skills`",
    "",
    "- usa-selector: desy-angular-translator → «Tabla de equivalencias»",
    "",
    "Prosa de apoyo: el patrón (macro → selector), en `desy-angular-translator` →",
    "«Patrones generales de traducción»; la tabla, en `desy-angular-translator` →",
    "«Tabla de equivalencias».",
  ].join("\n");

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

/**
 * Ticket 17: la prosa del ticket 12 se resumió, y el ticket 12 pedía conservarla.
 * El tell que el propio ticket 17 da es el invariante: **cada línea de prosa de
 * `465a071` sigue en la rúbrica de hoy, palabra por palabra**. Comparar los
 * bloques enteros no vale: el ancla se suma y el intro nuevo cambia el texto.
 */
describe("ticket 17: la prosa de apoyo de 465a071 se conserva literal", () => {
  for (const ruta of CON_PROSA_DE_465A071) {
    it(`${ruta}: cada línea de prosa de 465a071 sigue palabra por palabra`, () => {
      const viejo = cuerpoDelAnclaje(
        execFileSync("git", ["show", `465a071:${ruta}`], {
          cwd: process.cwd(),
          encoding: "utf8",
        }),
      );
      const deHoy = soloProsa(cuerpoDelAnclaje(readFileSync(ruta, "utf8")));
      const queFalta = soloProsa(viejo).filter((l) => !deHoy.includes(l));

      expect(queFalta).toEqual([]);
    });
  }

  it("el invariante muerde: una prosa resumida deja la línea original fuera", () => {
    // Control negativo —el que el test de arriba necesita para no ser un verde
    // de fe—: el texto resumido que el ticket 12 dejó en `token-espaciado` NO
    // contiene la **línea** de la tabla bueno/malo del original. Antes del 17
    // citaba las etiquetas («Anti-patterns», «Ejemplos») pero no el par
    // `p-4` → `p-base`: el que enseña el Caso había desaparecido.
    const viejo = cuerpoDelAnclaje(
      execFileSync(
        "git",
        ["show", "465a071:casos/styles-reference/decision/token-espaciado/rubric.md"],
        { encoding: "utf8" },
      ),
    );
    const resumido = soloProsa(
      cuerpoDelAnclaje(
        execFileSync(
          "git",
          ["show", "52389e9:casos/styles-reference/decision/token-espaciado/rubric.md"],
          { encoding: "utf8" },
        ),
      ),
    );

    const lineaBuenoMalo = soloProsa(viejo).find((l) => l.includes("`p-4` → `p-base`"));
    expect(lineaBuenoMalo).toBeDefined();
    expect(resumido).not.toContain(lineaBuenoMalo);
  });
});
