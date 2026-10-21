import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import { grado } from "../src/grader.js";

/**
 * Golden de aceptación: la salida que el SUT real produjo en una Ejecución
 * contra el Pin b523ca7 (transcrita tal cual de la Evidencia). Sirve para
 * fijar que los Checks del Caso aprueban una salida correcta, con
 * independencia de si el SUT vuelve a producirla.
 */
const SALIDA_REAL_DEL_SUT = `{# boton-enviar.njk — referencia: botón primario estándar "Enviar" (desy-html) #}
{% from "components/button/_macro.button.njk" import componentButton %}

{{ componentButton({
  "text": "Enviar",
  "type": "submit",
  "classes": "c-button--primary"
}) }}
`;

const CASO_DIR = join(CASOS_DIR, "implement-component", "componente", "boton-primario");

describe("aceptación: la salida real del SUT aprueba los Checks del Caso", () => {
  it("un botón primario correcto generado por el SUT da EXCELENTE", () => {
    const caso = cargarCaso(CASO_DIR);
    const resultado = grado(
      {
        artefactos: { files: { "boton-enviar.njk": SALIDA_REAL_DEL_SUT } },
        transcript: {
          invocaciones: ["desy-preflight-check", "desy-implement-component", "desy-styles-reference"],
        },
      },
      { tipo: caso.tipo, checks: caso.checks },
    );

    expect(resultado.detalle.every((d) => d.passed)).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("la salida real del SUT usa la macro, la variante primaria y props del catálogo", () => {
    const caso = cargarCaso(CASO_DIR);
    const resultado = grado(
      { artefactos: { files: { "boton-enviar.njk": SALIDA_REAL_DEL_SUT } }, transcript: { invocaciones: [] } },
      { tipo: caso.tipo, checks: caso.checks },
    );

    const porId = Object.fromEntries(resultado.detalle.map((d) => [d.id, d.passed]));
    expect(porId["usa-macro-boton"]).toBe(true);
    expect(porId["variante-primaria"]).toBe(true);
    expect(porId["sin-props-inventados"]).toBe(true);
  });
});
