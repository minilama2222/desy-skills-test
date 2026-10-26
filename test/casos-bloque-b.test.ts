import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import { grado, type Evidencia } from "../src/grader.js";

/**
 * Aceptación del Bloque B (implementación de patrones y layouts): fija que un
 * artefacto correcto del SUT aprueba los Checks de cada Caso, y que un artefacto
 * claramente incorrecto lo hunde a INACEPTABLE. Las salidas doradas están
 * escritas como el SUT las produce —una **llamada al macro** para el patrón, su
 * **HTML estructural** para el layout—, no como una transparencia del Gold.
 *
 * Los Casos son **Caso-componente** (fragmento, sin Gold): el artefacto es el
 * fuente (`src/`), así que un patrón basado en macro se gradúa por su **llamada
 * al macro** (que se expande al compilar y por eso no vive en el `dist/`). Los
 * hechos de a11y sobre `<fieldset>`/`<label>` aplican al Caso de layout, que sí
 * escribe HTML.
 */
const evidencia = (html: string, invocaciones: string[] = []): Evidencia => ({
  artefactos: { files: { "seccion.html": html } },
  transcript: { invocaciones },
});

const dirCaso = (skill: string, id: string) =>
  join(CASOS_DIR, skill, "componente", id);

const gradeDe = (skill: string, id: string, html: string, flujo: string[] = []) => {
  const caso = cargarCaso(dirCaso(skill, id));
  return grado(evidencia(html, flujo), { tipo: caso.tipo, checks: caso.checks });
};

const paso = (resultado: ReturnType<typeof gradeDe>, id: string) =>
  resultado.detalle.find((d) => d.id === id)?.passed;

