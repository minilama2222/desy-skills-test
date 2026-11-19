import { describe, expect, it } from "vitest";
import {
  EPIGRAFE_CONTRADICCIONES,
  anclajesDeRubric,
  contradiccionesDeRubric,
  parseChecks,
  tipoDeCarpeta,
  type Caso,
  type CasoComponente,
  type CasoPagina,
  type TipoCaso,
} from "../src/caso.js";

describe("anclajesDeRubric: la sección del skill que el Caso nombra (ticket 06)", () => {
  const rubric = (epigrafe: string, lineas: string[]): string =>
    ["# Rúbrica", "", epigrafe, "", ...lineas, "", "## Fuera de alcance", "- otra: x → «no cuenta»"].join("\n");

  it("lee id, skill y título de la sección en cada línea del epígrafe", () => {
    const anclajes = anclajesDeRubric(
      rubric("## Anclaje en `desy-skills`", [
        "- usa-macro: desy-implement-component → «Ejemplo 1: Botón \"Enviar\" en desy-angular»",
        "- tamano-base: desy-implement-component → «Tamaños: cada componente con su propia clase»",
      ]),
    );

    expect([...anclajes]).toEqual([
      ["usa-macro", { skill: "desy-implement-component", seccion: 'Ejemplo 1: Botón "Enviar" en desy-angular' }],
      ["tamano-base", { skill: "desy-implement-component", seccion: "Tamaños: cada componente con su propia clase" }],
    ]);
  });

  it("el epígrafe se reconoce con y sin backticks en el título", () => {
    const con = anclajesDeRubric(rubric("## Anclaje en desy-skills", ["- a-b: s-x → «Sección»"]));
    const sin = anclajesDeRubric(rubric("## Anclaje en `desy-skills`", ["- a-b: s-x → «Sección»"]));

    expect(con.get("a-b")).toEqual({ skill: "s-x", seccion: "Sección" });
    expect(sin.get("a-b")).toEqual(con.get("a-b"));
  });

  it("sólo cuenta las líneas de su epígrafe, no otra prosa con flechas", () => {
    const anclajes = anclajesDeRubric(
      rubric("### Anclaje en desy-skills", ["- a-b: s-x → «Sección»"]),
    );

    expect(anclajes.has("otra")).toBe(false);
    expect(anclajes.size).toBe(1);
  });

  it("acepta el skill entre backticks, como lo escribe la prosa del repo", () => {
    const anclajes = anclajesDeRubric(
      rubric("## Anclaje en desy-skills", ["- `a-b`: `s-x` → «Sección»"]),
    );

    expect(anclajes.get("a-b")).toEqual({ skill: "s-x", seccion: "Sección" });
  });

  it("una línea que no sigue la forma no se lee como ancla", () => {
    const anclajes = anclajesDeRubric(
      rubric("## Anclaje en desy-skills", [
        "Prosa: `usa-macro` vive en desy-implement-component.",
        "- sin flecha: desy-implement-component",
      ]),
    );

    expect(anclajes.size).toBe(0);
  });
});

describe("contradiccionesDeRubric: el skill contra el que choca un Check (ticket 13)", () => {
  const rubric = (epigrafe: string, lineas: string[]): string =>
    ["# Rúbrica", "", epigrafe, "", ...lineas, "", "## Fuera de alcance", "- otra: x → «no cuenta»"].join("\n");

  const LINEA =
    "- espaciado-del-sistema: desy-implement-layout-patterns → «Grid responsivo del formulario» — " +
    "el skill dice «`gap-x-4`»; el Check exige `gap-x-base`";

  it("lee el Check, el skill que contradice, su sección y el texto copiado", () => {
    const contradicciones = contradiccionesDeRubric(
      rubric(`## ${EPIGRAFE_CONTRADICCIONES}`, [LINEA]),
    );

    expect([...contradicciones]).toEqual([
      [
        "espaciado-del-sistema",
        {
          skill: "desy-implement-layout-patterns",
          seccion: "Grid responsivo del formulario",
          texto: "el skill dice «`gap-x-4`»; el Check exige `gap-x-base`",
        },
      ],
    ]);
  });

  it("sólo cuenta las líneas de su epígrafe, no una ancla ni otra prosa con flechas", () => {
    const conAncla = contradiccionesDeRubric(
      rubric("## Anclaje en desy-skills", [
        `- espaciado-del-sistema: desy-styles-reference → «Espaciado (escala de tokens del proyecto)»`,
      ]),
    );
    expect(conAncla.size).toBe(0);

    // Y el epígrafe de contradicciones no se lee como ancla ni al revés: los dos
    // comparten la forma `- id: skill → «sección»`, y el sentido lo dice el epígrafe.
    const anclas = anclajesDeRubric(rubric(`## ${EPIGRAFE_CONTRADICCIONES}`, [LINEA]));
    expect(anclas.size).toBe(0);
  });

  it("una línea sin el texto que contradice no es un hallazgo: falta el qué", () => {
    const contradicciones = contradiccionesDeRubric(
      rubric(`## ${EPIGRAFE_CONTRADICCIONES}`, [
        "- espaciado-del-sistema: desy-implement-layout-patterns → «Grid responsivo del formulario»",
      ]),
    );

    expect(contradicciones.size).toBe(0);
  });

  it("no confunde la línea de contradicción de `rubric.md` con un ancla", () => {
    // Las dos formas empiezan igual (`- <id>: <skill> → «<sección>»`), y el test
    // de «no se lee como ancla» va con la línea **completa**, la que el Caso real
    // escribe: un control con una línea truncada no probaría nada.
    const anclas = anclajesDeRubric(
      rubric("## Anclaje en desy-skills", [
        "- espaciado-del-sistema: desy-styles-reference → «Espaciado (escala de tokens del proyecto)»",
        "- espaciado-del-sistema: desy-implement-layout-patterns → «Grid responsivo del formulario» — el skill dice «`gap-x-4`»; el Check exige `gap-x-base`",
      ]),
    );

    // La contradicción vive en OTRO epígrafe; dentro del de anclas, una línea con
    // texto tras la sección no es un ancla (el `→ «…»` tiene que cerrar la línea).
    expect(anclas.size).toBe(1);
    expect(anclas.get("espaciado-del-sistema")).toEqual({
      skill: "desy-styles-reference",
      seccion: "Espaciado (escala de tokens del proyecto)",
    });
  });
});

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

  it("parsea estructura_grid y exige columnas (entero ≥ 2)", () => {
    const checks = parseChecks(
      JSON.stringify({
        checks: [
          {
            id: "estructura-grid",
            severity: "guard",
            weight: 0,
            assert: { kind: "estructura_grid", columnas: 4 },
          },
        ],
      }),
    );
    expect(checks[0]!.assert).toEqual({ kind: "estructura_grid", columnas: 4 });

    expect(() =>
      parseChecks(
        JSON.stringify({
          checks: [{ id: "x", severity: "guard", weight: 0, assert: { kind: "estructura_grid" } }],
        }),
      ),
    ).toThrow(/columnas/i);
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
