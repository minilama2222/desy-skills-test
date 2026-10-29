import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  cargarCaso,
  cargarCasos,
  type CasoEnDisco,
} from "../src/caso-loader.js";
import { grado } from "../src/grader.js";

const transcript = () => ({ invocaciones: [] });
const htmlValidoPagina = (extra = ""): string =>
  [
    "<!doctype html><html><body>",
    '<a class="skip-link" href="#main">Saltar al contenido</a>',
    '<main id="main" class="container mx-auto"><h1 class="c-h1">Título</h1>',
    '<div class="grid-cols-2 gap-lg">',
    extra,
    "</div></main></body></html>",
  ].join("");

/** El Gold-HTML que el Caso-página del test carga en su input/. */
const GOLD_DEL_TEST = [
  '<main class="container mx-auto">',
  '<h1 class="c-h1">Gold</h1>',
  '<div class="grid-cols-2 gap-lg"></div>',
  "</main>",
].join("");

/** El Gold-HTML de un Caso en disco, que el grader espera como texto. */
function leerGold(caso: ReturnType<typeof cargarCaso>): string | undefined {
  return caso.tipo === "caso-pagina" ? readFileSync(caso.goldPath, "utf8") : undefined;
}

function crearCaso(
  root: string,
  skill: string,
  tipo: string,
  id: string,
  overrides: {
    prompt?: string;
    checks?: unknown;
    rubric?: string;
    goldHtml?: string;
    omitirPrompt?: boolean;
    omitirChecks?: boolean;
    omitirRubric?: boolean;
  } = {},
): string {
  const dir = join(root, skill, tipo, id);
  mkdirSync(join(dir, "input"), { recursive: true });
  mkdirSync(join(dir, "expected"), { recursive: true });

  if (!overrides.omitirPrompt) {
    writeFileSync(
      join(dir, "input", "prompt.md"),
      overrides.prompt ?? "Genera un botón primario",
    );
  }
  if (!overrides.omitirRubric) {
    writeFileSync(join(dir, "rubric.md"), overrides.rubric ?? "# Rúbrica\n");
  }
  if (!overrides.omitirChecks) {
    writeFileSync(
      join(dir, "expected", "checks.json"),
      JSON.stringify(overrides.checks ?? { checks: [] }),
    );
  }
  if (overrides.goldHtml !== undefined) {
    writeFileSync(join(dir, "input", "gold.html"), overrides.goldHtml);
  }
  return dir;
}

