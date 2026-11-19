import { describe, expect, it } from "vitest";
import { problemasDeAnclaDeFramework, problemasDelArbolDeCasos } from "../src/guardarrail-casos.js";
import type { CasoEnDisco } from "../src/guardarrail-casos.js";

/**
 * Retro de la sesión del ticket 12: un Caso anclaba `fieldset-con-legend` y
 * `labels-visibles`, ids que el Framework también usa. El ticket 17 corrigió la
 * decisión —esos dos son Checks de negocio que el Caso **declara** (ver
 * `ancla-framework-negocio.test.ts`)—, pero la regla no desaparece: un **Guard**
 * del tipo de Caso (`un-solo-h1`, `skip-link`, los de fidelidad) lo aporta el
 * Framework y anclarlo desde la rúbrica son dos fuentes para un mismo Guard, y un
 * `caso-pagina` lo graduaría dos veces.
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

describe("problemasDeAnclaDeFramework: un Guard del Framework no se ancla", () => {
  it("señala un ancla a `un-solo-h1`, aunque la sección exista", () => {
    const [hallazgo] = problemasDeAnclaDeFramework(
      caso([["un-solo-h1", { skill: "desy-validate-accessibility", seccion: "Checklist sin servidor (sesiones autónomas)" }]]),
    );

    expect(hallazgo).toContain("un-solo-h1");
    expect(hallazgo).toContain("Guard del Framework");
  });

  it("señala `fidelidad-gap`: el Guard de un Caso-página", () => {
    expect(
      problemasDeAnclaDeFramework(
        caso([["fidelidad-gap", { skill: "desy-design-match", seccion: "Medidas canónicas" }]]),
      ),
    ).toHaveLength(1);
  });

  it("no señala los ids que el Framework comparte con un Check que el Caso declara", () => {
    // La decisión del ticket 17: estos dos se anclan. Si vuelven a entrar en
    // `GUARDS_DEL_FRAMEWORK`, este test se pone rojo.
    expect(
      problemasDeAnclaDeFramework(
        caso([
          ["fieldset-con-legend", { skill: "desy-implement-layout-patterns", seccion: "Fieldset+legend sr-only para grupos semánticos" }],
          ["labels-visibles", { skill: "desy-validate-accessibility", seccion: "Checklist sin servidor (sesiones autónomas)" }],
        ]),
      ),
    ).toEqual([]);
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
