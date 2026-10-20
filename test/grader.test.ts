import { describe, expect, it } from "vitest";
import type { Artefactos, Transcript, TipoCaso } from "../src/grader.js";
import { frameworkDeChecks, grado, type Check } from "../src/grader.js";

const artefactos = (files: Record<string, string>): Artefactos => ({ files });
const transcript = (...invocaciones: string[]): Transcript => ({ invocaciones });

const checkGuard = (over: Partial<Check> = {}): Check => ({
  id: "un-guard",
  severity: "guard",
  weight: 0,
  assert: { kind: "macro_presente", macro: "componentBoton" },
  ...over,
});

const checkQuality = (id: string, weight: number, macro: string): Check => ({
  id,
  severity: "quality",
  weight,
  assert: { kind: "macro_presente", macro },
});

const htmlValidoPagina = (extra = ""): string =>
  [
    "<!doctype html><html><body>",
    '<a class="skip-link" href="#main">Saltar al contenido</a>',
    '<main id="main"><h1>Título</h1>',
    extra,
    "</main></body></html>",
  ].join("");

describe("Grade", () => {
  it("cualquier Guard que falle fuerza INACEPTABLE", () => {
    const resultado = grado(
      {
        artefactos: artefactos({ "index.html": htmlValidoPagina("<div></div>") }),
        transcript: transcript(),
      },
      { tipo: "componente", checks: [checkGuard()] },
    );

    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("un Guard que pasa no hunde el Grade", () => {
    const resultado = grado(
      {
        artefactos: artefactos({
          "index.html": htmlValidoPagina("<componentBoton></componentBoton>"),
        }),
        transcript: transcript(),
      },
      { tipo: "componente", checks: [checkGuard()] },
    );

    expect(resultado.grade).not.toBe("INACEPTABLE");
  });
});

describe("detalle por Check", () => {
  it("emite un DetalleCheck por cada Check con id, severidad y pasado/fallado", () => {
    const checks: Check[] = [
      checkGuard({ id: "guard-uno" }),
      checkQuality("quality-uno", 1, "componentAviso"),
    ];
    const resultado = grado(
      {
        artefactos: artefactos({
          "index.html": htmlValidoPagina("<componentBoton><componentAviso>"),
        }),
        transcript: transcript(),
      },
      { tipo: "componente", checks },
    );

    expect(resultado.detalle).toEqual([
      { id: "guard-uno", severity: "guard", passed: true },
      { id: "quality-uno", severity: "quality", passed: true },
    ]);
  });

  it("marca como fallado el Check cuya aserción no se cumple", () => {
    const resultado = grado(
      {
        artefactos: artefactos({ "index.html": htmlValidoPagina() }),
        transcript: transcript(),
      },
      { tipo: "componente", checks: [checkQuality("q1", 1, "componentAviso")] },
    );

    expect(resultado.detalle).toContainEqual({
      id: "q1",
      severity: "quality",
      passed: false,
    });
  });
});

describe("Framework de checks", () => {
  it("el Framework de Caso-página incluye h1 único, skip-link y fieldset+legend", () => {
    const ids = frameworkDeChecks("pagina").map((c) => c.id);
    expect(ids).toContain("un-solo-h1");
    expect(ids).toContain("skip-link");
    expect(ids).toContain("fieldset-con-legend");
  });

  it("el Framework de Caso-componente no exige skip-link ni un solo h1", () => {
    const ids = frameworkDeChecks("componente").map((c) => c.id);
    expect(ids).not.toContain("skip-link");
    expect(ids).not.toContain("un-solo-h1");
  });

  it("todos los checks del Framework son Guards", () => {
    for (const tipo of ["componente", "pagina"] as const) {
      const severities = frameworkDeChecks(tipo).map((c) => c.severity);
      expect(severities.every((s) => s === "guard")).toBe(true);
    }
  });
});

describe("combinación Framework + checks propios del Caso", () => {
  it("un Guard del Framework del tipo hunde el Grade aunque el check propio pase", () => {
    const resultado = grado(
      {
        artefactos: artefactos({
          "index.html": "<main><h1>Uno</h1><h1>Dos</h1></main>",
        }),
        transcript: transcript(),
      },
      { tipo: "pagina", checks: [checkGuard()] },
    );

    expect(resultado.grade).toBe("INACEPTABLE");
    const ids = resultado.detalle.map((d) => d.id);
    expect(ids).toContain("un-solo-h1");
    expect(ids).toContain("un-guard");
  });

  it("los checks propios del Caso se combinan con el Framework del tipo", () => {
    const resultado = grado(
      {
        artefactos: artefactos({ "index.html": htmlValidoPagina() }),
        transcript: transcript(),
      },
      { tipo: "pagina", checks: [checkQuality("propio", 1, "componentFalta")] },
    );

    const ids = resultado.detalle.map((d) => d.id);
    expect(ids).toContain("propio");
    expect(ids).toContain("skip-link");
  });
});

describe("Guards estructurales de página", () => {
  const conPagina = (html: string) =>
    grado(
      { artefactos: artefactos({ "index.html": html }), transcript: transcript() },
      { tipo: "pagina", checks: [] },
    );

  it("un solo h1 pasa", () => {
    const resultado = conPagina(htmlValidoPagina());
    expect(resultado.detalle.find((d) => d.id === "un-solo-h1")?.passed).toBe(true);
  });

  it("dos h1 fallan", () => {
    const resultado = conPagina("<h1>Uno</h1><h1>Dos</h1>");
    expect(resultado.detalle.find((d) => d.id === "un-solo-h1")?.passed).toBe(false);
  });

  it("sin skip-link falla el guard de skip-link", () => {
    const resultado = conPagina("<main><h1>Uno</h1></main>");
    expect(resultado.detalle.find((d) => d.id === "skip-link")?.passed).toBe(false);
  });

  it("un fieldset sin legend falla el guard de fieldset+legend", () => {
    const resultado = conPagina("<main><h1>Uno</h1><fieldset><input></fieldset></main>");
    expect(
      resultado.detalle.find((d) => d.id === "fieldset-con-legend")?.passed,
    ).toBe(false);
  });

  it("un fieldset con legend pasa el guard de fieldset+legend", () => {
    const resultado = conPagina(
      "<main><h1>Uno</h1><fieldset><legend>Datos</legend></fieldset></main>",
    );
    expect(
      resultado.detalle.find((d) => d.id === "fieldset-con-legend")?.passed,
    ).toBe(true);
  });
});

describe("Flujo observado vs Flujo canónico", () => {
  const checkFlujo = (): Check => ({
    id: "flujo-canonico",
    severity: "guard",
    weight: 0,
    assert: {
      kind: "flujo_canonico",
      pasos: ["preflight-check", "implement-component"],
    },
  });

  it("pasa cuando el Flujo observado contiene los pasos canónicos en orden", () => {
    const resultado = grado(
      {
        artefactos: artefactos({ "index.html": htmlValidoPagina() }),
        transcript: transcript("preflight-check", "implement-component"),
      },
      { tipo: "componente", checks: [checkFlujo()] },
    );

    expect(resultado.grade).not.toBe("INACEPTABLE");
  });

  it("falla cuando el Flujo observado se salta un paso obligatorio", () => {
    const resultado = grado(
      {
        artefactos: artefactos({ "index.html": htmlValidoPagina() }),
        transcript: transcript("implement-component"),
      },
      { tipo: "componente", checks: [checkFlujo()] },
    );

    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("falla cuando el orden de los pasos está invertido", () => {
    const resultado = grado(
      {
        artefactos: artefactos({ "index.html": htmlValidoPagina() }),
        transcript: transcript("implement-component", "preflight-check"),
      },
      { tipo: "componente", checks: [checkFlujo()] },
    );

    expect(resultado.grade).toBe("INACEPTABLE");
  });
});

describe("Quality", () => {
  const conTodoPresente = artefactos({
    "index.html": htmlValidoPagina(
      "<componentBoton><componentAviso><componentTabla>",
    ),
  });
  const soloUno = artefactos({
    "index.html": htmlValidoPagina("<componentBoton>"),
  });
  const sinNada = artefactos({ "index.html": htmlValidoPagina() });

  const tresQuality = [
    checkQuality("q1", 1, "componentBoton"),
    checkQuality("q2", 1, "componentAviso"),
    checkQuality("q3", 1, "componentTabla"),
  ];

  const gradear = (arts: Artefactos, checks: Check[]) =>
    grado(
      { artefactos: arts, transcript: transcript() },
      { tipo: "componente", checks },
    );

  it("todos los Quality presentes da EXCELENTE", () => {
    expect(gradear(conTodoPresente, tresQuality).grade).toBe("EXCELENTE");
  });

  it("dos tercios del peso da BUENO", () => {
    const dosPresentes = artefactos({
      "index.html": htmlValidoPagina("<componentBoton><componentAviso>"),
    });
    expect(gradear(dosPresentes, tresQuality).grade).toBe("BUENO");
  });

  it("un tercio del peso da ACEPTABLE", () => {
    expect(gradear(soloUno, tresQuality).grade).toBe("ACEPTABLE");
  });

  it("sin ningún Quality presente da ACEPTABLE (no INACEPTABLE)", () => {
    expect(gradear(sinNada, tresQuality).grade).toBe("ACEPTABLE");
  });

  it("el peso pesa: cubrir el check de peso alto da BUENO donde el peso bajo daría ACEPTABLE", () => {
    const conPesoAlto = [
      checkQuality("q1", 3, "componentBoton"),
      checkQuality("q2", 1, "componentAviso"),
    ];
    expect(gradear(soloUno, conPesoAlto).grade).toBe("BUENO");
  });
});

describe("tipos de Caso", () => {
  it("el TipoCaso se restringe a componente y pagina", () => {
    const tipos: TipoCaso[] = ["componente", "pagina"];
    expect(tipos).toEqual(["componente", "pagina"]);
  });
});
