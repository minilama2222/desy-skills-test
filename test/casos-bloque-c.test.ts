import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import { grado, type Evidencia } from "../src/grader.js";

/**
 * Aceptación del Bloque C (verificación y orquestación): los skills cuyo output
 * **no es HTML**. Cinco son **Caso-decisión** —su Artefacto es el texto que el
 * SUT emitió (una tabla, un informe, una recomendación) y sus guards son de
 * **decisión** (`declara_decision` / `no_declara_decision` / `declara_fallo` /
 * `no_declara_ejecucion`)— y uno, `angular-translator`, es **Caso-componente**
 * (el SUT escribe código y se gradúa el fuente, como en el Bloque B).
 *
 * Las salidas doradas están escritas como el SUT las produce; importa el
 * **hecho de decisión**, no el wording (insensible a mayúsculas/tildes/espacios).
 */
const evidencia = (salida: string, invocaciones: string[] = []): Evidencia => ({
  artefactos: { files: { "salida.md": salida } },
  transcript: { invocaciones },
});

const dirDecision = (skill: string, id: string) =>
  join(CASOS_DIR, skill, "decision", id);

const gradeDe = (
  dir: string,
  salida: string,
  flujo: string[] = [],
) => {
  const caso = cargarCaso(dir);
  return grado(evidencia(salida, flujo), { tipo: caso.tipo, checks: caso.checks });
};

const paso = (resultado: ReturnType<typeof gradeDe>, id: string) =>
  resultado.detalle.find((d) => d.id === id)?.passed;

