import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import { grado, type Evidencia } from "../src/grader.js";
import { REPO_ROOT } from "../src/repo.js";

const CASO_DIR = join(
  CASOS_DIR,
  "implement-component",
  "componente",
  "boton-primario",
);

const evidencia = (html: string, invocaciones: string[] = []): Evidencia => ({
  artefactos: { files: { "index.html": html } },
  transcript: { invocaciones },
});

describe("Caso boton-primario (Slice 1)", () => {
  it("el Caso existe en disco con su input/, expected/ y rubric.md", () => {
    expect(existsSync(join(CASO_DIR, "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(CASO_DIR, "expected", "checks.json"))).toBe(true);
    expect(existsSync(join(CASO_DIR, "rubric.md"))).toBe(true);
  });

  it("el prompt pide un botón primario estándar con el texto 'Enviar'", () => {
    const caso = cargarCaso(CASO_DIR);
    expect(caso.prompt).toMatch(/bot[oó]n/i);
    expect(caso.prompt).toMatch(/primari[oa]/i);
    expect(caso.prompt).toMatch(/Enviar/);
  });

  it("se carga como Caso-componente del skill implement-component", () => {
    const caso = cargarCaso(CASO_DIR);
    expect(caso.tipo).toBe("caso-componente");
    expect(caso.skill).toBe("implement-component");
    expect(caso.id).toBe("boton-primario");
  });

  it("declara los guards de macro, variante primaria y props no inventadas", () => {
    const caso = cargarCaso(CASO_DIR);
    const guards = caso.checks.filter((c) => c.severity === "guard");
    const kinds = guards.map((c) => c.assert.kind);
    expect(kinds).toContain("macro_presente");
    expect(kinds).toContain("macro_con_clase");
    expect(kinds).toContain("sin_props_inventados");

    const variante = guards.find((c) => c.assert.kind === "macro_con_clase")!;
    expect(variante.assert).toMatchObject({ macro: "componentButton", clase: "c-button--primary" });
  });

  it("declara como Quality el uso de la utility de tamaño correcta (base: sin clase)", () => {
    const caso = cargarCaso(CASO_DIR);
    const quality = caso.checks.filter((c) => c.severity === "quality");
    expect(quality.length).toBeGreaterThan(0);
  });

  it("un botón primario correcto (sin tamaño especial) NO es INACEPTABLE y llega a EXCELENTE", () => {
    const caso = cargarCaso(CASO_DIR);
    const resultado = grado(
      evidencia(
        '{{ componentButton({ "text": "Enviar", "classes": "c-button--primary" }) }}',
      ),
      { tipo: caso.tipo, checks: caso.checks },
    );
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("un botón con la variante equivocada es INACEPTABLE (falla el guard de variante)", () => {
    const caso = cargarCaso(CASO_DIR);
    const resultado = grado(
      evidencia(
        '{{ componentButton({ "text": "Enviar", "classes": "c-button--secondary" }) }}',
      ),
      { tipo: caso.tipo, checks: caso.checks },
    );
    expect(resultado.grade).toBe("INACEPTABLE");
    const ids = resultado.detalle.filter((d) => !d.passed).map((d) => d.id);
    expect(ids.length).toBeGreaterThan(0);
  });

  it("un botón con una prop inventada es INACEPTABLE", () => {
    const caso = cargarCaso(CASO_DIR);
    const resultado = grado(
      evidencia(
        '{{ componentButton({ "text": "Enviar", "classes": "c-button--primary", "variante": "primary" }) }}',
      ),
      { tipo: caso.tipo, checks: caso.checks },
    );
    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("un botón con tamaño sm pierde el Quality de tamaño (pero no es INACEPTABLE)", () => {
    const caso = cargarCaso(CASO_DIR);
    const resultado = grado(
      evidencia(
        '{{ componentButton({ "text": "Enviar", "classes": "c-button--primary c-button--sm" }) }}',
      ),
      { tipo: caso.tipo, checks: caso.checks },
    );
    expect(resultado.grade).toBe("ACEPTABLE");
  });

  it("el Grade es estable entre Ejecuciones repetidas con la misma Evidencia", () => {
    const caso = cargarCaso(CASO_DIR);
    const art =
      '{{ componentButton({ "text": "Enviar", "classes": "c-button--primary" }) }}';
    const grados = new Set(
      Array.from({ length: 5 }, () =>
        grado(evidencia(art), { tipo: caso.tipo, checks: caso.checks }).grade,
      ),
    );
    expect(grados.size).toBe(1);
  });
});
