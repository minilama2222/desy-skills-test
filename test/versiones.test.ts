import { describe, expect, it } from "vitest";
import type { CasoScorecard, Scorecard, SkillScorecard } from "../src/scorecard.js";
import {
  diffDeVersiones,
  renderDiff,
  scorecardDeVersion,
  serializarVersion,
  validarVersion,
  type ScorecardDeVersion,
} from "../src/versiones.js";

/**
 * Ticket 09: la forma del scorecard de versión y el diff entre dos.
 *
 * El diff es **puro** y se prueba sobre dos JSON de fixture —lo que un fichero
 * de `reports/versiones/` contiene, leído de disco—, sin CLI, sin SUT y sin
 * escribir nada: la parte de rutas la cubre `test/diff-versiones-cli.test.ts`.
 */

const PIN: Scorecard["pin"] = {
  ref: "main",
  commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-20",
};

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

/** Un Caso del scorecard; sólo importan las cuentas que el diff compara. */
const caso = (over: Partial<CasoScorecard> = {}): CasoScorecard => ({
  caso: "boton-primario",
  tipo: "caso-componente",
  veredicto: "PASA",
  entregas: 3,
  intentos: 3,
  alcanzaronSkill: 3,
  correctas: 3,
  entregoMal: 0,
  sinArtefacto: 0,
  hallazgosConArtefacto: 0,
  fallos: [],
  guards: { ok: 4, total: 4 },
  gradeCalidad: "EXCELENTE",
  hallazgosDeTrigger: 0,
  triggerConEvidencia: 0,
  ...over,
});

const skill = (over: Partial<SkillScorecard> = {}): SkillScorecard => ({
  skill: "implement-component",
  casos: [caso()],
  pasados: 1,
  suspendidos: 0,
  indeterminados: 0,
  ...over,
});

/** El JSON tal como vive en `reports/versiones/<hash>.json`. */
const version = (
  arbolHash: string,
  skills: SkillScorecard[] = [skill()],
  pin: Scorecard["pin"] = PIN,
): ScorecardDeVersion => ({ arbolHash, pin, skills });

describe("scorecardDeVersion: la forma de lo versionado", () => {
  const scorecard = (over: Partial<Scorecard> = {}): Scorecard => ({
    pin: { ...PIN, repo: "C:/Users/alguien/desy-skills" },
    arbolHash: HASH_A,
    skills: [skill()],
    ...over,
  });

  it("lleva el hash, el Pin y los Skills, sin re-envolver el scorecard", () => {
    const v = scorecardDeVersion(scorecard());

    expect(v.arbolHash).toBe(HASH_A);
    expect(v.skills).toEqual([skill()]);
    // Sin `arbolHash` duplicado en `pin` ni un envoltorio tipo `{ scorecard: … }`:
    // la versión es el scorecard con su identidad al lado.
    expect(Object.keys(v).sort()).toEqual(["arbolHash", "pin", "skills"]);
  });

  it("no versiona la ruta del checkout local del Pin (ADR-0015)", () => {
    const v = scorecardDeVersion(
      scorecard({ pin: { ref: "local", commit: "local", fecha: "2026-10-28", repo: "C:/Users/alguien/desy-skills" } }),
    );

    expect(v.pin).toEqual({ ref: "local", commit: "local", fecha: "2026-10-28" });
    expect(JSON.stringify(v)).not.toContain("alguien");
  });

  it("sin arbolHash no hay versión que versionar", () => {
    expect(() => scorecardDeVersion(scorecard({ arbolHash: undefined }))).toThrow(
      /arbolHash/,
    );
  });

  it("se serializa como JSON con salto final y se vuelve a leer entero", () => {
    const original = scorecardDeVersion(scorecard());
    const texto = serializarVersion(original);

    expect(texto.endsWith("\n")).toBe(true);
    expect(validarVersion(JSON.parse(texto))).toEqual(original);
  });

  it("rechaza un JSON que no dice de qué versión habla", () => {
    expect(() => validarVersion({ pin: PIN, skills: [] })).toThrow(/arbolHash/);
    expect(() => validarVersion({ arbolHash: "", pin: PIN, skills: [] })).toThrow(/arbolHash/);
    expect(() => validarVersion(null)).toThrow(/objeto/);
  });
});

