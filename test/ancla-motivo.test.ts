import { describe, expect, it } from "vitest";
import { anclajesDeRubric } from "../src/caso.js";
import { problemasDeAnclaSinSeccion } from "../src/guardarrail-casos.js";
import type { CasoEnDisco } from "../src/guardarrail-casos.js";

/**
 * Retro de la sesión del ticket 12: `scaffold-project` ancló dos Checks al
 * título del propio skill porque la regla vive en un aviso sin epígrafe, y el
 * ancla no lo decía. El motivo (`— <por qué>`) es lo que separa «busqué y no
 * hay sección» de «no busqué».
 */
describe("AnclaDeSkill.motivo: el ancla puede decir por qué esa sección", () => {
  it("lee el motivo tras la sección, sin comérselo con el título", () => {
    const anclas = anclajesDeRubric(
      [
        "## Anclaje en `desy-skills`",
        "",
        "- no-scaffoldea-sin-permiso: desy-scaffold-project → «desy-scaffold-project» — la regla vive en el aviso sin epígrafe",
        "- pide-permiso: desy-scaffold-project → «desy-scaffold-project»",
      ].join("\n"),
    );

    expect(anclas.get("no-scaffoldea-sin-permiso")).toEqual({
      skill: "desy-scaffold-project",
      seccion: "desy-scaffold-project",
      motivo: "la regla vive en el aviso sin epígrafe",
    });
    // Sin motivo no hay campo: `undefined`, no cadena vacía.
    expect(anclas.get("pide-permiso")).toEqual({
      skill: "desy-scaffold-project",
      seccion: "desy-scaffold-project",
    });
  });

  it("un motivo con guion dentro no parte el texto", () => {
    const anclas = anclajesDeRubric(
      "## Anclaje en `desy-skills`\n\n- pide-permiso: desy-scaffold-project → «a» — el aviso dice NO los ejecutes automáticamente — y punto",
    );
    expect(anclas.get("pide-permiso")?.motivo).toBe(
      "el aviso dice NO los ejecutes automáticamente — y punto",
    );
  });

  it("lee el motivo del ancla y no como contradicción: el epígrafe es lo que separa", () => {
    // Las dos formas se parecen; aquí se prueba que el ancla se lee como ancla y
    // que la misma línea bajo el epígrafe de contradicciones no es un ancla.
    const linea = "- pide-permiso: desy-scaffold-project → «a» — porque sí";
    const ancla = anclajesDeRubric(`## Anclaje en \`desy-skills\`\n\n${linea}`);
    const contradiccion = anclajesDeRubric(
      `## El skill contradice este Check\n\n${linea}`,
    );

    expect(ancla.get("pide-permiso")?.motivo).toBe("porque sí");
    expect(contradiccion.size).toBe(0);
  });
});

describe("problemasDeAnclaSinSeccion: el título del skill no es una sección", () => {
  const caso = (anclas: [string, { skill: string; seccion: string; motivo?: string }][]): CasoEnDisco => ({
    ruta: "casos/scaffold-project/decision/no-scaffoldea-sin-permiso",
    skill: "scaffold-project",
    tipo: "decision",
    id: "no-scaffoldea-sin-permiso",
    tienePrompt: true,
    tieneChecks: true,
    tieneRubric: true,
    idsDeChecks: anclas.map(([id]) => id),
    anclas: new Map(anclas),
  });

  it("señala un ancla al propio título sin motivo", () => {
    const [hallazgo] = problemasDeAnclaSinSeccion(
      caso([["pide-permiso", { skill: "desy-scaffold-project", seccion: "desy-scaffold-project" }]]),
    );

    expect(hallazgo).toContain("pide-permiso");
    expect(hallazgo).toContain("sin motivo");
  });

  it("no señala la misma ancla cuando explica por qué", () => {
    expect(
      problemasDeAnclaSinSeccion(
        caso([
          [
            "pide-permiso",
            {
              skill: "desy-scaffold-project",
              seccion: "desy-scaffold-project",
              motivo: "el aviso no tiene epígrafe propio",
            },
          ],
        ]),
      ),
    ).toEqual([]);
  });

  it("no señala un ancla a una sección de verdad", () => {
    expect(
      problemasDeAnclaSinSeccion(
        caso([["da-los-comandos", { skill: "desy-scaffold-project", seccion: "🟦 desy-html (sitios web, portales)" }]]),
      ),
    ).toEqual([]);
  });
});