describe("Bloque B · implement-pattern/politicas-privacidad", () => {
  const SKILL = "implement-pattern";
  const ID = "politicas-privacidad";
  const DIR = dirCaso(SKILL, ID);

  /** Salida dorada: el patrón «Aceptar políticas de privacidad» con su macro. */
  const SALIDA_OK = [
    '{# patron: aceptar-politicas (desy-html) #}',
    '{% from "components/checkboxes/_macro.checkboxes.njk" import componentCheckboxes %}',
    "",
    '<div class="mt-base mb-base">',
    "{{ componentCheckboxes({",
    '  "id": "politicas",',
    '  "name": "acepta-politicas",',
    '  "fieldset": {',
    '    "legend": { "text": "Política de privacidad y protección de datos", "attributes": { "class": "sr-only" } }',
    "  },",
    '  "items": [',
    "    {",
    '      "name": "acepta-politicas",',
    '      "value": "si",',
    '      "required": true,',
    '      "label": { "text": "Acepto la <a href=\\"/politica-de-privacidad\\" class=\\"c-link\\">política de privacidad</a> (Obligatorio)", "html": true }',
    "    }",
    "  ]",
    "}) }}",
    "</div>",
  ].join("\n");

  it("existe el Caso en disco con su input/, expected/ y rubric.md", () => {
    expect(existsSync(join(DIR, "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(DIR, "expected", "checks.json"))).toBe(true);
    expect(existsSync(join(DIR, "rubric.md"))).toBe(true);
  });

  it("se carga como Caso-componente del skill implement-pattern", () => {
    const caso = cargarCaso(DIR);
    expect(caso.tipo).toBe("caso-componente");
    expect(caso.skill).toBe(SKILL);
    expect(caso.id).toBe(ID);
  });

  it("declara guards de macro y un Quality de tokens", () => {
    const caso = cargarCaso(DIR);
    const guards = caso.checks.filter((c) => c.severity === "guard");
    const assertKinds = guards.map((c) => c.assert.kind);
    // El Guard no-negociable del patrón es la llamada al macro del componente.
    expect(assertKinds).toContain("macro_presente");
    expect(assertKinds).toContain("sin_props_inventados");
    // Un Quality mide la fidelidad de tokens usados.
    const qualities = caso.checks.filter((c) => c.severity === "quality");
    expect(qualities.map((c) => c.assert.kind)).toContain("espaciado_del_sistema");
  });

  it("el prompt pide el macro y el espaciado del sistema", () => {
    const caso = cargarCaso(DIR);
    expect(caso.prompt).toMatch(/componentCheckboxes|macro/);
    expect(caso.prompt).toMatch(/tokens del sistema/);
  });

  it("el patrón correcto da EXCELENTE", () => {
    const resultado = gradeDe(SKILL, ID, SALIDA_OK, ["implement-pattern"]);
    expect(resultado.detalle.every((d) => d.passed)).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("usar HTML suelto en vez del macro del componente es INACEPTABLE", () => {
    // Ni la llamada ni el import: HTML suelto copiando las clases a mano.
    const sinMacro = [
      '<div class="mt-base mb-base c-checkboxes">',
      '  <fieldset>',
      '    <legend class="sr-only">Política de privacidad y protección de datos</legend>',
      '    <label for="politicas">Acepto la política de privacidad (Obligatorio)</label>',
      '    <input id="politicas" type="checkbox" name="acepta-politicas">',
      "  </fieldset>",
      "</div>",
    ].join("\n");
    const resultado = gradeDe(SKILL, ID, sinMacro, ["implement-pattern"]);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(paso(resultado, "usa-macro-checkboxes")).toBe(false);
  });

  it("inventar una prop del macro es INACEPTABLE", () => {
    const conPropInventada = SALIDA_OK.replace(
      '"name": "acepta-politicas",',
      '"name": "acepta-politicas",\n  "variante": "legal",',
    );
    const resultado = gradeDe(SKILL, ID, conPropInventada, ["implement-pattern"]);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(paso(resultado, "sin-props-inventados")).toBe(false);
  });

  it("un espaciado fuera de la escala canónica baja de EXCELENTE (Quality de tokens)", () => {
    const conEspaciadoInventado = SALIDA_OK.replace(
      '<div class="mt-base mb-base">',
      '<div class="mt-3 mb-base">',
    );
    const resultado = gradeDe(SKILL, ID, conEspaciadoInventado, ["implement-pattern"]);
    expect(paso(resultado, "espaciado-del-sistema")).toBe(false);
    expect(resultado.grade).not.toBe("EXCELENTE");
  });

  it("un legend visible (sin sr-only) pierde el Quality del legend oculto", () => {
    const legendVisible = SALIDA_OK.replace('"class": "sr-only"', '"class": ""');
    const resultado = gradeDe(SKILL, ID, legendVisible, ["implement-pattern"]);
    expect(paso(resultado, "legend-sr-only")).toBe(false);
    expect(resultado.grade).not.toBe("EXCELENTE");
  });

  it("olvidar la mención a la política de privacidad pierde el Quality de contenido", () => {
    const sinTexto = SALIDA_OK.replace(/política de privacidad/g, "las condiciones");
    const resultado = gradeDe(SKILL, ID, sinTexto, ["implement-pattern"]);
    expect(paso(resultado, "texto-politica")).toBe(false);
    expect(resultado.grade).not.toBe("EXCELENTE");
  });

  it("el Grade es estable entre Ejecuciones repetidas con la misma Evidencia", () => {
    const grados = new Set(
      Array.from({ length: 5 }, () => gradeDe(SKILL, ID, SALIDA_OK).grade),
    );
    expect(grados.size).toBe(1);
  });
});

describe("Bloque B · implement-layout-patterns/fieldset-grid-acciones", () => {
  const SKILL = "implement-layout-patterns";
  const ID = "fieldset-grid-acciones";
  const DIR = dirCaso(SKILL, ID);

  /**
   * Salida dorada: un grupo semántico (fieldset+legend sr-only) con la rejilla
   * responsive del formulario y las acciones al final, tal como fija el skill.
   */
  const SALIDA_OK = [
    '<form action="proximo-paso.html">',
    '  <fieldset>',
    '    <legend class="sr-only">Datos de contacto</legend>',
    '    <div class="grid lg:grid-cols-4 gap-x-base">',
    '      <div class="c-form-group lg:col-span-2">',
    '        <label for="correo">Correo electrónico</label>',
    '        <input id="correo" name="correo" type="email" class="w-full" autocomplete="email">',
    "      </div>",
    '      <div class="c-form-group lg:col-span-2">',
    '        <label for="movil">Móvil</label>',
    '        <input id="movil" name="movil" type="tel" class="w-full" autocomplete="tel">',
    "      </div>",
    "    </div>",
    "  </fieldset>",
    '  <section class="mt-base mb-base lg:mt-0 lg:mb-0" aria-labelledby="acciones-de-pagina">',
    '    <h2 id="acciones-de-pagina" class="sr-only">Acciones de página</h2>',
    '    <ul class="flex flex-wrap gap-sm">',
    '      <li><button type="submit" class="c-button c-button--primary">Siguiente paso</button></li>',
    '      <li><button class="c-button c-button--transparent">Volver</button></li>',
    "    </ul>",
    "  </section>",
    "</form>",
  ].join("\n");

  it("existe el Caso en disco con su input/, expected/ y rubric.md", () => {
    expect(existsSync(join(DIR, "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(DIR, "expected", "checks.json"))).toBe(true);
    expect(existsSync(join(DIR, "rubric.md"))).toBe(true);
  });

  it("se carga como Caso-componente del skill implement-layout-patterns", () => {
    const caso = cargarCaso(DIR);
    expect(caso.tipo).toBe("caso-componente");
    expect(caso.skill).toBe(SKILL);
    expect(caso.id).toBe(ID);
  });

  it("incluye los guards de a11y aplicables y la estructura de grid", () => {
    const caso = cargarCaso(DIR);
    const guards = caso.checks.filter((c) => c.severity === "guard");
    const kinds = guards.map((c) => c.assert.kind);
    expect(kinds).toContain("fieldset_con_legend");
    expect(kinds).toContain("labels_visibles");
    expect(kinds).toContain("estructura_grid");
  });

  it("el prompt pide el fieldset+legend y la rejilla de 4 columnas", () => {
    const caso = cargarCaso(DIR);
    expect(caso.prompt).toMatch(/fieldset/);
    expect(caso.prompt).toMatch(/sr-only/);
    expect(caso.prompt).toMatch(/lg:grid-cols-4/);
  });

  it("el layout correcto da EXCELENTE", () => {
    const resultado = gradeDe(SKILL, ID, SALIDA_OK, ["implement-layout-patterns"]);
    expect(resultado.detalle.every((d) => d.passed)).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("un fieldset sin legend es INACEPTABLE (a11y)", () => {
    const sinLegend = SALIDA_OK.replace(
      '    <legend class="sr-only">Datos de contacto</legend>\n',
      "",
    );
    const resultado = gradeDe(SKILL, ID, sinLegend, ["implement-layout-patterns"]);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(paso(resultado, "fieldset-con-legend")).toBe(false);
  });

  it("un control sin label es INACEPTABLE (a11y)", () => {
    const sinLabel = SALIDA_OK.replace(
      '        <label for="correo">Correo electrónico</label>\n',
      "",
    );
    const resultado = gradeDe(SKILL, ID, sinLabel, ["implement-layout-patterns"]);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(paso(resultado, "labels-visibles")).toBe(false);
  });

  it("una rejilla con columnas fijas en mobile (sin `lg:`) es INACEPTABLE", () => {
    const noResponsive = SALIDA_OK.replace(
      'class="grid lg:grid-cols-4 gap-x-base"',
      'class="grid grid-cols-4 gap-x-base"',
    );
    const resultado = gradeDe(SKILL, ID, noResponsive, ["implement-layout-patterns"]);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(paso(resultado, "estructura-grid")).toBe(false);
  });

  it("un espaciado fuera de la escala canónica baja de EXCELENTE (Quality de tokens)", () => {
    // `gap-x-4` es la escala numérica de Tailwind: el skill `desy-styles-reference`
    // manda `gap-x-base` (1rem), su equivalente canónico. Es el error real que el
    // propio skill de layout arrastra en su ejemplo.
    const conEspaciadoNumerico = SALIDA_OK.replace("gap-x-base", "gap-x-4");
    const resultado = gradeDe(SKILL, ID, conEspaciadoNumerico, [
      "implement-layout-patterns",
    ]);
    expect(paso(resultado, "espaciado-del-sistema")).toBe(false);
    expect(resultado.grade).not.toBe("EXCELENTE");
  });

  it("el Grade es estable entre Ejecuciones repetidas con la misma Evidencia", () => {
    const grados = new Set(
      Array.from({ length: 5 }, () => gradeDe(SKILL, ID, SALIDA_OK).grade),
    );
    expect(grados.size).toBe(1);
  });
});
