import { describe, expect, it } from "vitest";
import { problemasDeAnclajePerdidas } from "../src/guardarrail-casos.js";

/**
 * Revisión del diff del ticket 12: el adaptador de `HEAD` devolvía `undefined`
 * tanto para «Caso nuevo» como para «no pude medir», así que un `git` ausente
 * desactivaba la regla entera imprimiendo OK. Aquí el fallo es un hallazgo.
 */
describe("problemasDeAnclajePerdidas: no medir no es un verde", () => {
  const ANTES = ["desy-design-match → «Paso 3»"];

  it("un error de medición es un hallazgo, aunque no haya pérdidas", () => {
    const [hallazgo] = problemasDeAnclajePerdidas([
      { ruta: "casos/x/rubric.md", actuales: ANTES, error: "no se pudo ejecutar git" },
    ]);

    expect(hallazgo).toContain("no se pudo comparar");
    expect(hallazgo).toContain("no se pudo ejecutar git");
    // El control: el mismo Caso, sin error y sin pérdidas, calla.
    expect(
      problemasDeAnclajePerdidas([
        { ruta: "casos/x/rubric.md", actuales: ANTES, anteriores: ANTES },
      ]),
    ).toEqual([]);
  });

  it("un Caso nuevo (sin versión en HEAD) no se trata como error", () => {
    expect(
      problemasDeAnclajePerdidas([{ ruta: "casos/x/rubric.md", actuales: ANTES }]),
    ).toEqual([]);
  });
});
