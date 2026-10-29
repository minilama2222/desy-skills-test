import { describe, expect, it } from "vitest";
import type { Caso } from "../src/caso.js";
import { exitCodeDe, resumen, seleccionarCasos, type Seleccion } from "../src/suite.js";
import type { ResultadoEjecucion } from "../src/ejecutar.js";
import { agregarScorecard, renderScorecard, type Scorecard } from "../src/scorecard.js";
import type { Pin } from "../src/pin.js";

/**
 * La política del comando de CI (ticket 13) sin SUT ni disco: qué Casos entran
 * (skill / Caso / N), qué veredicto bloquea el merge y que el reporte declare
 * siempre el Pin. La corrida real —exit code del proceso, JSON en disco— la
 * fija `suite-cli.test.ts` con un `opencode` falso.
 */

const pin: Pin = {
  ref: "main",
  commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-20",
  repo: "https://bitbucket.org/sdaragon/desy-skills",
};

const caso = (skill: string, id: string): Caso => ({
  tipo: "caso-componente",
  skill,
  id,
  prompt: `tarea de ${skill}/${id}`,
  checks: [],
});

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
  exitCode: 0,
  ultimoPasoDelFlujo: "implement-component",
  arbolHash: "hash-de-fixture",
  ...over,
});

const CASOS = [
  caso("implement-component", "boton-primario"),
  caso("implement-component", "politicas-privacidad"),
  caso("preflight-check", "proyecto-no-existe"),
];

const seleccion = (over: Partial<Seleccion> = {}): Seleccion => ({ n: 1, ...over });

describe("seleccionarCasos: el subconjunto de la suite", () => {
  it("sin filtros, corre todos los Casos", () => {
    expect(seleccionarCasos(CASOS, seleccion())).toHaveLength(3);
  });

  it("--skill deja sólo los Casos de ese skill", () => {
    const elegidos = seleccionarCasos(CASOS, seleccion({ skill: "implement-component" }));

    expect(elegidos.map((c) => `${c.skill}/${c.id}`)).toEqual([
      "implement-component/boton-primario",
      "implement-component/politicas-privacidad",
    ]);
  });

  it("--case deja sólo ese Caso, aunque el id se repita en otro skill", () => {
    const casos = [...CASOS, caso("implement-pattern", "politicas-privacidad")];

    const elegidos = seleccionarCasos(casos, seleccion({ caso: "politicas-privacidad" }));

    expect(elegidos.map((c) => c.skill).sort()).toEqual([
      "implement-component",
      "implement-pattern",
    ]);
    // No elige uno "a dedo": corre **todos** los que casan, para que el reporte
    // no dependa de cuál salió antes en el árbol.
    expect(elegidos).toHaveLength(2);
  });

  it("--skill y --case juntos anclan el Caso a su skill", () => {
    const casos = [...CASOS, caso("implement-pattern", "politicas-privacidad")];

    const elegidos = seleccionarCasos(
      casos,
      seleccion({ skill: "implement-pattern", caso: "politicas-privacidad" }),
    );

    expect(elegidos.map((c) => `${c.skill}/${c.id}`)).toEqual([
      "implement-pattern/politicas-privacidad",
    ]);
  });

  it("un skill sin Casos es un error, no una suite vacía", () => {
    // Una suite vacía saldría con 0 y un CI verde sin haber evaluado nada.
    expect(() => seleccionarCasos(CASOS, seleccion({ skill: "no-existe" }))).toThrow(
      /No hay Casos para el skill "no-existe"/,
    );
  });

  it("un Caso inexistente es un error y nombra los que hay", () => {
    expect(() =>
      seleccionarCasos(CASOS, seleccion({ skill: "implement-component", caso: "no-existe" })),
    ).toThrow(/No hay Caso "no-existe".*boton-primario/);
  });

  it("N tiene que ser un entero ≥ 1", () => {
    expect(() => seleccionarCasos(CASOS, seleccion({ n: 0 }))).toThrow(/N inválido/);
    expect(() => seleccionarCasos(CASOS, seleccion({ n: 1.5 }))).toThrow(/N inválido/);
  });
});

describe("exitCodeDe: qué bloquea un merge", () => {
  const scorecardDe = (ejecuciones: ResultadoEjecucion[]): Scorecard =>
    agregarScorecard(ejecuciones, pin);

  it("0 si todos los Casos PASA", () => {
    expect(exitCodeDe(scorecardDe([ejecucion()]))).toBe(0);
  });

  it("≠ 0 si algún Caso SUSPENDE", () => {
    const scorecard = scorecardDe([
      ejecucion(),
      ejecucion({ skill: "preflight-check", caso: "proyecto-no-existe", grade: "INACEPTABLE" }),
    ]);

    expect(exitCodeDe(scorecard)).not.toBe(0);
  });

  it("0 si el único Caso es INDETERMINADO: sin dato no hay suspenso (ADR-0007)", () => {
    // El agente no alcanzó el skill: no mide el skill, así que no tumba el merge.
    const scorecard = scorecardDe([
      ejecucion({ grade: "INACEPTABLE", flujoAlcanzoSkill: false, entrega: "sin-artefacto" }),
    ]);

    expect(scorecard.skills[0]!.casos[0]!.veredicto).toBe("INDETERMINADO");
    expect(exitCodeDe(scorecard)).toBe(0);
  });

  it("≠ 0 si la suite no corrió ningún Caso: un reporte vacío no es un verde", () => {
    expect(exitCodeDe(agregarScorecard([], pin))).not.toBe(0);
  });

  it("el veredicto aplica N: un SUSPENDE y un PASA en el mismo Caso dan PASA", () => {
    const scorecard = scorecardDe([
      ejecucion({ grade: "INACEPTABLE" }),
      ejecucion({ grade: "EXCELENTE" }),
    ]);

    expect(exitCodeDe(scorecard)).toBe(0);
  });
});

describe("el reporte de la suite declara siempre el Pin testeado", () => {
  it("el JSON lleva ref, commit, fecha y repo del Pin aunque el Caso sea INDETERMINADO", () => {
    const scorecard = agregarScorecard(
      [ejecucion({ flujoAlcanzoSkill: false, entrega: "sin-artefacto" })],
      pin,
    );

    expect(scorecard.pin).toEqual({
      ref: pin.ref,
      commit: pin.commit,
      fecha: pin.fecha,
      repo: pin.repo,
    });
  });

  it("el Scorecard legible encabeza con el commit del Pin", () => {
    const markdown = renderScorecard(agregarScorecard([ejecucion()], pin));

    expect(markdown.split("\n")[0]).toBe(`# Scorecard — Pin ${pin.commit} (${pin.fecha})`);
  });
});

describe("resumen: las cuentas que se anuncian por consola", () => {
  it("cuenta Casos, veredictos y Ejecuciones; los indeterminados no se suman a los pasados", () => {
    const ejecuciones = [
      ejecucion(),
      ejecucion({ caso: "politicas-privacidad", grade: "INACEPTABLE" }),
      ejecucion({ skill: "preflight-check", flujoAlcanzoSkill: false, entrega: "sin-artefacto" }),
    ];

    expect(resumen(agregarScorecard(ejecuciones, pin), ejecuciones)).toEqual({
      skills: 2,
      casos: 3,
      pasados: 1,
      suspendidos: 1,
      indeterminados: 1,
      ejecuciones: 3,
    });
  });
});
