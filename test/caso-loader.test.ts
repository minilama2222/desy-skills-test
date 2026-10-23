import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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
    '<main id="main"><h1>Título</h1>',
    extra,
    "</main></body></html>",
  ].join("");

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

  it("rechaza una carpeta de tipo desconocido con un error claro", () => {
    root = mkdtempSync(join(tmpdir(), "casos-"));
    mkdirSync(join(root, "implement-component", "otro", "x", "input"), { recursive: true });

    expect(() => cargarCaso(join(root!, "implement-component", "otro", "x"))).toThrow(
      /componente|pagina/i,
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
      goldHtml: "<html><body><h1>Gold</h1></body></html>",
    });

    const caso = cargarCaso(dir);
    const resultado = grado(
      {
        artefactos: { files: { "index.html": htmlValidoPagina("<componentButton>") } },
        transcript: transcript(),
      },
      { tipo: caso.tipo, checks: caso.checks },
    );

    const ids = resultado.detalle.map((d) => d.id);
    expect(ids).toContain("usa-macro");
    expect(ids).toContain("skip-link");
    expect(ids).toContain("tokens-del-sistema");
    expect(resultado.grade).not.toBe("INACEPTABLE");
  });
});
