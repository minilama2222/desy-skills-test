import { describe, expect, it } from "vitest";
import type { Check } from "../src/caso.js";
import { frameworkDeChecks, grado } from "../src/grader.js";

const artefactos = (html: string) => ({ files: { "index.html": html } });
const transcript = (...invocaciones: string[]) => ({ invocaciones });

/**
 * Gold-HTML mínimo para los guards de fidelidad estructural: el Caso-página
 * siempre lleva uno, así que un test de página debe dárselo. Sin clases de
 * container/h1/gap, los guards de fidelidad pasan trivialmente; estas pruebas
 * son de a11y, no de fidelidad.
 */
const GOLD_MINIMO = "<main><h1>Título</h1></main>";

const conPagina = (html: string) =>
  grado(
    { artefactos: artefactos(html), transcript: transcript() },
    { tipo: "caso-pagina", checks: [], gold: GOLD_MINIMO },
  );

const checkLabels = (): Check => ({
  id: "labels-visibles",
  severity: "guard",
  weight: 0,
  assert: { kind: "labels_visibles" },
});

const conCheck = (html: string) => {
  const r = grado(
    { artefactos: artefactos(html), transcript: transcript() },
    { tipo: "caso-pagina", checks: [checkLabels()] },
  );
  return r.detalle.find((d) => d.id === "labels-visibles")?.passed;
};

/**
 * Regla anclada en desy-validate-accessibility (checklist de grep, paso 4):
 * «Cada input, select y textarea con su label». El grep del skill saca el `id`
 * de cada input/select/textarea (ignorando `type="hidden"`) y comprueba que
 * existe un `for="<id>"`.
 */
describe("Guard de labels visibles", () => {
  it("pasa cuando cada input tiene su label con for", () => {
    const passed = conCheck(
      '<main><label for="nombre">Nombre</label><input id="nombre"></main>',
    );
    expect(passed).toBe(true);
  });

  it("falla cuando un input no tiene label asociado", () => {
    const passed = conCheck('<main><input id="nombre"></main>');
    expect(passed).toBe(false);
  });

  it("falla cuando el label apunta a otro id", () => {
    const passed = conCheck(
      '<main><label for="otro">Nombre</label><input id="nombre"></main>',
    );
    expect(passed).toBe(false);
  });

  it("aplica también a select y textarea", () => {
    expect(conCheck('<main><select id="pais"></select></main>')).toBe(false);
    expect(conCheck('<main><textarea id="notas"></textarea></main>')).toBe(false);
    expect(
      conCheck(
        '<main><label for="pais">País</label><select id="pais"></select></main>',
      ),
    ).toBe(true);
  });

  it("ignora los input hidden (no necesitan label)", () => {
    const passed = conCheck(
      '<main><input type="hidden" id="token"><label for="nombre">N</label><input id="nombre"></main>',
    );
    expect(passed).toBe(true);
  });

  it("pasa cuando hay labels en distinto orden que los inputs", () => {
    const passed = conCheck(
      '<main><label for="a">A</label><input id="a"><label for="b">B</label><input id="b"></main>',
    );
    expect(passed).toBe(true);
  });

  it("una página sin inputs no exige labels (ausencia aceptable)", () => {
    const passed = conCheck("<main><h1>Sin formulario</h1></main>");
    expect(passed).toBe(true);
  });

  it("un input sin id no se puede asociar y falla", () => {
    const passed = conCheck("<main><input></main>");
    expect(passed).toBe(false);
  });
});

describe("Robustez de los guards de a11y ante variación de comillas", () => {
  it("el skip-link se detecta también con comillas simples", () => {
    // Un atributo con comillas simples es HTML válido; el guard no debe
    // producir un INACEPTABLE falso por la forma de citar.
    const resultado = conPagina("<a class='c-skip-link'>Saltar</a><main><h1>T</h1></main>");
    expect(resultado.detalle.find((d) => d.id === "skip-link")?.passed).toBe(true);
  });
});

describe("Framework de Caso-página con los guards de a11y del ticket 07", () => {
  it("incluye el guard de labels visibles", () => {
    const ids = frameworkDeChecks("caso-pagina").map((c) => c.id);
    expect(ids).toContain("labels-visibles");
  });

  it("todos sus guards son Guard", () => {
    const severities = frameworkDeChecks("caso-pagina").map((c) => c.severity);
    expect(severities.every((s) => s === "guard")).toBe(true);
  });

  it("un HTML de página completo con los cuatro guards de a11y pasa", () => {
    const html = [
      "<!doctype html><html><body>",
      '<a class="c-skip-link" href="#content">Saltar al contenido</a>',
      '<main id="content"><h1>Alta</h1>',
      '<fieldset><legend>Datos</legend>',
      '<label for="nif">NIF</label><input id="nif">',
      "</fieldset></main></body></html>",
    ].join("");
    const resultado = conPagina(html);
    const fallos = resultado.detalle.filter((d) => !d.passed).map((d) => d.id);
    expect(fallos).toEqual([]);
  });

  it("un HTML de página con fallos de a11y hunde el Grade a INACEPTABLE", () => {
    const html = "<main><h1>Uno</h1><h1>Dos</h1><input id=\"x\"></main>";
    expect(conPagina(html).grade).toBe("INACEPTABLE");
  });
});
