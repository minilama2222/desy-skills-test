import { describe, expect, it } from "vitest";
import type { ResultadoEjecucion } from "../src/ejecutar.js";
import type { Pin } from "../src/pin.js";
import { agregarScorecard, pasaSostenido } from "../src/scorecard.js";

/**
 * Ticket 01 (bucle-de-refinamiento) / ADR-0014: el veredicto se decide sobre las
 * Ejecuciones que **entregaron**. Llegar al skill y no escribir nada no condena:
 * cero entregas es INDETERMINADO, no SUSPENDE.
 */

const pin: Pin = {
  ref: "main",
  commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-28",
  repo: "https://github.com/minilama2222/desy-skills",
};

const ejecucion = (over: Partial<ResultadoEjecucion> = {}): ResultadoEjecucion => ({
  skill: "implement-component",
  caso: "boton-primario",
  tipo: "caso-componente",
  pin: pin.commit,
  fecha: pin.fecha,
  grade: "EXCELENTE",
  detalle: [],
  flujoObservado: ["preflight-check", "implement-component"],
  artefactos: { "src/boton.html": "{{ componentButton() }}" },
  entrega: "con-artefacto",
  flujoAlcanzoSkill: true,
  exitCode: 0,
  ultimoPasoDelFlujo: "implement-component",
  arbolHash: "hash-de-fixture",
  salida: { stdout: "", stderr: "" },
  ...over,
});

const veredicto = (ejecuciones: ResultadoEjecucion[]) =>
  agregarScorecard(ejecuciones, pin).skills[0]!.casos[0]!.veredicto;

describe("veredicto sobre entregas (ADR-0014)", () => {
  it("PASA si alguna entrega es correcta, aunque otras no entregaran", () => {
    expect(
      veredicto([
        ejecucion({ entrega: "sin-artefacto", artefactos: {}, grade: "INACEPTABLE" }),
        ejecucion({ grade: "EXCELENTE" }),
      ]),
    ).toBe("PASA");
  });

  it("SUSPENDE si hubo entregas y ninguna es correcta", () => {
    expect(
      veredicto([ejecucion({ grade: "INACEPTABLE" }), ejecucion({ grade: "BUENO" })]),
    ).toBe("SUSPENDE");
  });

  it("INDETERMINADO si todas alcanzaron el skill pero NINGUNA entregó", () => {
    // El caso real de reports/suite: 3 intentos, 2 alcanzaron, 0 entregaron.
    // Antes esto daba SUSPENDE y bloqueaba el CI sin decir nada del skill.
    expect(
      veredicto([
        ejecucion({ flujoAlcanzoSkill: false, entrega: "sin-artefacto", artefactos: {}, grade: "INACEPTABLE" }),
        ejecucion({ entrega: "sin-artefacto", artefactos: {}, grade: "INACEPTABLE" }),
        ejecucion({ entrega: "sin-artefacto", artefactos: {}, grade: "INACEPTABLE" }),
      ]),
    ).toBe("INDETERMINADO");
  });

  it("una sola entrega incorrecta entre no-entregas basta para SUSPENDE", () => {
    expect(
      veredicto([
        ejecucion({ entrega: "sin-artefacto", artefactos: {}, grade: "INACEPTABLE" }),
        ejecucion({ grade: "INACEPTABLE" }),
        ejecucion({ entrega: "sin-artefacto", artefactos: {}, grade: "INACEPTABLE" }),
      ]),
    ).toBe("SUSPENDE");
  });

  it("sigue contando las no-entregas en el scorecard (no desaparecen)", () => {
    const caso = agregarScorecard(
      [
        ejecucion({ entrega: "sin-artefacto", artefactos: {}, grade: "INACEPTABLE" }),
        ejecucion({ grade: "EXCELENTE" }),
      ],
      pin,
    ).skills[0]!.casos[0]!;

    expect(caso.sinArtefacto).toBe(1);
    expect(caso.correctas).toBe(1);
    expect(caso.alcanzaronSkill).toBe(2);
  });

  it("sin ninguna Ejecución que alcance el skill sigue siendo INDETERMINADO", () => {
    expect(
      veredicto([ejecucion({ flujoAlcanzoSkill: false, entrega: "sin-artefacto", artefactos: {} })]),
    ).toBe("INDETERMINADO");
  });
});

describe("pasaSostenido: el criterio de cierre del bucle (ADR-0014)", () => {
  it("dos corridas consecutivas PASA ⇒ refinado", () => {
    expect(pasaSostenido(["SUSPENDE", "PASA", "PASA"])).toEqual({
      refinado: true,
      motivo: "las dos últimas corridas PASA",
    });
  });

  it("una sola corrida PASA no basta", () => {
    const r = pasaSostenido(["PASA"]);

    expect(r.refinado).toBe(false);
    expect(r.motivo).toContain("hacen falta dos");
  });

  it("PASA, PASA y luego SUSPENDE no es refinado: cuenta la última", () => {
    expect(pasaSostenido(["PASA", "PASA", "SUSPENDE"]).refinado).toBe(false);
  });

  it("PASA intercalado con INDETERMINADO no es refinado", () => {
    // INDETERMINADO no es un aprobado blando: no mide el skill.
    expect(pasaSostenido(["PASA", "INDETERMINADO"]).refinado).toBe(false);
    expect(pasaSostenido(["INDETERMINADO", "PASA"]).refinado).toBe(false);
  });

  it("dice qué corrida impide el cierre", () => {
    expect(pasaSostenido(["PASA", "SUSPENDE"]).motivo).toContain("SUSPENDE");
    expect(pasaSostenido(["SUSPENDE", "PASA"]).motivo).toContain("SUSPENDE");
  });

  it("dos INDETERMINADO no son refinado", () => {
    expect(pasaSostenido(["INDETERMINADO", "INDETERMINADO"]).refinado).toBe(false);
  });
});
