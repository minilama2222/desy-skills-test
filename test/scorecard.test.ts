import { describe, expect, it } from "vitest";
import type { ResultadoEjecucion } from "../src/ejecutar.js";
import type { Pin } from "../src/pin.js";
import { agregarScorecard, renderScorecard } from "../src/scorecard.js";

const pin: Pin = {
  ref: "main",
  commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-20",
  repo: "https://bitbucket.org/sdaragon/desy-skills",
};

/** Una Ejecución de ejemplo; sólo importan los campos que agrega el scorecard. */
const ejecucion = (over: Partial<ResultadoEjecucion> = {}): ResultadoEjecucion => ({
  skill: "implement-component",
  caso: "boton-primario",
  tipo: "caso-componente",
  pin: pin.commit,
  grade: "EXCELENTE",
  detalle: [],
  flujoObservado: ["preflight-check", "implement-component"],
  artefactos: { "src/boton.html": "{{ componentButton() }}" },
  entrega: "con-artefacto",
  flujoAlcanzoSkill: true,
  ...over,
});

describe("agregarScorecard: veredicto de un Caso (ADR-0007)", () => {
  it("un Caso PASA si al menos una de las Ejecuciones que alcanzaron el skill es correcta", () => {
    const reporte = agregarScorecard(
      [
        ejecucion({ grade: "INACEPTABLE" }),
        ejecucion({ grade: "EXCELENTE" }),
        ejecucion({ grade: "INACEPTABLE" }),
      ],
      pin,
    );

    const caso = reporte.skills[0]!.casos[0]!;
    expect(caso.veredicto).toBe("PASA");
    expect(caso.correctas).toBe(1);
    expect(caso.alcanzaronSkill).toBe(3);
  });

  it("un Caso SUSPENDE si ninguna de las que alcanzaron el skill es correcta", () => {
    const reporte = agregarScorecard(
      [
        ejecucion({ grade: "INACEPTABLE" }),
        ejecucion({ grade: "ACEPTABLE" }),
        ejecucion({ grade: "INACEPTABLE" }),
      ],
      pin,
    );

    expect(reporte.skills[0]!.casos[0]!.veredicto).toBe("SUSPENDE");
  });

  it("un Caso es INDETERMINADO si ninguna Ejecución alcanzó el skill (no es suspenso)", () => {
    const reporte = agregarScorecard(
      [
        ejecucion({ flujoAlcanzoSkill: false, grade: "INACEPTABLE" }),
        ejecucion({ flujoAlcanzoSkill: false, grade: "INACEPTABLE" }),
      ],
      pin,
    );

    const caso = reporte.skills[0]!.casos[0]!;
    expect(caso.veredicto).toBe("INDETERMINADO");
    expect(caso.alcanzaronSkill).toBe(0);
  });

  it("descarta las Ejecuciones que no alcanzaron el skill al decidir el veredicto", () => {
    // La #1 ni arrancó el skill: no evalúa el skill, así que no puede hundir el
    // Caso. Es exactamente la distinción del ticket 15 / ADR-0007.
    const reporte = agregarScorecard(
      [
        ejecucion({ flujoAlcanzoSkill: false, grade: "INACEPTABLE" }),
        ejecucion({ flujoAlcanzoSkill: true, grade: "EXCELENTE" }),
      ],
      pin,
    );

    const caso = reporte.skills[0]!.casos[0]!;
    expect(caso.veredicto).toBe("PASA");
    expect(caso.ejecuciones).toBe(2);
    expect(caso.alcanzaronSkill).toBe(1);
  });
});

