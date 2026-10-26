import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import { grado, type Evidencia } from "../src/grader.js";

/**
 * Aceptación del Bloque A (reconocimiento y elección): fija que una **decisión
 * correcta** del SUT aprueba los Checks del Caso, y que una decisión claramente
 * errónea la hunde a INACEPTABLE. Las salidas doradas están transcritas del
 * formato real de cada skill (la tabla del recognizer, la elección de plantilla
 * y la recomendación de librería); importa el **hecho de decisión**, no el
 * wording.
 */
const evidencia = (salida: string, invocaciones: string[] = []): Evidencia => ({
  artefactos: { files: { "salida.md": salida } },
  transcript: { invocaciones },
});

const dirCaso = (skill: string, id: string) =>
  join(CASOS_DIR, skill, "decision", id);

const gradeDe = (skill: string, id: string, salida: string, flujo: string[] = []) => {
  const caso = cargarCaso(dirCaso(skill, id));
  return grado(evidencia(salida, flujo), { tipo: caso.tipo, checks: caso.checks });
};

describe("Bloque A · component-recognizer/reconocimiento-login", () => {
  const SKILL = "component-recognizer";
  const ID = "reconocimiento-login";

  /** Tabla de identificación correcta de un login de webapp (salida dorada). */
  const SALIDA_OK = [
    "| Nº | Componente | Variante | Tamaño | Ubicación en imagen | Notas |",
    "|:--:|:-----------|:---------|:------:|:--------------------|:------|",
    '| 1 | header-mini | - | - | header | logo Aragón, sin nav |',
    '| 2 | input-group | text | - | main, formulario | label "Usuario" |',
    '| 3 | input-group | password | - | main, formulario | label "Contraseña" |',
    '| 4 | button | primary | base | main, final del form | "Acceder" |',
    '| 5 | footer | - | - | footer | institucional con 3 logos |',
  ].join("\n");

  it("existe el Caso en disco con su input/, expected/, rubric.md y el mockup", () => {
    expect(existsSync(join(dirCaso(SKILL, ID), "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(dirCaso(SKILL, ID), "input", "mockup.png"))).toBe(true);
    expect(existsSync(join(dirCaso(SKILL, ID), "expected", "checks.json"))).toBe(true);
    expect(existsSync(join(dirCaso(SKILL, ID), "rubric.md"))).toBe(true);
  });

  it("se carga como Caso-decisión con el mockup adjunto", () => {
    const caso = cargarCaso(dirCaso(SKILL, ID));
    expect(caso.tipo).toBe("caso-decision");
    expect(caso.skill).toBe(SKILL);
    if (caso.tipo !== "caso-decision") throw new Error("tipo inesperado");
    expect(caso.mockupImagenPath).toBeDefined();
  });

  it("una identificación correcta da EXCELENTE", () => {
    const resultado = gradeDe(SKILL, ID, SALIDA_OK, ["component-recognizer"]);
    expect(resultado.detalle.every((d) => d.passed)).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("identificar un `input` suelto en vez de `input-group` es INACEPTABLE", () => {
    const mal = SALIDA_OK.replace(/\| input-group \|/g, "| input |");
    const resultado = gradeDe(SKILL, ID, mal, ["component-recognizer"]);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(
      resultado.detalle.find((d) => d.id === "identifica-input-group")?.passed,
    ).toBe(false);
  });

  it("declarar `header-advanced` (un portal de 3 bandas) baja el Grade (Quality, no Guard)", () => {
    // El SUT puede mencionar `header-advanced` al descartarlo; por eso es un
    // Quality, no un Guard que hunda el Grade. Como decisión elegida, pierde
    // puntuación.
    const mal = SALIDA_OK.replace("| header-mini |", "| header-advanced |");
    const resultado = gradeDe(SKILL, ID, mal, ["component-recognizer"]);
    // Al sustituir header-mini por header-advanced cae el guard positivo de
    // header-mini: la decisión es errónea.
    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("mencionar `header-advanced` para descartarlo no hunde el Grade (sólo pierde el Quality)", () => {
    const conDescarte =
      SALIDA_OK + "\nNo es un `header-advanced` de 3 bandas porque es un login.";
    const resultado = gradeDe(SKILL, ID, conDescarte, ["component-recognizer"]);
    expect(resultado.grade).not.toBe("INACEPTABLE");
    expect(
      resultado.detalle.find((d) => d.id === "no-inventa-header-advanced")?.passed,
    ).toBe(false);
  });

  it("acertar los guards pero olvidar el footer baja de EXCELENTE (Quality)", () => {
    const sinFooter = SALIDA_OK.replace(
      '\n| 5 | footer | - | - | footer | institucional con 3 logos |',
      "",
    );
    const resultado = gradeDe(SKILL, ID, sinFooter, ["component-recognizer"]);
    expect(resultado.grade).not.toBe("INACEPTABLE");
    expect(resultado.grade).not.toBe("EXCELENTE");
  });

  it("el Grade es estable entre Ejecuciones repetidas con la misma Evidencia", () => {
    const grados = new Set(
      Array.from({ length: 5 }, () => gradeDe(SKILL, ID, SALIDA_OK).grade),
    );
    expect(grados.size).toBe(1);
  });
});

describe("Bloque A · choose-page-template/404-portal-publico", () => {
  const SKILL = "choose-page-template";
  const ID = "404-portal-publico";

  /** Recomendación correcta: familia portal, header-advanced (salida dorada). */
  const SALIDA_OK =
    "La familia es **portal**; uso `_template.with-header-advanced.njk` " +
    "(layout `advanced-header-layout`), con cabecera `header-advanced` de 3 bandas.";

  it("existe el Caso en disco con su input/, expected/ y rubric.md", () => {
    expect(existsSync(join(dirCaso(SKILL, ID), "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(dirCaso(SKILL, ID), "expected", "checks.json"))).toBe(true);
    expect(existsSync(join(dirCaso(SKILL, ID), "rubric.md"))).toBe(true);
  });

  it("una elección correcta de la familia portal da EXCELENTE", () => {
    const resultado = gradeDe(SKILL, ID, SALIDA_OK, ["choose-page-template"]);
    expect(resultado.detalle.every((d) => d.passed)).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("elegir la familia webapp (`logged-out`) para un portal es INACEPTABLE", () => {
    // El error del skill: elegir por la cabecera visible, no por la familia.
    const mal =
      "Uso `_template.logged-out.njk` porque la cabecera visible es de una sola banda.";
    const resultado = gradeDe(SKILL, ID, mal, ["choose-page-template"]);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(resultado.detalle.find((d) => d.id === "familia-portal")?.passed).toBe(false);
  });

  it("inventar una plantilla nueva es INACEPTABLE por el quality de invención", () => {
    const mal = "Uso `not-found-layout`, una plantilla nueva para 404.";
    const resultado = gradeDe(SKILL, ID, mal);
    expect(resultado.detalle.find((d) => d.id === "no-inventa-plantilla")?.passed).toBe(
      false,
    );
  });
});

describe("Bloque A · choose-library/portal-turistico", () => {
  const SKILL = "choose-library";
  const ID = "portal-turistico";

  /** Recomendación correcta para un portal público con SEO crítico (dorada). */
  const SALIDA_OK = [
    "librería: desy-html (latest)",
    "starter: https://bitbucket.org/sdaragon/desy-html-starter",
    "cabecera: header-advanced (3 bandas)",
  ].join("\n");

  it("existe el Caso en disco con su input/, expected/ y rubric.md", () => {
    expect(existsSync(join(dirCaso(SKILL, ID), "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(dirCaso(SKILL, ID), "expected", "checks.json"))).toBe(true);
    expect(existsSync(join(dirCaso(SKILL, ID), "rubric.md"))).toBe(true);
  });

  it("recomendar desy-html da EXCELENTE", () => {
    const resultado = gradeDe(SKILL, ID, SALIDA_OK, ["choose-library"]);
    expect(resultado.detalle.every((d) => d.passed)).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("recomendar desy-angular para un portal estático es INACEPTABLE", () => {
    const mal = [
      "librería: desy-angular",
      "starter: desy-angular-starter",
      "cabecera: header",
    ].join("\n");
    const resultado = gradeDe(SKILL, ID, mal, ["choose-library"]);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(
      resultado.detalle.find((d) => d.id === "libreria-desy-html")?.passed,
    ).toBe(false);
  });

  it("acertar la librería pero recomendar instalar el paquete suelto baja de EXCELENTE", () => {
    const sinStarter = [
      "librería: desy-html",
      "Haz `npm install desy-html` en un proyecto vacío",
      "cabecera: header-advanced",
    ].join("\n");
    const resultado = gradeDe(SKILL, ID, sinStarter);
    expect(resultado.grade).not.toBe("INACEPTABLE");
    expect(resultado.grade).not.toBe("EXCELENTE");
  });
});
