import { describe, expect, it } from "vitest";
import type { ResultadoEjecucion } from "../src/ejecutar.js";
import type { Pin } from "../src/pin.js";
import { agregarScorecard } from "../src/scorecard.js";
import { limiteDeIntentos, N_POR_DEFECTO } from "../src/suite.js";

/**
 * Ticket 03 (bucle-de-refinamiento) / ADR-0014: el presupuesto por Caso es de
 * **entregas**, no de Ejecuciones. Se intenta hasta tener `n` entregas o agotar
 * un tope duro de intentos (`n * 2` por defecto), lo que antes llegue.
 *
 * El bucle real —parar al llegar a `n` entregas, topar al agotar intentos— se
 * prueba en `test/caso-presupuesto-correr-caso.test.ts`, con los dos dobles que
 * inyecta `correrCaso` (sandbox y `CommandRunner`). Aquí va sólo la regla pura
 * del tope.
 */
describe("limiteDeIntentos: el tope duro del presupuesto (ADR-0014)", () => {
  it("con n entregas, el tope por defecto es el doble de intentos", () => {
    expect(limiteDeIntentos(3)).toBe(6);
  });

  it("el tope nunca es menor que n: con n=1 se intenta al menos dos veces", () => {
    // Una corrida sin entrega no puede dejar el presupuesto a cero: se reintenta
    // una vez antes de darse por agotado.
    expect(limiteDeIntentos(1)).toBe(2);
  });

  it("admite un tope explícito por encima del defecto", () => {
    expect(limiteDeIntentos(3, 8)).toBe(8);
  });

  it("rechaza un tope explícito por debajo de n: no se podría tener n entregas", () => {
    expect(() => limiteDeIntentos(3, 2)).toThrow(/tope/i);
  });

  it("rechaza un tope que no es un entero", () => {
    expect(() => limiteDeIntentos(3, 2.5)).toThrow(/tope/i);
  });

  it("el N por defecto de la política es 3 entregas", () => {
    expect(limiteDeIntentos(N_POR_DEFECTO)).toBe(6);
  });
});

/**
 * La cara del presupuesto que se lee: el scorecard cuenta **entregas**, no
 * Ejecuciones. Hasta el ticket 03 la N de la política contaba intentos y el campo
 * lo decía con la palabra equivocada (ver el glosario, «Ejecución»); con el
 * presupuesto en entregas, el nombre tiene que decir lo que cuenta.
 */
const pin: Pin = {
  ref: "main",
  commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-29",
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

const sinArtefacto = (over: Partial<ResultadoEjecucion> = {}): ResultadoEjecucion =>
  ejecucion({ entrega: "sin-artefacto", artefactos: {}, grade: "INACEPTABLE", ...over });

describe("el scorecard muestra entregas e intentos por separado", () => {
  it("cuenta como entregas las Ejecuciones con Artefacto, no todas", () => {
    const caso = agregarScorecard(
      [ejecucion(), sinArtefacto(), sinArtefacto()],
      pin,
    ).skills[0]!.casos[0]!;

    expect(caso.entregas).toBe(1);
    expect(caso.intentos).toBe(3);
  });

  it("un Caso sin ninguna entrega dice 0 entregas y N intentos", () => {
    const caso = agregarScorecard([sinArtefacto(), sinArtefacto()], pin).skills[0]!
      .casos[0]!;

    expect(caso.entregas).toBe(0);
    expect(caso.intentos).toBe(2);
    // Cero entregas ⇒ INDETERMINADO: el tope agotado sin entregar no condena.
    expect(caso.veredicto).toBe("INDETERMINADO");
  });
});