describe("diffDeVersiones: dos JSON de fixture (ticket 09)", () => {
  it("un Caso que pasa en las dos versiones no cambia", () => {
    const diff = diffDeVersiones(version(HASH_A), version(HASH_B));

    expect(diff.a.arbolHash).toBe(HASH_A);
    expect(diff.b.arbolHash).toBe(HASH_B);
    expect(diff.resumen).toEqual({ casos: 0, skills: 0 });
    expect(diff.casos).toHaveLength(1);
    expect(diff.casos[0]!.cambio).toBe(false);
    // Los dos lados se listan igual: la fila no cambia, y se ve.
    expect(diff.casos[0]!.antes).toEqual(diff.casos[0]!.despues);
  });

  it("SUSPENDE → PASA con las cuentas de entrega es un cambio", () => {
    const antes = version(HASH_A, [
      skill({ casos: [caso({ veredicto: "SUSPENDE", correctas: 0, entregoMal: 3 })], pasados: 0, suspendidos: 1 }),
    ]);
    const despues = version(HASH_B, [
      skill({ casos: [caso({ veredicto: "PASA", correctas: 3, entregoMal: 0 })], pasados: 1, suspendidos: 0 }),
    ]);

    const diff = diffDeVersiones(antes, despues);
    const fila = diff.casos[0]!;

    expect(fila.cambio).toBe(true);
    expect(fila.antes).toEqual({ veredicto: "SUSPENDE", correctas: 0, entregoMal: 3, sinEntregar: 0 });
    expect(fila.despues).toEqual({ veredicto: "PASA", correctas: 3, entregoMal: 0, sinEntregar: 0 });
    expect(diff.skills[0]!.cambio).toBe(true);
    expect(diff.skills[0]!.antes).toEqual({ pasados: 0, suspendidos: 1, indeterminados: 0 });
    expect(diff.skills[0]!.despues).toEqual({ pasados: 1, suspendidos: 0, indeterminados: 0 });
    expect(diff.resumen).toEqual({ casos: 1, skills: 1 });
  });

  it("mismo veredicto pero distinto «sin entregar» también cambia", () => {
    // El caso que el veredicto esconde: las dos versiones PASA, y lo que cambió
    // fue la tasa de entrega. Comparar sólo el veredicto lo diría «sin cambios».
    const antes = version(HASH_A, [skill({ casos: [caso({ correctas: 1, sinArtefacto: 2 })] })]);
    const despues = version(HASH_B, [skill({ casos: [caso({ correctas: 3, sinArtefacto: 0 })] })]);

    const diff = diffDeVersiones(antes, despues);

    expect(diff.casos[0]!.cambio).toBe(true);
    expect(diff.casos[0]!.antes?.sinEntregar).toBe(2);
    expect(diff.casos[0]!.despues?.sinEntregar).toBe(0);
    // El Skill sigue con el mismo recuento: es el Caso el que cambió.
    expect(diff.skills[0]!.cambio).toBe(false);
  });

  it("un Caso que sólo existe en B se lista con `antes` ausente, no como «sin cambios»", () => {
    const despues = version(HASH_B, [
      skill({
        casos: [caso(), caso({ caso: "boton-secundario" })],
        pasados: 2,
      }),
    ]);

    const diff = diffDeVersiones(version(HASH_A), despues);
    const nuevo = diff.casos.find((c) => c.caso === "boton-secundario")!;

    expect(nuevo.cambio).toBe(true);
    expect(nuevo.antes).toBeUndefined();
    expect(nuevo.despues?.veredicto).toBe("PASA");
    expect(diff.resumen.casos).toBe(1);
  });

  it("un Skill que desaparece también es un cambio", () => {
    const antes = version(HASH_A, [
      skill(),
      skill({ skill: "validate-accessibility", casos: [caso({ caso: "checklist" })] }),
    ]);

    const diff = diffDeVersiones(antes, version(HASH_B));

    const retirado = diff.skills.find((s) => s.skill === "validate-accessibility")!;
    expect(retirado.cambio).toBe(true);
    expect(retirado.despues).toBeUndefined();
    expect(diff.skills.find((s) => s.skill === "implement-component")!.cambio).toBe(false);
  });

  it("el diff es simétrico en qué cambia, y el signo lo da el orden", () => {
    const a = version(HASH_A, [skill({ casos: [caso({ veredicto: "SUSPENDE", correctas: 0, entregoMal: 3 })] })]);
    const b = version(HASH_B, [skill({ casos: [caso({ veredicto: "PASA", correctas: 3, entregoMal: 0 })] })]);

    expect(diffDeVersiones(a, b).resumen).toEqual(diffDeVersiones(b, a).resumen);
    expect(diffDeVersiones(b, a).casos[0]!.antes?.veredicto).toBe("PASA");
  });
});

describe("renderDiff", () => {
  it("dice «sin cambios» y no dibuja tablas cuando las versiones coinciden", () => {
    const texto = renderDiff(diffDeVersiones(version(HASH_A), version(HASH_B)));

    expect(texto).toContain("Sin cambios");
    expect(texto).not.toContain("| Caso |");
  });

  it("por Caso y por Skill pone el antes → después de veredicto y cuentas", () => {
    const a = version(HASH_A, [skill({ casos: [caso({ veredicto: "SUSPENDE", correctas: 0, entregoMal: 3 })], pasados: 0, suspendidos: 1 })]);
    const b = version(HASH_B, [skill({ casos: [caso({ veredicto: "PASA", correctas: 3, entregoMal: 0 })], pasados: 1, suspendidos: 0 })]);

    const texto = renderDiff(diffDeVersiones(a, b));

    expect(texto).toContain("Cambian 1 Caso/s y 1 Skill/s");
    expect(texto).toContain("| implement-component/boton-primario | SUSPENDE · 0/3/0 | PASA · 3/0/0 | sí |");
    expect(texto).toContain("| implement-component | 0/1/0 | 1/0/0 | sí |");
  });

  it("un Caso que sólo existe en B se pinta como «— → …»", () => {
    const b = version(HASH_B, [skill({ casos: [caso(), caso({ caso: "boton-secundario" })], pasados: 2 })]);

    const texto = renderDiff(diffDeVersiones(version(HASH_A), b));

    expect(texto).toContain("| implement-component/boton-secundario | — | PASA · 3/0/0 | sí |");
  });
});