describe("agregarScorecard: separa «no entregó» de «entregó mal»", () => {
  it("cuenta las Ejecuciones sin artefacto aparte de las que entregaron mal", () => {
    const reporte = agregarScorecard(
      [
        ejecucion({ flujoAlcanzoSkill: true, entrega: "sin-artefacto", grade: "INACEPTABLE" }),
        ejecucion({ flujoAlcanzoSkill: true, entrega: "con-artefacto", grade: "INACEPTABLE" }),
        ejecucion({ flujoAlcanzoSkill: true, entrega: "con-artefacto", grade: "EXCELENTE" }),
      ],
      pin,
    );

    const caso = reporte.skills[0]!.casos[0]!;
    expect(caso.sinArtefacto).toBe(1);
    expect(caso.entregoMal).toBe(1);
    expect(caso.correctas).toBe(1);
  });

  it("las tres cuentas se miden sobre el denominador limpio (solo las que alcanzaron el skill)", () => {
    // Mismo principio que el veredicto (ADR-0007): una Ejecución que no alcanzó
    // el skill no evalúa el skill, así que no puede engordar ni «correctas» ni
    // «entregó mal» — re-mezclar los dos ejes del ticket 15 es justo el bug.
    const reporte = agregarScorecard(
      [
        ejecucion({ flujoAlcanzoSkill: false, entrega: "con-artefacto", grade: "EXCELENTE" }),
        ejecucion({ flujoAlcanzoSkill: true, entrega: "con-artefacto", grade: "EXCELENTE" }),
      ],
      pin,
    );

    const caso = reporte.skills[0]!.casos[0]!;
    expect(caso.correctas).toBe(1);
    expect(caso.entregoMal).toBe(0);
    expect(caso.sinArtefacto).toBe(0);
  });

  it("con el Caso INDETERMINADO, las cuentas salen a cero (no se contradicen)", () => {
    // Antes, «correctas» contaba todas las EXCELENTE aunque ninguna alcanzara el
    // skill, así que un INDETERMINADO podía salir con Correctas > 0.
    const reporte = agregarScorecard(
      [ejecucion({ flujoAlcanzoSkill: false, entrega: "con-artefacto", grade: "EXCELENTE" })],
      pin,
    );

    const caso = reporte.skills[0]!.casos[0]!;
    expect(caso.veredicto).toBe("INDETERMINADO");
    expect(caso.correctas).toBe(0);
    expect(caso.entregoMal).toBe(0);
  });

  it("«correctas» exige Artefacto: una EXCELENTE sin entregar no es una entrega correcta", () => {
    // Frontera: un sin-artefacto con Grade EXCELENTE (posible con un Caso cuyos
    // guards pasen en vacío) no es «entregó bien», es «no entregó». Si contara
    // en «correctas» se contaría dos veces y daría PASA a algo que no entregó.
    const reporte = agregarScorecard(
      [ejecucion({ flujoAlcanzoSkill: true, entrega: "sin-artefacto", grade: "EXCELENTE" })],
      pin,
    );

    const caso = reporte.skills[0]!.casos[0]!;
    expect(caso.correctas).toBe(0);
    expect(caso.sinArtefacto).toBe(1);
    expect(caso.correctas + caso.entregoMal + caso.sinArtefacto).toBe(caso.alcanzaronSkill);
  });

  it("las tres cuentas suman el denominador limpio en cualquier mezcla", () => {
    const reporte = agregarScorecard(
      [
        ejecucion({ flujoAlcanzoSkill: true, entrega: "con-artefacto", grade: "EXCELENTE" }),
        ejecucion({ flujoAlcanzoSkill: true, entrega: "con-artefacto", grade: "BUENO" }),
        ejecucion({ flujoAlcanzoSkill: true, entrega: "sin-artefacto", grade: "INACEPTABLE" }),
        ejecucion({ flujoAlcanzoSkill: false, entrega: "con-artefacto", grade: "EXCELENTE" }),
      ],
      pin,
    );

    const caso = reporte.skills[0]!.casos[0]!;
    expect(caso.correctas + caso.entregoMal + caso.sinArtefacto).toBe(caso.alcanzaronSkill);
    expect(caso.alcanzaronSkill).toBe(3);
  });
});

describe("agregarScorecard: forma del reporte JSON (fuente de verdad)", () => {
  it("declara siempre el Pin testeado", () => {
    const reporte = agregarScorecard([ejecucion()], pin);

    expect(reporte.pin).toEqual({
      ref: "main",
      commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
      fecha: "2026-10-20",
      repo: "https://bitbucket.org/sdaragon/desy-skills",
    });
  });

  it("agrupa las Ejecuciones por Skill y por Caso", () => {
    const reporte = agregarScorecard(
      [
        ejecucion({ skill: "implement-component", caso: "boton-primario" }),
        ejecucion({ skill: "implement-pattern", caso: "patron-pagina-paso-1-nombre-nif" }),
      ],
      pin,
    );

    expect(reporte.skills.map((s) => s.skill)).toEqual([
      "implement-component",
      "implement-pattern",
    ]);
    expect(reporte.skills[0]!.casos[0]!.caso).toBe("boton-primario");
  });

  it("un Skill recoge el veredicto de todos sus Casos", () => {
    const reporte = agregarScorecard(
      [
        ejecucion({ caso: "a", grade: "EXCELENTE" }),
        ejecucion({ caso: "b", grade: "INACEPTABLE" }),
      ],
      pin,
    );

    const skill = reporte.skills[0]!;
    expect(skill.casos.map((c) => c.caso)).toEqual(["a", "b"]);
    expect(skill.suspendidos).toBe(1);
    expect(skill.pasados).toBe(1);
  });
});

