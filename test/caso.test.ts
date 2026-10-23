import { describe, expect, it } from "vitest";
import {
  parseChecks,
  tipoDeCarpeta,
  type Caso,
  type CasoComponente,
  type CasoPagina,
  type TipoCaso,
} from "../src/caso.js";

describe("TipoCaso", () => {
  it("usa el vocabulario del glosario para los dos tipos de Caso", () => {
    const tipos: TipoCaso[] = ["caso-componente", "caso-pagina"];
    expect(tipos).toEqual(["caso-componente", "caso-pagina"]);
  });
});

describe("tipoDeCarpeta", () => {
  it("mapea la carpeta del Caso al TipoCaso del glosario", () => {
    expect(tipoDeCarpeta("componente")).toBe("caso-componente");
    expect(tipoDeCarpeta("pagina")).toBe("caso-pagina");
  });

  it("rechaza una carpeta desconocida con un error claro", () => {
    expect(() => tipoDeCarpeta("otro")).toThrow(/componente|pagina/i);
  });
});

describe("parseChecks", () => {
  const valido = JSON.stringify({
    checks: [
      {
        id: "usa-macro-boton",
        severity: "guard",
        weight: 0,
        assert: { kind: "macro_presente", macro: "componentBoton" },
      },
      {
        id: "tokens-del-sistema",
        severity: "quality",
        weight: 2,
        assert: { kind: "un_solo_h1" },
      },
    ],
  });

  it("parsea un checks.json válido al modelo tipado", () => {
    const checks = parseChecks(valido);
    expect(checks).toHaveLength(2);
    expect(checks[0]).toEqual({
      id: "usa-macro-boton",
      severity: "guard",
      weight: 0,
      assert: { kind: "macro_presente", macro: "componentBoton" },
    });
  });

  it("acepta una lista de checks vacía", () => {
    expect(parseChecks(JSON.stringify({ checks: [] }))).toEqual([]);
  });

  it("rechaza severidad desconocida", () => {
    expect(() =>
      parseChecks(
        JSON.stringify({
          checks: [{ id: "x", severity: "bloqueante", weight: 0, assert: { kind: "un_solo_h1" } }],
        }),
      ),
    ).toThrow(/severity/i);
  });

  it("rechaza un assert con kind desconocido", () => {
    expect(() =>
      parseChecks(
        JSON.stringify({
          checks: [{ id: "x", severity: "guard", weight: 0, assert: { kind: "inventado" } }],
        }),
      ),
    ).toThrow(/kind/i);
  });

  it("exige el campo macro en macro_presente", () => {
    expect(() =>
      parseChecks(
        JSON.stringify({
          checks: [{ id: "x", severity: "guard", weight: 0, assert: { kind: "macro_presente" } }],
        }),
      ),
    ).toThrow(/macro/i);
  });

  it("exige que flujo_canonico declare pasos como lista de strings", () => {
    expect(() =>
      parseChecks(
        JSON.stringify({
          checks: [
            { id: "x", severity: "guard", weight: 0, assert: { kind: "flujo_canonico", pasos: "preflight-check" } },
          ],
        }),
      ),
    ).toThrow(/pasos/i);
  });

  it("acepta los asserts que consultan la librería de tokens DESY", () => {
    const checks = parseChecks(
      JSON.stringify({
        checks: [
          {
            id: "sin-utilities-por-defecto",
            severity: "guard",
            weight: 0,
            assert: { kind: "sin_utility_por_defecto" },
          },
          {
            id: "usa-clase-tipografica",
            severity: "quality",
            weight: 1,
            assert: { kind: "usa_clase_tipografica", clase: "c-h1" },
          },
          {
            id: "espaciado-del-sistema",
            severity: "quality",
            weight: 1,
            assert: { kind: "espaciado_del_sistema" },
          },
        ],
      }),
    );

    expect(checks.map((c) => c.assert.kind)).toEqual([
      "sin_utility_por_defecto",
      "usa_clase_tipografica",
      "espaciado_del_sistema",
    ]);
  });

  it("exige el campo clase en usa_clase_tipografica", () => {
    expect(() =>
      parseChecks(
        JSON.stringify({
          checks: [{ id: "x", severity: "quality", weight: 1, assert: { kind: "usa_clase_tipografica" } }],
        }),
      ),
    ).toThrow(/clase/i);
  });

  it("parsea los asserts de contrato de macro (variante y props)", () => {
    const checks = parseChecks(
      JSON.stringify({
        checks: [
          {
            id: "usa-variante-primaria",
            severity: "guard",
            weight: 0,
            assert: { kind: "macro_con_clase", macro: "componentButton", clase: "c-button--primary" },
          },
          {
            id: "sin-props-inventados",
            severity: "guard",
            weight: 0,
            assert: { kind: "sin_props_inventados", macro: "componentButton" },
          },
        ],
      }),
    );

    expect(checks[0]!.assert).toEqual({
      kind: "macro_con_clase",
      macro: "componentButton",
      clase: "c-button--primary",
    });
    expect(checks[1]!.assert).toEqual({
      kind: "sin_props_inventados",
      macro: "componentButton",
    });
  });

  it("exige macro y clase en macro_con_clase", () => {
    expect(() =>
      parseChecks(
        JSON.stringify({
          checks: [{ id: "x", severity: "guard", weight: 0, assert: { kind: "macro_con_clase", macro: "componentButton" } }],
        }),
      ),
    ).toThrow(/clase/i);
  });

  it("exige el campo macro en sin_props_inventados", () => {
    expect(() =>
      parseChecks(
        JSON.stringify({
          checks: [{ id: "x", severity: "guard", weight: 0, assert: { kind: "sin_props_inventados" } }],
        }),
      ),
    ).toThrow(/macro/i);
  });

  it("parsea macro_sin_clase y exige macro y clase", () => {
    const checks = parseChecks(
      JSON.stringify({
        checks: [
          {
            id: "tamano-base",
            severity: "quality",
            weight: 1,
            assert: { kind: "macro_sin_clase", macro: "componentButton", clase: "c-button--sm" },
          },
        ],
      }),
    );
    expect(checks[0]!.assert).toEqual({
      kind: "macro_sin_clase",
      macro: "componentButton",
      clase: "c-button--sm",
    });

    expect(() =>
      parseChecks(
        JSON.stringify({
          checks: [{ id: "x", severity: "quality", weight: 1, assert: { kind: "macro_sin_clase", macro: "componentButton" } }],
        }),
      ),
    ).toThrow(/clase/i);
  });

  it("exige el campo checks en la raíz", () => {
    expect(() => parseChecks(JSON.stringify({ items: [] }))).toThrow(/checks/i);
  });

  it("rechaza JSON malformado", () => {
    expect(() => parseChecks("{ no es json")).toThrow();
  });
});

describe("Caso", () => {
  it("un Caso-componente referencia su skill, id y checks", () => {
    const caso: CasoComponente = {
      tipo: "caso-componente",
      skill: "implement-component",
      id: "boton-primario",
      prompt: "Genera un botón primario",
      checks: [],
    };
    expect(caso.tipo).toBe("caso-componente");
  });

  it("un Caso-página añade la referencia al Gold", () => {
    const caso: CasoPagina = {
      tipo: "caso-pagina",
      skill: "implement-pattern",
      id: "paso-1-nombre-nif",
      prompt: "Maqueta la página",
      checks: [],
      goldPath: "input/gold.html",
      goldImagenPath: "input/gold.png",
    };
    expect(caso.goldPath).toBe("input/gold.html");
    expect(caso.goldImagenPath).toBe("input/gold.png");
  });

  it("el Caso es una unión discriminada por tipo", () => {
    const caso: Caso = {
      tipo: "caso-pagina",
      skill: "implement-pattern",
      id: "p",
      prompt: "x",
      checks: [],
      goldPath: "gold.html",
      goldImagenPath: "gold.png",
    };
    expect(caso.tipo).toBe("caso-pagina");
  });
});
