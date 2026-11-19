import { describe, expect, it } from "vitest";
import { problemasDeAnclajePerdidas } from "../src/guardarrail-casos.js";

/**
 * Retro de la sesión del ticket 12: el ancla **se suma** a la prosa de apoyo.
 * Esta es la mitad mecánica de esa regla de revisión —la que compara con `HEAD`—,
 * y se prueba sobre la función pura: el adaptador que pregunta a git vive en
 * `scripts/verificar-casos.ts`.
 *
 * Cada caso cambia **una** cosa respecto del siguiente y el resultado tiene que
 * distinguirse: un test que solo mira el mensaje de una función que siempre lo
 * emite no prueba nada (lo señaló la revisión de código).
 */
describe("problemasDeAnclajePerdidas: el ancla se suma, no sustituye", () => {
  const RUTA = "casos/skill/decision/caso/rubric.md";
  const ANTES = [
    "desy-design-match → «Paso 3 — Mide y reporta discrepancias»",
    "desy-design-match → «Paso 5 — Aplica el fix mínimo»",
  ];

  it("nombra exactamente la sección que se perdió, y no la que sobrevive", () => {
    const [hallazgo] = problemasDeAnclajePerdidas([
      { ruta: RUTA, anteriores: ANTES, actuales: [ANTES[0]!] },
    ]);

    expect(hallazgo).toContain("Paso 5 — Aplica el fix mínimo");
    // La que sigue citada no puede aparecer como perdida.
    expect(hallazgo).not.toContain("Paso 3 — Mide");
    expect(hallazgo).toContain("1 sección/es");
  });

  it("el mismo caso sin perder nada no da hallazgo: es el control positivo", () => {
    // Diferencia con el de arriba: una sola cita; el resto del input es idéntico.
    expect(
      problemasDeAnclajePerdidas([{ ruta: RUTA, anteriores: ANTES, actuales: ANTES }]),
    ).toEqual([]);
  });

  it("cuenta las pérdidas: dos que se caen son dos en el mensaje", () => {
    const [hallazgo] = problemasDeAnclajePerdidas([
      { ruta: RUTA, anteriores: ANTES, actuales: [] },
    ]);

    expect(hallazgo).toContain("2 sección/es");
  });

  it("no señala un Caso nuevo: sin versión en HEAD no hay nada que perder", () => {
    expect(
      problemasDeAnclajePerdidas([
        { ruta: "casos/skill/decision/nuevo/rubric.md", actuales: [] },
      ]),
    ).toEqual([]);
  });

  it("compara por título, no por orden: mover una cita no es perderla", () => {
    expect(
      problemasDeAnclajePerdidas([
        {
          ruta: RUTA,
          anteriores: ["a-skill → «Uno»", "a-skill → «Dos»"],
          actuales: ["a-skill → «Dos»", "a-skill → «Uno»"],
        },
      ]),
    ).toEqual([]);
  });

  it("una sección que cambia de skill sí se pierde: la cita es el par entero", () => {
    // El idioma distinto hace que la cita sea otra aunque el título coincida.
    const [hallazgo] = problemasDeAnclajePerdidas([
      {
        ruta: RUTA,
        anteriores: ["desy-styles-reference → «Espaciado»"],
        actuales: ["desy-implement-layout-patterns → «Espaciado»"],
      },
    ]);

    expect(hallazgo).toContain("desy-styles-reference");
  });
});