describe("agregarScorecard: guards OK y Grade de calidad por Caso", () => {
  it("resume los guards de la mejor Ejecución que alcanzó el skill", () => {
    const reporte = agregarScorecard(
      [
        ejecucion({
          grade: "INACEPTABLE",
          detalle: [
            { id: "usa-macro-boton", severity: "guard", passed: false },
            { id: "variante-primaria", severity: "guard", passed: false },
            { id: "tamano-base", severity: "quality", passed: false },
          ],
        }),
        ejecucion({
          grade: "EXCELENTE",
          detalle: [
            { id: "usa-macro-boton", severity: "guard", passed: true },
            { id: "variante-primaria", severity: "guard", passed: true },
            { id: "tamano-base", severity: "quality", passed: true },
          ],
        }),
      ],
      pin,
    );

    const caso = reporte.skills[0]!.casos[0]!;
    expect(caso.guards).toEqual({ ok: 2, total: 2 });
    expect(caso.gradeCalidad).toBe("EXCELENTE");
  });

  it("con guards en rojo, el resumen apunta a la Ejecución que más guards pasó", () => {
    const reporte = agregarScorecard(
      [
        ejecucion({
          grade: "INACEPTABLE",
          detalle: [
            { id: "a", severity: "guard", passed: true },
            { id: "b", severity: "guard", passed: false },
          ],
        }),
        ejecucion({
          grade: "INACEPTABLE",
          detalle: [
            { id: "a", severity: "guard", passed: false },
            { id: "b", severity: "guard", passed: false },
          ],
        }),
      ],
      pin,
    );

    expect(reporte.skills[0]!.casos[0]!.guards).toEqual({ ok: 1, total: 2 });
  });

  it("un Caso INDETERMINADO no resume guards: no hubo Ejecución que juzgar", () => {
    const reporte = agregarScorecard(
      [ejecucion({ flujoAlcanzoSkill: false, grade: "INACEPTABLE" })],
      pin,
    );

    const caso = reporte.skills[0]!.casos[0]!;
    expect(caso.guards).toEqual({ ok: 0, total: 0 });
    expect(caso.gradeCalidad).toBe("INACEPTABLE");
  });
});

describe("renderScorecard: revisar el resultado sin leer transcripciones", () => {
  it("declara el Pin testeado en la cabecera", () => {
    const texto = renderScorecard(agregarScorecard([ejecucion()], pin));

    expect(texto).toContain("b523ca7df8594532f5fd47376894c16bc8f1b5df");
    expect(texto).toContain("2026-10-20");
  });

  it("tabula por Skill: casos, veredicto y Grade", () => {
    const texto = renderScorecard(
      agregarScorecard(
        [
          ejecucion({ grade: "EXCELENTE" }),
          ejecucion({ caso: "otro", grade: "INACEPTABLE" }),
        ],
        pin,
      ),
    );

    expect(texto).toContain("implement-component");
    expect(texto).toContain("PASA");
    expect(texto).toContain("SUSPENDE");
  });

  it("muestra qué Caso/Check falló sin leer transcripciones", () => {
    const texto = renderScorecard(
      agregarScorecard(
        [
          ejecucion({
            grade: "INACEPTABLE",
            detalle: [
              { id: "variante-primaria", severity: "guard", passed: false },
              { id: "tamano-base", severity: "quality", passed: true },
            ],
          }),
        ],
        pin,
      ),
    );

    expect(texto).toContain("variante-primaria");
    expect(texto).toContain("boton-primario");
  });

  it("representa el Caso indeterminado, que no es un suspenso", () => {
    const texto = renderScorecard(
      agregarScorecard([ejecucion({ flujoAlcanzoSkill: false, grade: "INACEPTABLE" })], pin),
    );

    expect(texto).toContain("INDETERMINADO");
  });

  it("muestra los guards OK y el Grade de calidad del Caso", () => {
    const texto = renderScorecard(
      agregarScorecard(
        [
          ejecucion({
            grade: "BUENO",
            detalle: [
              { id: "usa-macro-boton", severity: "guard", passed: true },
              { id: "variante-primaria", severity: "guard", passed: true },
              { id: "tamano-base", severity: "quality", passed: false },
            ],
          }),
        ],
        pin,
      ),
    );

    expect(texto).toContain("2/2");
    expect(texto).toContain("BUENO");
  });
});

