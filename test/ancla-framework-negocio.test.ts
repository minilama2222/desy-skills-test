import { describe, expect, it } from "vitest";
import {
  deudaDeAnclaje,
  problemasDeAnclaDeFramework,
  problemasDeAnclaje,
} from "../src/guardarrail-casos.js";
import type { CasoEnDisco } from "../src/guardarrail-casos.js";

/**
 * Ticket 17, decidido: `fieldset-con-legend` y `labels-visibles` **se anclan** en
 * `fieldset-grid-acciones`.
 *
 * El retro del ticket 12 los sacó por ser ids del Framework, sin comprobar que
 * fueran **Guards del tipo de Caso**. No lo son: un Caso-componente recibe del
 * Framework sólo `tokens-del-sistema`, así que estos dos entran en el Caso porque
 * los declara en su `checks.json` —los mide— y son Checks de negocio con un id que
 * el Framework también usa. Sin ancla, el informe decía de dos Checks medidos «el
 * Check no declara de qué sección depende».
 *
 * Este fichero fija las tres mitades de la decisión:
 *
 * 1. no se rechazan como ancla: no son Guards, y el rechazo desaparece;
 * 2. la cuenta incluye los Checks que el Caso declara, sin filtrar los ids del
 *    Framework;
 * 3. el aviso de «ancla un Guard del Framework» sigue existiendo para los que sí
 *    lo son.
 */
const casoDeFieldset = (): CasoEnDisco => ({
  ruta: "casos/implement-layout-patterns/componente/fieldset-grid-acciones",
  skill: "implement-layout-patterns",
  tipo: "componente",
  id: "fieldset-grid-acciones",
  tienePrompt: true,
  tieneChecks: true,
  tieneRubric: true,
  idsDeChecks: [
    "fieldset-con-legend",
    "labels-visibles",
    "estructura-grid",
    "acciones-en-section",
    "accion-transparente",
    "espaciado-del-sistema",
  ],
  anclas: new Map([
    [
      "fieldset-con-legend",
      {
        skill: "desy-implement-layout-patterns",
        seccion: "Fieldset+legend sr-only para grupos semánticos",
      },
    ],
    [
      "labels-visibles",
      {
        skill: "desy-validate-accessibility",
        seccion: "Checklist sin servidor (sesiones autónomas)",
      },
    ],
    [
      "estructura-grid",
      { skill: "desy-implement-layout-patterns", seccion: "Grid responsivo del formulario" },
    ],
    [
      "acciones-en-section",
      { skill: "desy-implement-layout-patterns", seccion: "Acciones de página al final del form" },
    ],
    [
      "accion-transparente",
      { skill: "desy-implement-layout-patterns", seccion: "Acciones de página al final del form" },
    ],
    [
      "espaciado-del-sistema",
      { skill: "desy-styles-reference", seccion: "Espaciado (escala de tokens del proyecto)" },
    ],
  ]),
});

/** Lo que dejó el retro del ticket 12: los dos Checks sin ancla. */
const sinLasDosAnclas = (): CasoEnDisco => ({
  ...casoDeFieldset(),
  anclas: new Map(
    [...casoDeFieldset().anclas!].filter(
      ([id]) => id !== "fieldset-con-legend" && id !== "labels-visibles",
    ),
  ),
});

const SIN_ANCLA: ReadonlyMap<string, string> = new Map();
const conPendiente = (): ReadonlyMap<string, string> =>
  new Map([[casoDeFieldset().ruta, "ticket"]]);

const hallazgoDeAncla = (caso: CasoEnDisco): string | undefined =>
  problemasDeAnclaje(caso, SIN_ANCLA).find((p) => p.includes("no ancla"));

describe("fieldset-grid-acciones: dos Checks de negocio con id del Framework", () => {
  it("sus anclas no se rechazan: no son Guards del tipo de Caso", () => {
    expect(problemasDeAnclaDeFramework(casoDeFieldset())).toEqual([]);
  });

  it("el Caso completo no tiene ningún hallazgo de anclaje", () => {
    // Con las seis anclas, el Caso es verde entero: ni deuda ni aviso.
    expect(problemasDeAnclaje(casoDeFieldset(), SIN_ANCLA)).toEqual([]);
  });

  it("sin sus anclas son deuda de verdad: la cuenta incluye los Checks medidos", () => {
    // Lo que salió mal en el ticket 12: la cuenta filtraba los ids del Framework,
    // así que un Caso-componente que declara los dos y no los ancla salía «sin
    // ancla ninguno». Aquí el Caso sin las dos líneas debe 2 de sus 6 —los seis
    // son Checks que el Caso mide—.
    const [hallazgo] = problemasDeAnclaje(sinLasDosAnclas(), SIN_ANCLA);
    const [deuda] = deudaDeAnclaje([sinLasDosAnclas()], conPendiente());

    expect(hallazgo).toContain("2 de sus 6");
    expect(deuda).toMatchObject({ ancladas: 4, total: 6 });
  });

  it("lo que se gana al anclarlos: los dos dejan de salir sin sección", () => {
    // `hallazgoDeAncla` es el rojo que nombra los Checks sin ancla; con las dos
    // líneas puestas, el Caso no tiene ninguno.
    expect(hallazgoDeAncla(casoDeFieldset())).toBeUndefined();
    expect(hallazgoDeAncla(sinLasDosAnclas())).toContain("fieldset-con-legend");
  });
});