describe("cargarCaso", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
  });

  it("carga un Caso-componente desde su carpeta con input/, expected/ y rubric.md", () => {
    root = mkdtempSync(join(tmpdir(), "casos-"));
    const checks = {
      checks: [
        {
          id: "usa-macro",
          severity: "guard",
          weight: 0,
          assert: { kind: "macro_presente", macro: "componentButton" },
        },
      ],
    };
    const dir = crearCaso(root, "implement-component", "componente", "boton-primario", {
      prompt: "Genera un botón primario con texto 'Enviar'",
      checks,
    });

    const caso = cargarCaso(dir);

    expect(caso.tipo).toBe("caso-componente");
    expect(caso.skill).toBe("implement-component");
    expect(caso.id).toBe("boton-primario");
    expect(caso.prompt).toBe("Genera un botón primario con texto 'Enviar'");
    expect(caso.checks).toHaveLength(1);
    expect(caso.checks[0]!.assert).toEqual({
      kind: "macro_presente",
      macro: "componentButton",
    });
  });

  it("carga un Caso-página y resuelve el Gold-HTML del input/", () => {
    root = mkdtempSync(join(tmpdir(), "casos-"));
    const dir = crearCaso(root, "implement-pattern", "pagina", "paso-1", {
      goldHtml: "<html><body><h1>Gold</h1></body></html>",
    });

    const caso = cargarCaso(dir);

    if (caso.tipo !== "caso-pagina") throw new Error("tipo inesperado");
    expect(caso.goldPath).toBe(join(dir, "input", "gold.html"));
  });

  it("un Caso-página expone la Captura de Gold como fixture del input/", () => {
    root = mkdtempSync(join(tmpdir(), "casos-"));
    const dir = crearCaso(root, "implement-pattern", "pagina", "paso-1", {
      goldHtml: "<html><body><h1>Gold</h1></body></html>",
    });
    writeFileSync(join(dir, "input", "gold.png"), "PNG-FALSO");

    const caso = cargarCaso(dir);

    if (caso.tipo !== "caso-pagina") throw new Error("tipo inesperado");
    expect(caso.goldImagenPath).toBe(join(dir, "input", "gold.png"));
  });

  it("carga un Caso-decisión sin Gold ni HTML (su salida es texto)", () => {
    root = mkdtempSync(join(tmpdir(), "casos-"));
    const checks = {
      checks: [
        {
          id: "libreria-correcta",
          severity: "guard",
          weight: 0,
          assert: { kind: "declara_decision", valor: "desy-html" },
        },
      ],
    };
    const dir = crearCaso(root, "choose-library", "decision", "portal-turistico", {
      prompt: "¿Qué librería uso para un portal público con SEO crítico?",
      checks,
    });

    const caso = cargarCaso(dir);

    expect(caso.tipo).toBe("caso-decision");
    expect(caso.skill).toBe("choose-library");
    expect(caso.checks[0]!.assert).toEqual({
      kind: "declara_decision",
      valor: "desy-html",
    });
  });

  it("propaga un error claro si falta rubric.md", () => {
    root = mkdtempSync(join(tmpdir(), "casos-"));
    const dir = crearCaso(root, "implement-component", "componente", "sin-rubric", {
      omitirRubric: true,
    });

    expect(() => cargarCaso(dir)).toThrow(/rubric\.md/i);
  });

  it("propaga un error claro si falta el prompt", () => {
    root = mkdtempSync(join(tmpdir(), "casos-"));
    const dir = crearCaso(root, "implement-component", "componente", "sin-prompt", {
      omitirPrompt: true,
    });

    expect(() => cargarCaso(dir)).toThrow(/prompt/i);
  });

  it("propaga el error claro cuando el checks.json está malformado", () => {
    root = mkdtempSync(join(tmpdir(), "casos-"));
    const dir = crearCaso(root, "implement-component", "componente", "checks-malos");
    writeFileSync(join(dir, "expected", "checks.json"), "{ no es json");

    expect(() => cargarCaso(dir)).toThrow(/checks\.json/i);
  });

  it("da un error claro cuando el checks.json es JSON válido pero estructuralmente inválido", () => {
    root = mkdtempSync(join(tmpdir(), "casos-"));
    const dir = crearCaso(root, "implement-component", "componente", "checks-estructural", {
      checks: { items: [] },
    });

    expect(() => cargarCaso(dir)).toThrow(/checks\.json/i);
    expect(() => cargarCaso(dir)).toThrow(/checks/i);
  });

  it("exige el checks.json del Caso", () => {
    root = mkdtempSync(join(tmpdir(), "casos-"));
    const dir = crearCaso(root, "implement-component", "componente", "sin-checks", {
      omitirChecks: true,
    });

    expect(() => cargarCaso(dir)).toThrow(/checks\.json/i);
  });

  it("pega a cada Check la sección del skill que su rubric.md ancla (ticket 06)", () => {
    root = mkdtempSync(join(tmpdir(), "casos-"));
    const checks = {
      checks: [
        {
          id: "variante-primaria",
          severity: "guard",
          weight: 0,
          assert: { kind: "macro_con_clase", macro: "componentButton", clase: "c-button--primary" },
        },
        {
          id: "tamano-base",
          severity: "quality",
          weight: 2,
          assert: { kind: "macro_sin_clase", macro: "componentButton", clase: "c-button--sm" },
        },
      ],
    };
    const rubric = [
      "# Rúbrica",
      "",
      "## Anclaje en `desy-skills`",
      "",
      '- variante-primaria: desy-styles-reference → «Componentes con `c-*` (bloques UI completos)»',
      "",
      "## Otra cosa",
      "- tamano-base: desy-implement-component → «Fuera del epígrafe»",
    ].join("\n");
    const dir = crearCaso(root, "implement-component", "componente", "boton", { checks, rubric });

    const caso = cargarCaso(dir);

    // El ancla del Check que la rubric nombra, por su título exacto.
    expect(caso.checks[0]!.ancla).toEqual({
      skill: "desy-styles-reference",
      seccion: "Componentes con `c-*` (bloques UI completos)",
    });
    // Un Check sin ancla no la inventa: el informe dirá que no declara sección.
    expect(caso.checks[1]!.ancla).toBeUndefined();
  });

  it("rechaza una carpeta de tipo desconocido con un error claro", () => {
    root = mkdtempSync(join(tmpdir(), "casos-"));
    mkdirSync(join(root, "implement-component", "otro", "x", "input"), { recursive: true });

    expect(() => cargarCaso(join(root!, "implement-component", "otro", "x"))).toThrow(
      /componente|pagina|decision/i,
    );
  });
});

describe("cargarCasos", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root) rmSync(root, { recursive: true, force: true });
    root = undefined;
  });

  it("descubre todos los Casos bajo el árbol de casos", () => {
    root = mkdtempSync(join(tmpdir(), "casos-"));
    crearCaso(root, "implement-component", "componente", "boton-primario");
    crearCaso(root, "implement-pattern", "pagina", "paso-1", {
      goldHtml: "<html><body><h1>Gold</h1></body></html>",
    });

    const casos: CasoEnDisco[] = cargarCasos(root);

    expect(casos.map((c) => `${c.skill}/${c.id}`).sort()).toEqual([
      "implement-component/boton-primario",
      "implement-pattern/paso-1",
    ]);
  });

  it("devuelve una lista vacía si el directorio de casos no existe", () => {
    root = join(tmpdir(), `casos-inexistente-${Date.now()}`);
    expect(cargarCasos(root)).toEqual([]);
  });

  it("un Caso cargado se combina con el Framework de su tipo en el grader", () => {
    root = mkdtempSync(join(tmpdir(), "casos-"));
    const checks = {
      checks: [
        {
          id: "usa-macro",
          severity: "guard",
          weight: 0,
          assert: { kind: "macro_presente", macro: "componentButton" },
        },
      ],
    };
    const dir = crearCaso(root, "implement-pattern", "pagina", "paso-1", {
      checks,
      goldHtml: GOLD_DEL_TEST,
    });

    const caso = cargarCaso(dir);
    const resultado = grado(
      {
        artefactos: { files: { "index.html": htmlValidoPagina("<componentButton>") } },
        transcript: transcript(),
      },
      { tipo: caso.tipo, checks: caso.checks, gold: leerGold(caso) },
    );

    const ids = resultado.detalle.map((d) => d.id);
    expect(ids).toContain("usa-macro");
    expect(ids).toContain("skip-link");
    expect(ids).toContain("tokens-del-sistema");
    expect(resultado.grade).not.toBe("INACEPTABLE");
  });
});
