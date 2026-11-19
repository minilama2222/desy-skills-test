import { describe, expect, it } from "vitest";
import { problemasDeAnclaDeFramework, problemasDelArbolDeCasos } from "../src/guardarrail-casos.js";
import type { CasoEnDisco } from "../src/guardarrail-casos.js";

/**
 * Retro de la sesión del ticket 12: `fieldset-grid-acciones` anclaba
 * `fieldset-con-legend` y `labels-visibles`, dos Checks del Framework, desde su
 * rúbrica. Un Check del Framework lo aporta el tipo de Caso: dos fuentes para un
 * mismo Guard, y en un `caso-pagina` lo haría graduarse dos veces.
 */
const caso = (
  anclas: [string, { skill: string; seccion: string; motivo?: string }][],
): CasoEnDisco => ({
  ruta: "casos/implement-layout-patterns/componente/fieldset-grid-acciones",
  skill: "implement-layout-patterns",
  tipo: "componente",
  id: "fieldset-grid-acciones",
  tienePrompt: true,
  tieneChecks: true,
  tieneRubric: true,
  idsDeChecks: anclas.map(([id]) => id),
  anclas: new Map(anclas),
});

describe("problemasDeAnclaDeFramework: un Check del Framework no se ancla", () => {
  it("señala un ancla a un id del Framework, aunque la sección exista", () => {
    const [hallazgo] = problemasDeAnclaDeFramework(
      caso([
        [
          "labels-visibles",
          { skill: "desy-validate-accessibility", seccion: "Checklist sin servidor (sesiones autónomas)" },
        ],
      ]),
    );

    expect(hallazgo).toContain("labels-visibles");
    expect(hallazgo).toContain("del Framework");
  });

  it("señala `fieldset-con-legend`, el otro que se colaba", () => {
    expect(
      problemasDeAnclaDeFramework(
        caso([
          [
            "fieldset-con-legend",
            { skill: "desy-implement-layout-patterns", seccion: "Fieldset+legend sr-only para grupos semánticos" },
          ],
        ]),
      ),
    ).toHaveLength(1);
  });

  it("no señala un Check propio del Caso", () => {
    expect(
      problemasDeAnclaDeFramework(
        caso([["estructura-grid", { skill: "desy-implement-layout-patterns", seccion: "Grid responsivo del formulario" }]]),
      ),
    ).toEqual([]);
  });

  it("un Caso que solo ancla sus Checks propios pasa el guardarraíl entero", () => {
    // Control de que la regla no tumba un Caso sano: los mismos ids que arriba
    // dan rojo si uno de ellos se ancla, y verde si ninguno lo hace.
    expect(
      problemasDelArbolDeCasos([
        {
          ...caso([]),
          idsDeChecks: ["estructura-grid"],
          anclas: new Map([
            ["estructura-grid", { skill: "desy-implement-layout-patterns", seccion: "Grid responsivo del formulario" }],
          ]),
        },
      ]),
    ).toEqual([]);
  });
});
