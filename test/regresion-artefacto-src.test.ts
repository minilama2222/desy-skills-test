import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CasoComponente } from "../src/caso.js";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import { grado } from "../src/grader.js";
import { readPin } from "../src/pin.js";
import { createSandbox, runCaso, type CommandRunner } from "../src/runner.js";

/**
 * Regresión del bug de artefacto (ver HALLAZGO-guards-macro-artefacto y
 * ADR-0006): el SUT escribía el fuente en `src/` y el runner devolvía el `dist/`
 * compilado, donde la llamada al macro ya se ha expandido. Los guards de macro
 * no veían nada y el harness suspendía una salida correcta.
 *
 * Este test pasa por el camino completo (sandbox real -> runCaso -> grado), que
 * es justo el tramo que el golden de aceptación no cubría: aquél le daba el
 * fuente directamente al grader y por eso no podía detectar el bug.
 */
const pin = readPin(join(process.cwd(), "pin.json"));

const CASO_DIR = join(CASOS_DIR, "implement-component", "componente", "boton-primario");

// Fuente tal cual lo escribió el SUT en la Ejecución #1 del experimento v2
// (reports/estabilidad-v2/ejecucion-1-fuente.txt), con `preventDoubleClick`,
// `pb-lg` y `c-h1`. Es la salida que el harness suspendió injustamente.
const FUENTE_REAL_DEL_SUT = `{% set title = "Botón Enviar. Gobierno de Aragón" %}

{% extends "pages/_template.test.njk" %}

{% block contentBlock %}
  <div class="pb-lg"></div>
  <h1 class="c-h1">Botón primario de envío</h1>

  {% from "components/button/_macro.button.njk" import componentButton %}

  <form action="#" novalidate>
    {{ componentButton({
      "text": "Enviar",
      "type": "submit",
      "classes": "c-button--primary",
      "preventDoubleClick": true
    }) }}
  </form>

  <div class="pb-lg"></div>
{% endblock %}
`;

describe("regresión: el Caso-componente gradúa el fuente que el SUT escribe en src/", () => {
  it("una salida correcta escrita en src/ da EXCELENTE por el camino completo", async () => {
    const caso = cargarCaso(CASO_DIR);
    let sandbox: ReturnType<typeof createSandbox> | undefined;

    // El SUT simulado escribe su página en src/, como hace el real.
    const command: CommandRunner = {
      run: (_args, opts) => {
        const src = join(opts.cwd, "src");
        mkdirSync(src, { recursive: true });
        writeFileSync(join(src, "boton-enviar.html"), FUENTE_REAL_DEL_SUT);
        return {
          stdout: "",
          stderr: [
            '\u001b[0m→ \u001b[0mSkill "desy-preflight-check" ',
            '\u001b[0m→ \u001b[0mSkill "desy-implement-component" ',
          ].join("\n"),
          code: 0,
        };
      },
    };

    const evidencia = await runCaso(caso, pin, {
      sandbox: {
        create: () => {
          sandbox = createSandbox();
          return sandbox;
        },
      },
      command,
    });

    const resultado = grado(evidencia, { tipo: caso.tipo, checks: caso.checks });

    // El artefacto es el fuente, no el compilado.
    expect(Object.keys(evidencia.artefactos.files)).toEqual(["src/boton-enviar.html"]);
    // Los tres guards de macro que antes fallaban, y el guard de tokens, pasan.
    const porId = Object.fromEntries(resultado.detalle.map((d) => [d.id, d.passed]));
    expect(porId["usa-macro-boton"]).toBe(true);
    expect(porId["variante-primaria"]).toBe(true);
    expect(porId["sin-props-inventados"]).toBe(true);
    expect(porId["tokens-del-sistema"]).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("el mismo fuente compilado en dist/ (bug original) habría suspendido los guards", () => {
    // El compilado expande el macro: ya no hay `componentButton` que medir. Si el
    // artefacto hubiera seguido siendo el dist/, los guards de macro fallarían
    // aunque el trabajo estuviera bien hecho.
    const caso: CasoComponente = cargarCaso(CASO_DIR) as CasoComponente;
    const compilado = '<button type="submit" class="c-button c-button--primary">Enviar</button>';

    const resultado = grado(
      { artefactos: { files: { "dist/boton-enviar.html": compilado } }, transcript: { invocaciones: [] } },
      { tipo: caso.tipo, checks: caso.checks },
    );

    const porId = Object.fromEntries(resultado.detalle.map((d) => [d.id, d.passed]));
    expect(porId["usa-macro-boton"]).toBe(false);
    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("tokens-del-sistema ignora el boilerplate del starter: no está en el artefacto del Caso-componente", () => {
    // El guard de tokens del Caso-componente mira src/, que sólo contiene el
    // fichero del SUT. El header/footer del starter (con sus text-6xl, w-8, p-2)
    // vive en las plantillas y en el dist/ del starter, fuera del artefacto.
    const caso: CasoComponente = cargarCaso(CASO_DIR) as CasoComponente;
    const resultado = grado(
      { artefactos: { files: { "src/boton-enviar.html": FUENTE_REAL_DEL_SUT } }, transcript: { invocaciones: [] } },
      { tipo: caso.tipo, checks: caso.checks },
    );

    expect(resultado.detalle.find((d) => d.id === "tokens-del-sistema")?.passed).toBe(true);
  });
});
