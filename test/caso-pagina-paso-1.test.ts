import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import { grado, type Evidencia } from "../src/grader.js";

const CASO_DIR = join(
  CASOS_DIR,
  "implement-pattern",
  "pagina",
  "patron-pagina-paso-1-nombre-nif",
);

/**
 * El Flujo canónico del glosario, tal como lo emite el runner (nombres sin
 * prefijo `desy-`). El Caso lo exige en orden: preflight → recognizer →
 * choose-page-template → implement-* → design-match → validate-accessibility.
 */
const FLUJO_OK = [
  "preflight-check",
  "component-recognizer",
  "choose-page-template",
  "implement-pattern",
  "design-match",
  "validate-accessibility",
];

const GOLD = readFileSync(join(CASO_DIR, "input", "gold.html"), "utf8");

/**
 * La Evidencia dorada del Caso: la página del Gold **tal cual**. Es lo que se
 * espera del SUT — reproducir el Gold, incluidas sus clases legadas (`mr-2`,
 * `pt-0.5`): el guard de tokens las exime por venir del Gold (ver
 * `utilidadesDelGold`). No hay que «corregirlas» a tokens para pasar.
 */
const GOLDEN = GOLD;

const evidencia = (html: string, invocaciones: string[] = []): Evidencia => ({
  artefactos: { files: { "paso-1-nombre-nif.html": html } },
  transcript: { invocaciones },
});

const gradeDe = (html: string, invocaciones: string[] = []) => {
  const caso = cargarCaso(CASO_DIR);
  return grado(evidencia(html, invocaciones), {
    tipo: caso.tipo,
    checks: caso.checks,
    gold: GOLD,
  });
};

