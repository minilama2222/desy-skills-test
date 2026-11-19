import { describe, expect, it } from "vitest";
import { problemasDeAnclajePerdidas } from "../src/guardarrail-casos.js";

/**
 * Retro de la sesión del ticket 12: el ancla **se suma** a la prosa de apoyo.
 * Esta es la mitad mecánica de esa regla de revisión —la que compara con `HEAD`—,
 * y se prueba sobre la función pura: el adaptador que pregunta a git vive en
 * `scripts/verificar-casos.ts`.
 */
describe("problemasDeAnclajePerdidas: el ancla se suma, no sustituye", () => {
  it("señala la sección citada en HEAD que ya no se cita", () => {
    const [hallazgo] = problemasDeAnclajePerdidas([
      {
        ruta: "casos/skill/decision/caso/rubric.md",
        anteriores: [
          "desy-design-match → «Paso 3 — Mide y reporta discrepancias»",
          "desy-design-match → «Paso 5 — Aplica el fix mínimo»",
        ],
        actuales: ["desy-design-match → «Paso 3 — Mide y reporta discrepancias»"],
      },
    ]);

    expect(hallazgo).toContain("casos/skill/decision/caso/rubric.md");
    expect(hallazgo).toContain("Paso 5 — Aplica el fix mínimo");
    expect(hallazgo).toContain("1 sección/es");
  });

  it("no señala nada si el ancla se sumó sin perder ninguna cita", () => {
    // El caso del ticket 12: las tres citas de antes siguen y hay dos anclas nuevas.
    expect(
      problemasDeAnclajePerdidas([
        {
          ruta: "casos/skill/decision/caso/rubric.md",
          anteriores: ["desy-design-match → «Paso 3»", "desy-design-match → «Paso 5»"],
          actuales: [
            "desy-design-match → «Paso 3»",
            "desy-design-match → «Paso 5»",
            "desy-design-match → «Umbral de 4 px»",
          ],
        },
      ]),
    ).toEqual([]);
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
          ruta: "casos/x/rubric.md",
          anteriores: ["a-skill → «Uno»", "a-skill → «Dos»"],
          actuales: ["a-skill → «Dos»", "a-skill → «Uno»"],
        },
      ]),
    ).toEqual([]);
  });
});
