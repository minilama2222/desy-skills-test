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

describe("Bloque A · component-recognizer/reconocimiento-perfil", () => {
  const SKILL = "component-recognizer";
  const ID = "reconocimiento-perfil";

  /** Tabla de identificación correcta del perfil de usuario/a (salida dorada). */
  const SALIDA_OK = [
    "| Nº | Componente | Variante | Tamaño | Ubicación en imagen | Notas |",
    "|:--:|:-----------|:---------|:------:|:--------------------|:------|",
    '| 1 | header | - | - | cabecera | logo, nombre de app y navegación |',
    '| 2 | input | text | - | main, formulario | nombre, NIF, correo y teléfono |',
    '| 3 | select | por defecto | - | main, dirección | tipo de vía, provincia y municipio |',
    '| 4 | button | primario | base | main, acciones | "Guardar" |',
    '| 5 | button | transparente | base | main, acciones | "Volver" y "Cancelar" |',
    '| 6 | footer | - | - | pie | enlaces y logos institucionales |',
  ].join("\n");

  it("existe el Caso en disco con su input/, expected/, rubric.md y el mockup", () => {
    expect(existsSync(join(dirCaso(SKILL, ID), "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(dirCaso(SKILL, ID), "input", "mockup.html"))).toBe(true);
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

  it("acepta la variante escrita en español (`primario`) como el linter", () => {
    // El catálogo documenta `primario`; la tabla de ejemplo usa la misma
    // etiqueta. La validación contra el catálogo traduce español↔inglés, así
    // que `primary` y `primario` son el mismo hecho.
    const enIngles = SALIDA_OK.replace("| button | primario |", "| button | primary |");
    const resultado = gradeDe(SKILL, ID, enIngles, ["component-recognizer"]);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("acertar el componente con una variante de vocabulario propio NO suspende (la variante es Quality)", () => {
    // El hecho no-negociable es el COMPONENTE. Un SUT que identifica bien el
    // botón pero usa una etiqueta de variante que no está en el catálogo (el
    // catálogo es de ejemplos representativos, no exhaustivos) pierde el Quality
    // de variante, pero no se suspende.
    const conVocabularioPropio = SALIDA_OK.replace(
      "| button | primario |",
      "| button | destacado |",
    );
    const resultado = gradeDe(SKILL, ID, conVocabularioPropio, ["component-recognizer"]);
    expect(resultado.detalle.find((d) => d.id === "reconoce-accion-button")?.passed).toBe(
      true,
    );
    expect(resultado.detalle.find((d) => d.id === "reconoce-accion-primaria")?.passed).toBe(
      false,
    );
    expect(resultado.grade).not.toBe("INACEPTABLE");
    expect(resultado.grade).not.toBe("EXCELENTE");
  });

  it("no identificar el `button` de la acción sí suspende (el componente es el Guard)", () => {
    const sinBoton = SALIDA_OK.split("\n")
      .filter((linea) => !linea.includes("| button |"))
      .join("\n");
    const resultado = gradeDe(SKILL, ID, sinBoton, ["component-recognizer"]);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(resultado.detalle.find((d) => d.id === "reconoce-accion-button")?.passed).toBe(
      false,
    );
  });

  it("no identificar los `select` de la dirección suspende (el componente es el Guard)", () => {
    const sinSelect = SALIDA_OK.split("\n")
      .filter((linea) => !linea.startsWith("| 3 | select |"))
      .join("\n");
    const resultado = gradeDe(SKILL, ID, sinSelect, ["component-recognizer"]);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(resultado.detalle.find((d) => d.id === "reconoce-select")?.passed).toBe(false);
  });

  it("identificar `input-group` en vez de `input` es INACEPTABLE", () => {
    const mal = SALIDA_OK.replace("| input |", "| input-group |");
    const resultado = gradeDe(SKILL, ID, mal, ["component-recognizer"]);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(resultado.detalle.find((d) => d.id === "reconoce-input")?.passed).toBe(false);
    expect(
      resultado.detalle.find((d) => d.id === "no-inventa-input-group")?.passed,
    ).toBe(false);
  });

  it("identificar un componente inventado (no en el catálogo) es INACEPTABLE", () => {
    const mal = SALIDA_OK.replace("| input |", "| input-field |");
    const resultado = gradeDe(SKILL, ID, mal, ["component-recognizer"]);
    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("declarar `header-advanced` (un portal de 3 bandas) baja el Grade (Quality, no Guard)", () => {
    const mal = SALIDA_OK.replace("| header |", "| header-advanced |");
    const resultado = gradeDe(SKILL, ID, mal, ["component-recognizer"]);
    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("mencionar `header-advanced` para descartarlo no pierde nada: el Check mira la tabla (ticket 30)", () => {
    // Nombrar el componente para descartarlo es justo lo que se quiere; el Check
    // lee filas, no prosa.
    const conDescarte =
      SALIDA_OK + "\nNo es un `header-advanced` de 3 bandas: es un header de webapp.";
    const resultado = gradeDe(SKILL, ID, conDescarte, ["component-recognizer"]);
    expect(
      resultado.detalle.find((d) => d.id === "no-inventa-header-advanced")?.passed,
    ).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("añadir una fila `header-mini` baja de EXCELENTE (Quality), no suspende", () => {
    const conHeaderMini = SALIDA_OK.replace(
      "\n| 6 | footer |",
      '\n| 7 | header-mini | - | - | cabecera | franja mínima |\n| 6 | footer |',
    );
    const resultado = gradeDe(SKILL, ID, conHeaderMini, ["component-recognizer"]);
    expect(resultado.grade).not.toBe("INACEPTABLE");
    expect(resultado.grade).not.toBe("EXCELENTE");
    expect(
      resultado.detalle.find((d) => d.id === "no-inventa-header-mini")?.passed,
    ).toBe(false);
  });

  it("acertar los guards pero olvidar el footer baja de EXCELENTE (Quality)", () => {
    const sinFooter = SALIDA_OK.split("\n")
      .filter((linea) => !linea.startsWith("| 6 | footer |"))
      .join("\n");
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