describe("Caso-página patron-pagina-paso-1-nombre-nif (Slice 2)", () => {
  it("el Caso existe en disco con su input/, expected/, rubric.md y el Gold", () => {
    expect(existsSync(join(CASO_DIR, "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(CASO_DIR, "expected", "checks.json"))).toBe(true);
    expect(existsSync(join(CASO_DIR, "rubric.md"))).toBe(true);
    expect(existsSync(join(CASO_DIR, "input", "gold.html"))).toBe(true);
  });

  it("el Gold-HTML y su Captura de Gold están como fixtures del Caso", () => {
    const caso = cargarCaso(CASO_DIR);
    if (caso.tipo !== "caso-pagina") throw new Error("tipo inesperado");
    expect(existsSync(caso.goldPath)).toBe(true);
    expect(existsSync(caso.goldImagenPath)).toBe(true);
    expect(existsSync(join(CASO_DIR, "input", "gold.captura.json"))).toBe(true);
  });

  it("se carga como Caso-página del skill implement-pattern", () => {
    const caso = cargarCaso(CASO_DIR);
    expect(caso.tipo).toBe("caso-pagina");
    expect(caso.skill).toBe("implement-pattern");
    expect(caso.id).toBe("patron-pagina-paso-1-nombre-nif");
  });

  it("declara el guard del encadenado con el Flujo canónico del glosario", () => {
    const caso = cargarCaso(CASO_DIR);
    const encadenado = caso.checks.find((c) => c.assert.kind === "flujo_canonico");
    expect(encadenado).toBeDefined();
    expect(encadenado!.severity).toBe("guard");
    const pasos = (encadenado!.assert as { pasos: string[] }).pasos;
    expect(pasos).toContain("preflight-check");
    expect(pasos).toContain("choose-page-template");
    expect(pasos).toContain("implement-*");
    expect(pasos).toContain("design-match");
    expect(pasos).toContain("validate-accessibility");
  });

  it("el prompt pide reproducir la página de la referencia visual", () => {
    const caso = cargarCaso(CASO_DIR);
    expect(caso.prompt).toMatch(/referencia visual|captura/i);
    expect(caso.prompt).toMatch(/DESY/);
  });

  it("la página del Gold reproducida con el Flujo canónico da EXCELENTE", () => {
    const resultado = gradeDe(GOLDEN, FLUJO_OK);
    expect(resultado.grade).toBe("EXCELENTE");
    expect(resultado.detalle.every((d) => d.passed)).toBe(true);
  });

  it("los guards de a11y y de fidelidad estructural van en el detalle del Grade", () => {
    const resultado = gradeDe(GOLDEN, FLUJO_OK);
    const ids = resultado.detalle.map((d) => d.id);
    expect(ids).toContain("un-solo-h1");
    expect(ids).toContain("skip-link");
    expect(ids).toContain("fieldset-con-legend");
    expect(ids).toContain("labels-visibles");
    expect(ids).toContain("fidelidad-container");
    expect(ids).toContain("fidelidad-escala-h1");
    expect(ids).toContain("fidelidad-gap");
  });

  it("saltarse un paso obligatorio del encadenado es INACEPTABLE (sin design-match)", () => {
    const sinDesignMatch = FLUJO_OK.filter((p) => p !== "design-match");
    const resultado = gradeDe(GOLDEN, sinDesignMatch);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(
      resultado.detalle.find((d) => d.id === "encadenado-canonico")?.passed,
    ).toBe(false);
  });

  it("una página con el container equivocado es INACEPTABLE (fidelidad estructural)", () => {
    const sinContainer = GOLD.replace(
      'class="relative container mx-auto px-base"',
      'class="relative w-full px-base"',
    );
    const resultado = gradeDe(sinContainer, FLUJO_OK);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(resultado.detalle.find((d) => d.id === "fidelidad-container")?.passed).toBe(
      false,
    );
  });

  it("una página con la escala tipográfica equivocada es INACEPTABLE", () => {
    const sinEscala = GOLD.replace('class="c-h1 w-full"', 'class="text-3xl w-full"');
    const resultado = gradeDe(sinEscala, FLUJO_OK);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(
      resultado.detalle.find((d) => d.id === "fidelidad-escala-h1")?.passed,
    ).toBe(false);
  });

  it("una página con el gap de la rejilla equivocado es INACEPTABLE", () => {
    const sinGap = GOLD.replace("grid grid-cols-2 lg:grid-cols-4 gap-lg", "grid gap-base");
    const resultado = gradeDe(sinGap, FLUJO_OK);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(resultado.detalle.find((d) => d.id === "fidelidad-gap")?.passed).toBe(false);
  });

  it("el guard de gap mira la rejilla, no un `gap-lg` suelto en otro div", () => {
    // Si el guard buscara la clase «en cualquier parte», un `gap-lg` de adorno
    // colaría con la rejilla mal. Se exige en el mismo elemento (la rejilla).
    const rejillaMalDecorada = GOLD.replace(
      "grid grid-cols-2 lg:grid-cols-4 gap-lg",
      "grid gap-base",
    ).replace(
      '<div class="my-base">',
      '<div class="my-base gap-lg">',
    );
    const resultado = gradeDe(rejillaMalDecorada, FLUJO_OK);
    expect(resultado.detalle.find((d) => d.id === "fidelidad-gap")?.passed).toBe(false);
  });

  it("una página correcta pero sin los campos del Gold baja de EXCELENTE (Quality)", () => {
    const sinNif = GOLDEN.replace("NIF o NIE (Obligatorio)", "Otro dato (Obligatorio)");
    const resultado = gradeDe(sinNif, FLUJO_OK);
    expect(resultado.grade).not.toBe("INACEPTABLE");
    expect(resultado.grade).not.toBe("EXCELENTE");
    expect(resultado.detalle.find((d) => d.id === "campo-nif")?.passed).toBe(false);
  });

  it("el gap real del SUT (`gap-x-base` en vez de `gap-lg`) falla el guard de fidelidad", () => {
    // Patrón observado en la Ejecución real del Caso (ticket 08): el SUT escribió
    // `grid lg:grid-cols-4 gap-x-base` en vez del grid del Gold.
    const gapDelSut = GOLD.replace(
      "grid grid-cols-2 lg:grid-cols-4 gap-lg",
      "grid lg:grid-cols-4 gap-x-base",
    );
    const resultado = gradeDe(gapDelSut, FLUJO_OK);
    expect(resultado.detalle.find((d) => d.id === "fidelidad-gap")?.passed).toBe(false);
  });

  it("el guard de tokens exime las utilidades que usa el Gold (es fidelidad, no invención)", () => {
    // El Gold oficial usa `mr-2` y `pt-0.5`; un SUT que lo reproduce las hereda.
    const resultado = gradeDe(GOLD, FLUJO_OK);
    expect(resultado.detalle.find((d) => d.id === "tokens-del-sistema")?.passed).toBe(true);
  });

  it("un valor inventado que el Gold NO usa sigue suspendiendo el guard de tokens", () => {
    const inventado = GOLD.replace('<div class="my-base">', '<div class="my-base p-4">');
    const resultado = gradeDe(inventado, FLUJO_OK);
    expect(resultado.detalle.find((d) => d.id === "tokens-del-sistema")?.passed).toBe(false);
  });

  it("el Grade es estable entre Ejecuciones repetidas con la misma Evidencia", () => {
    const grados = new Set(
      Array.from({ length: 5 }, () => gradeDe(GOLDEN, FLUJO_OK).grade),
    );
    expect(grados.size).toBe(1);
  });
});