describe("Bloque C · styles-reference/token-espaciado", () => {
  const SKILL = "styles-reference";
  const ID = "token-espaciado";
  const DIR = dirDecision(SKILL, ID);

  /** Salida dorada: la respuesta del skill con los tokens del sistema. */
  const SALIDA_OK = [
    "Para 16 px usa `--spacing-base` = 1rem: `p-base`, `mb-base` o `gap-base`, la unidad base.",
    "Para 28 px usa `--spacing-lg` = 1.75rem: `p-lg`, `mb-lg` o `gap-lg`, la separación entre secciones.",
  ].join("\n");

  it("existe el Caso en disco con su input/, expected/ y rubric.md", () => {
    expect(existsSync(join(DIR, "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(DIR, "expected", "checks.json"))).toBe(true);
    expect(existsSync(join(DIR, "rubric.md"))).toBe(true);
  });

  it("se carga como Caso-decisión del skill styles-reference", () => {
    const caso = cargarCaso(DIR);
    expect(caso.tipo).toBe("caso-decision");
    expect(caso.skill).toBe(SKILL);
  });

  it("responde con los tokens canónicos da EXCELENTE", () => {
    const resultado = gradeDe(DIR, SALIDA_OK);
    expect(resultado.detalle.every((d) => d.passed)).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("responder con la escala de Tailwind y sin el token es INACEPTABLE (el token es el Guard)", () => {
    const mal = "Para 16 px usa `p-4`. Para 28 px usa `p-lg`.";
    const resultado = gradeDe(DIR, mal);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(paso(resultado, "token-base-16px")).toBe(false);
  });

  it("responder `gap-7` y no declarar el token de 28 px es INACEPTABLE", () => {
    const mal = "Para 16 px usa `p-base`. Para 28 px usa `gap-7`.";
    const resultado = gradeDe(DIR, mal);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(paso(resultado, "token-lg-28px")).toBe(false);
  });

  it("acertar los tokens pero no explicar la unidad baja de EXCELENTE (Quality)", () => {
    const sinUnidad = [
      "Para 16 px usa `--spacing-base`.",
      "Para 28 px usa `--spacing-lg`.",
    ].join("\n");
    const resultado = gradeDe(DIR, sinUnidad);
    expect(paso(resultado, "explica-la-unidad-base")).toBe(false);
    expect(resultado.grade).not.toBe("INACEPTABLE");
    expect(resultado.grade).not.toBe("EXCELENTE");
  });

  it("el Grade es estable entre Ejecuciones repetidas con la misma Evidencia", () => {
    const grados = new Set(
      Array.from({ length: 5 }, () => gradeDe(DIR, SALIDA_OK).grade),
    );
    expect(grados.size).toBe(1);
  });
});

describe("Bloque C · preflight-check/proyecto-no-existe", () => {
  const SKILL = "preflight-check";
  const ID = "proyecto-no-existe";
  const DIR = dirDecision(SKILL, ID);

  /** Salida dorada: detecta el no-proyecto y bifurca al scaffold pidiendo permiso. */
  const SALIDA_OK = [
    "Ejecuto el check de existencia y el resultado es **PROYECTO_NO_EXISTE** " +
      "(no hay `package.json` ni `node_modules/`).",
    "No puedo empezar a maquetar: sin el starter no hay macros ni tokens.",
    "Debes scaffoldear primero. ¿Quieres que te pase los pasos de " +
      "`desy-scaffold-project` para clonar el starter?",
  ].join("\n");

  it("existe el Caso en disco con su input/, expected/ y rubric.md", () => {
    expect(existsSync(join(DIR, "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(DIR, "expected", "checks.json"))).toBe(true);
    expect(existsSync(join(DIR, "rubric.md"))).toBe(true);
  });

  it("se carga como Caso-decisión del skill preflight-check", () => {
    const caso = cargarCaso(DIR);
    expect(caso.tipo).toBe("caso-decision");
    expect(caso.skill).toBe(SKILL);
  });

  it("identificar PROYECTO_NO_EXISTE y bifurcar al scaffold da EXCELENTE", () => {
    const resultado = gradeDe(DIR, SALIDA_OK, ["preflight-check"]);
    expect(resultado.detalle.every((d) => d.passed)).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("no identificar el no-proyecto es INACEPTABLE (el sentinel es el Guard)", () => {
    const mal = [
      "El proyecto está listo. Empiezo por `desy-choose-page-template`.",
    ].join("\n");
    const resultado = gradeDe(DIR, mal);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(paso(resultado, "identifica-no-existe")).toBe(false);
  });

  it("saltarse el scaffold y planificar la implementación pierde el Quality de bifurcación", () => {
    const mal = [
      "El resultado es PROYECTO_NO_EXISTE.",
      "Sigo igualmente con `desy-implement-component` para el botón.",
    ].join("\n");
    const resultado = gradeDe(DIR, mal);
    expect(paso(resultado, "bifurca-a-scaffold")).toBe(false);
    expect(resultado.grade).not.toBe("EXCELENTE");
  });

  it("no suspende por mencionar la implementación al descartarla", () => {
    // El SUT puede nombrar `desy-implement-component` para decir que NO toca:
    // por eso `no_declara_decision` de la implementación es Quality, no Guard.
    const descarta = [
      "PROYECTO_NO_EXISTE. No invoco `desy-implement-component` todavía:",
      "primero hay que scaffoldear. ¿Confirmas el clone?",
    ].join("\n");
    const resultado = gradeDe(DIR, descarta);
    expect(resultado.grade).not.toBe("INACEPTABLE");
  });
});

describe("Bloque C · preflight-check/proyecto-ok-libreria-version", () => {
  const SKILL = "preflight-check";
  const ID = "proyecto-ok-libreria-version";
  const DIR = dirDecision(SKILL, ID);

  /** Salida dorada: detecta el proyecto y reporta librería + versión instalada. */
  const SALIDA_OK = [
    "Leí el `package.json`: el resultado es **PROYECTO_OK**.",
    "- Proyecto: `portal-salud`",
    "- Librería detectada: `desy-html` (devDependency)",
    "- Versión instalada: `16.3.1`",
    "- Comandos: `npm run dev` / `npm run build`",
  ].join("\n");

  it("existe el Caso en disco con su input/, expected/ y rubric.md", () => {
    expect(existsSync(join(DIR, "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(DIR, "expected", "checks.json"))).toBe(true);
    expect(existsSync(join(DIR, "rubric.md"))).toBe(true);
  });

  it("se carga como Caso-decisión del skill preflight-check", () => {
    const caso = cargarCaso(DIR);
    expect(caso.tipo).toBe("caso-decision");
    expect(caso.skill).toBe(SKILL);
  });

  it("identificar la librería y la versión da EXCELENTE", () => {
    const resultado = gradeDe(DIR, SALIDA_OK, ["preflight-check"]);
    expect(resultado.detalle.every((d) => d.passed)).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("no identificar la librería instalada es INACEPTABLE", () => {
    const mal = "El proyecto existe (PROYECTO_OK). Empiezo a maquetar.";
    const resultado = gradeDe(DIR, mal);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(paso(resultado, "identifica-libreria")).toBe(false);
  });

  it("identificar la librería pero no la versión baja de EXCELENTE (Quality)", () => {
    const sinVersion = [
      "PROYECTO_OK. Librería detectada: `desy-html`.",
      "Empiezo la secuencia.",
    ].join("\n");
    const resultado = gradeDe(DIR, sinVersion);
    expect(paso(resultado, "identifica-version")).toBe(false);
    expect(resultado.grade).not.toBe("INACEPTABLE");
    expect(resultado.grade).not.toBe("EXCELENTE");
  });
});

describe("Bloque C · scaffold-project/no-scaffoldea-sin-permiso", () => {
  const SKILL = "scaffold-project";
  const ID = "no-scaffoldea-sin-permiso";
  const DIR = dirDecision(SKILL, ID);

  /** Salida dorada: explica los pasos y espera; no ejecuta el clone. */
  const SALIDA_OK = [
    "No puedo clonar el starter sin tu permiso: los comandos son operaciones " +
      "que debes confirmar y correr tú.",
    "Estos son los pasos:",
    "```bash",
    "git clone https://bitbucket.org/sdaragon/desy-html-starter.git mi-proyecto",
    "npm install",
    "npm run dev",
    "```",
    "Dime si quieres que siga con el resto de la secuencia.",
  ].join("\n");

  it("existe el Caso en disco con su input/, expected/ y rubric.md", () => {
    expect(existsSync(join(DIR, "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(DIR, "expected", "checks.json"))).toBe(true);
    expect(existsSync(join(DIR, "rubric.md"))).toBe(true);
  });

  it("se carga como Caso-decisión del skill scaffold-project", () => {
    const caso = cargarCaso(DIR);
    expect(caso.tipo).toBe("caso-decision");
    expect(caso.skill).toBe(SKILL);
  });

  it("mostrar los comandos y pedir permiso da EXCELENTE", () => {
    const resultado = gradeDe(DIR, SALIDA_OK, ["scaffold-project"]);
    expect(resultado.detalle.every((d) => d.passed)).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("reclamar haber clonado el starter es INACEPTABLE (el Guard es no actuar)", () => {
    const mal = [
      "He clonado el starter en `mi-proyecto` y ya instalé las dependencias.",
    ].join("\n");
    const resultado = gradeDe(DIR, mal);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(paso(resultado, "no-scaffoldea-sin-permiso")).toBe(false);
  });

  it("mostrar el comando como plantilla NO suspende (no es una reclamación)", () => {
    // `git clone` aparece en la salida dorada: mencionar el comando que el
    // usuario debe correr no es haberlo ejecutado.
    const resultado = gradeDe(DIR, SALIDA_OK);
    expect(paso(resultado, "no-scaffoldea-sin-permiso")).toBe(true);
  });
});

describe("Bloque C · design-match/afinado-paso-1", () => {
  const SKILL = "design-match";
  const ID = "afinado-paso-1";
  const DIR = dirDecision(SKILL, ID);

  /** Salida dorada: la tabla de discrepancias con su categoría. */
  const SALIDA_OK = [
    "| # | Elemento | Referencia | Implementación | Δ | Categoría |",
    "|---|---|---|---|---|---|",
    "| 1 | h1.mb | 28px | 8px | +20 | 🔴 bloqueante |",
    "| 2 | lead.mb | 28px | 16px | +12 | 🔴 bloqueante |",
    "| 3 | lead.fontSize | 18px | 18px | 0 | 🟢 trivial |",
  ].join("\n");

  it("existe el Caso en disco con su input/, expected/ y rubric.md", () => {
    expect(existsSync(join(DIR, "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(DIR, "expected", "checks.json"))).toBe(true);
    expect(existsSync(join(DIR, "rubric.md"))).toBe(true);
  });

  it("se carga como Caso-decisión del skill design-match", () => {
    const caso = cargarCaso(DIR);
    expect(caso.tipo).toBe("caso-decision");
    expect(caso.skill).toBe(SKILL);
  });

  it("la tabla de discrepancias correcta da EXCELENTE", () => {
    const resultado = gradeDe(DIR, SALIDA_OK, ["design-match"]);
    expect(resultado.detalle.every((d) => d.passed)).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("el Guard es reportar la fila del elemento; la categoría es Quality", () => {
    const resultado = gradeDe(DIR, SALIDA_OK);
    expect(paso(resultado, "reporta-la-fila-h1")).toBe(true);
    expect(paso(resultado, "reporta-la-fila-lead")).toBe(true);
    expect(paso(resultado, "marca-bloqueante-h1")).toBe(true);
    expect(paso(resultado, "marca-bloqueante-gap")).toBe(true);
  });

  it("clasificar la desviación de 20px del h1 como trivial baja el Grade (Quality)", () => {
    // El error del skill: minimizar un salto de 20px. La categoría errónea es un
    // Quality (la etiqueta de categoría es vocabulario del skill, no un Guard).
    const mal = SALIDA_OK.replace(
      "| 1 | h1.mb | 28px | 8px | +20 | 🔴 bloqueante |",
      "| 1 | h1.mb | 28px | 8px | +20 | 🟢 trivial |",
    );
    const resultado = gradeDe(DIR, mal);
    expect(paso(resultado, "marca-bloqueante-h1")).toBe(false);
    expect(resultado.grade).not.toBe("INACEPTABLE");
    expect(resultado.grade).not.toBe("EXCELENTE");
  });

  it("declarar la categoría solo con el emoji del skill satisface el Quality", () => {
    // El skill escribe la categoría como `🔴 bloqueante`; un SUT que emita solo
    // el emoji declara el mismo hecho. El veredicto tolera el formato.
    const soloEmoji = SALIDA_OK.replace("🔴 bloqueante", "🔴");
    const resultado = gradeDe(DIR, soloEmoji);
    expect(paso(resultado, "marca-bloqueante-h1")).toBe(true);
  });

  it("no reportar la fila del h1 es INACEPTABLE (el Guard es el hecho)", () => {
    const sinFila = [
      "| # | Elemento | Referencia | Implementación | Δ | Categoría |",
      "|---|---|---|---|---|---|",
      "| 2 | lead.mb | 28px | 16px | +12 | 🔴 bloqueante |",
    ].join("\n");
    const resultado = gradeDe(DIR, sinFila);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(paso(resultado, "reporta-la-fila-h1")).toBe(false);
  });

  it("no proponer un valor arbitrario para el fix es un Quality", () => {
    const conArbitrario = SALIDA_OK + "\nFix: `max-w-[372px]` en el h1.";
    const resultado = gradeDe(DIR, conArbitrario);
    expect(paso(resultado, "no-usa-valor-arbitrario")).toBe(false);
    expect(resultado.grade).not.toBe("EXCELENTE");
  });
});

describe("Bloque C · validate-accessibility/checklist-sin-servidor", () => {
  const SKILL = "validate-accessibility";
  const ID = "checklist-sin-servidor";
  const DIR = dirDecision(SKILL, ID);

  /** Informe dorado: el checklist de grep con sus fallos detectados. */
  const SALIDA_OK = [
    "## Checklist sin servidor",
    "- [ ] un solo h1: hay 2 `<h1>` → FALLA (debe haber 1)",
    "- [ ] cada fieldset con su legend: 1 `<fieldset>` y 0 `<legend>` → FALLA",
    "- [ ] sin label: el input `nif` no tiene `label for` → FALLA",
    "- [ ] skip-link (`c-skip-link`): ausente → FALLA",
  ].join("\n");

  it("existe el Caso en disco con su input/, expected/ y rubric.md", () => {
    expect(existsSync(join(DIR, "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(DIR, "expected", "checks.json"))).toBe(true);
    expect(existsSync(join(DIR, "rubric.md"))).toBe(true);
  });

  it("se carga como Caso-decisión del skill validate-accessibility", () => {
    const caso = cargarCaso(DIR);
    expect(caso.tipo).toBe("caso-decision");
    expect(caso.skill).toBe(SKILL);
  });

  it("el informe que detecta los dos fallos da EXCELENTE", () => {
    const resultado = gradeDe(DIR, SALIDA_OK, ["validate-accessibility"]);
    expect(resultado.detalle.every((d) => d.passed)).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("no detectar el h1 de más es INACEPTABLE (el Guard es declarar el fallo)", () => {
    const ciego = [
      "## Checklist sin servidor",
      "- [x] un-solo-h1: 1 → OK",
      "- [ ] fieldset-con-legend: 1 `<fieldset>` y 0 `<legend>` → FALLA",
    ].join("\n");
    const resultado = gradeDe(DIR, ciego);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(paso(resultado, "detecta-h1-de-mas")).toBe(false);
  });

  it("nombrar el h1 diciendo que está OK no satisface el Guard", () => {
    // El error real: el informe nombra el check pero lo da por bueno. El Guard
    // exige el hecho **con su marcador de fallo** en la misma línea.
    const falsoOk = "- [x] un-solo-h1: presente → OK";
    const resultado = gradeDe(DIR, falsoOk);
    expect(paso(resultado, "detecta-h1-de-mas")).toBe(false);
    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("no detectar el fieldset sin legend es INACEPTABLE", () => {
    const sinLegend = [
      "- [ ] un-solo-h1: 2 → FALLA",
      "- [x] fieldset-con-legend: 1 `<fieldset>` y 1 `<legend>` → OK",
    ].join("\n");
    const resultado = gradeDe(DIR, sinLegend);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(paso(resultado, "detecta-fieldset-sin-legend")).toBe(false);
  });
});

describe("Bloque C · angular-translator/boton-primario-angular", () => {
  const SKILL = "angular-translator";
  const ID = "boton-primario-angular";
  const DIR = join(CASOS_DIR, SKILL, "componente", ID);

  /** Salida dorada: el patrón trivial macro → selector + bindings. */
  const SALIDA_OK = [
    "<desy-button",
    '  [text]="text"',
    '  classes="c-button--primary"',
    ">",
    "  {{ text }}",
    "</desy-button>",
  ].join("\n");

  const gradeHtml = (html: string) => {
    const caso = cargarCaso(DIR);
    return grado(
      { artefactos: { files: { "boton.component.html": html } }, transcript: { invocaciones: ["angular-translator"] } },
      { tipo: caso.tipo, checks: caso.checks },
    );
  };

  it("existe el Caso en disco con su input/, expected/ y rubric.md", () => {
    expect(existsSync(join(DIR, "input", "prompt.md"))).toBe(true);
    expect(existsSync(join(DIR, "expected", "checks.json"))).toBe(true);
    expect(existsSync(join(DIR, "rubric.md"))).toBe(true);
  });

  it("se carga como Caso-componente del skill angular-translator", () => {
    const caso = cargarCaso(DIR);
    expect(caso.tipo).toBe("caso-componente");
    expect(caso.skill).toBe(SKILL);
  });

  it("la traducción correcta al selector `desy-button` da EXCELENTE", () => {
    const resultado = gradeHtml(SALIDA_OK);
    expect(resultado.detalle.every((d) => d.passed)).toBe(true);
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("dejar el macro Nunjucks sin traducir es INACEPTABLE", () => {
    const sinTraducir =
      '{{ componentButton({ "text": "Enviar", "classes": "c-button--primary" }) }}';
    const resultado = gradeHtml(sinTraducir);
    expect(resultado.grade).toBe("INACEPTABLE");
    expect(
      resultado.detalle.find((d) => d.id === "usa-selector-desy-button")?.passed,
    ).toBe(false);
  });

  it("perder la variante primaria baja el Grade (Quality de la clase)", () => {
    const sinVariante = [
      '<desy-button [text]="text">',
      "  {{ text }}",
      "</desy-button>",
    ].join("\n");
    const resultado = gradeHtml(sinVariante);
    expect(resultado.grade).not.toBe("EXCELENTE");
  });
});
