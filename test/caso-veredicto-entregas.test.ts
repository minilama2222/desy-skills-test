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

/**
 * Ticket 21: una Ejecución cortada por infraestructura no es «no entregó».
 * El 19/11/2026 `politicas-privacidad` necesitó 6 intentos porque dos se
 * quedaron sin respuesta del proveedor; sin separarlas, el Scorecard decía que
 * el skill había fallado dos veces más de las que falló.
 */
describe("las Ejecuciones sin medir no cuentan como fallo del skill (ticket 21)", () => {
  it("van a `sinMedir` y no engordan `No entregó`", () => {
    const caso = agregarScorecard(
      [
        ejecucion({ grade: "EXCELENTE" }),
        ejecucion({
          entrega: "sin-artefacto",
          artefactos: {},
          grade: "INACEPTABLE",
          infraestructura: "tiempo",
        }),
        ejecucion({
          entrega: "sin-artefacto",
          artefactos: {},
          grade: "INACEPTABLE",
          infraestructura: "red",
        }),
      ],
      pin,
    ).skills[0]!.casos[0]!;

    expect(caso.sinMedir).toBe(2);
    expect(caso.sinArtefacto).toBe(0);
    // La igualdad documentada sigue cerrando.
    expect(caso.correctas + caso.entregoMal + caso.sinArtefacto + caso.sinMedir).toBe(
      caso.conDato,
    );
  });

  it("un fallo del SUT (exit ≠ 0 sin marca de infraestructura) sigue siendo suyo", () => {
    const caso = agregarScorecard(
      [ejecucion({ entrega: "sin-artefacto", artefactos: {}, exitCode: 1, grade: "INACEPTABLE" })],
      pin,
    ).skills[0]!.casos[0]!;
    expect(caso.sinMedir).toBe(0);
    expect(caso.sinArtefacto).toBe(1);
  });
});

/**
 * Ticket 22, decisión del mantenedor: en un **Caso-decisión** el artefacto es la
 * respuesta (`salida.md`), no un fichero del `workDir`. Exigir la invocación del
 * skill para contar dejaba a `scaffold-project` en INDETERMINADO aunque hubiera
 * decidido —bien o mal—, y un SUSPENDE real se leía como «sin dato».
 */
describe("un Caso-decisión se juzga por su respuesta (ticket 22)", () => {
  const decision = (grade: ResultadoEjecucion["grade"]) =>
    ejecucion({
      tipo: "caso-decision",
      skill: "scaffold-project",
      caso: "no-scaffoldea-sin-permiso",
      artefactos: { "salida.md": "no lo hago sin permiso" },
      entrega: "con-artefacto",
      flujoObservado: ["preflight-check"],
      flujoAlcanzoSkill: false,
      grade,
    });

  it("decidir mal es SUSPENDE, no INDETERMINADO", () => {
    const caso = agregarScorecard([decision("INACEPTABLE")], pin).skills[0]!.casos[0]!;
    expect(caso.veredicto).toBe("SUSPENDE");
    expect(caso.entregoMal).toBe(1);
    expect(caso.conDato).toBe(1);
    // El flujo no llegó al skill: la columna literal lo sigue diciendo.
    expect(caso.alcanzaronSkill).toBe(0);
  });

  it("decidir bien es PASA", () => {
    const caso = agregarScorecard([decision("EXCELENTE")], pin).skills[0]!.casos[0]!;
    expect(caso.veredicto).toBe("PASA");
    expect(caso.correctas).toBe(1);
  });

  it("su artefacto no es un hallazgo de trigger: el artefacto es la respuesta", () => {
    const caso = agregarScorecard([decision("EXCELENTE")], pin).skills[0]!.casos[0]!;
    expect(caso.hallazgosDeTrigger).toBe(0);
  });
});
