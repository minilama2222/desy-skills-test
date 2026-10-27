import { describe, expect, it } from "vitest";
import { parseChecks, type TipoCaso } from "../src/caso.js";
import { grado, type Evidencia } from "../src/grader.js";

/**
 * Un Caso-decisión no produce HTML: lo que el SUT entrega es **su decisión** en
 * texto (una tabla de componentes, la plantilla elegida, la librería
 * recomendada). El artefacto es ese texto del SUT; los asserts de decisión lo
 * leen. El grader sigue puro: recibe texto y emite Grade.
 */
const evidencia = (salida: string, invocaciones: string[] = []): Evidencia => ({
  artefactos: { files: { "salida.md": salida } },
  transcript: { invocaciones },
});

const gradoCon = (tipo: TipoCaso, checksJson: string, salida: string, flujo: string[] = []) =>
  grado(evidencia(salida, flujo), { tipo, checks: parseChecks(checksJson) });

const declarar = (id: string, severity: string, peso: number, assert: object) =>
  JSON.stringify({ checks: [{ id, severity, weight: peso, assert }] });

describe("Caso-decisión: tipo y asserts de decisión", () => {
  it("el tipo caso-decision es válido", () => {
    const checks = parseChecks('{"checks": []}');
    expect(checks).toEqual([]);
  });

  it("un assert de decisión `declara_decision` acepta un valor presente en la salida", () => {
    const checks = declarar("componente", "guard", 0, {
      kind: "declara_decision",
      valor: "input-group",
    });
    const resultado = gradoCon(
      "caso-decision",
      checks,
      "| 1 | input-group | text | - | main | label \"Nombre\" |",
    );
    expect(resultado.grade).not.toBe("INACEPTABLE");
  });

  it("un guard de decisión que no aparece en la salida es INACEPTABLE", () => {
    const checks = declarar("componente", "guard", 0, {
      kind: "declara_decision",
      valor: "header-mini",
    });
    const resultado = gradoCon(
      "caso-decision",
      checks,
      "| 1 | header-advanced | - | - | header | 3 bandas |",
    );
    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("`no_declara_decision` suspende si el valor prohibido aparece", () => {
    const checks = declarar("no-alert", "guard", 0, {
      kind: "no_declara_decision",
      valor: "alert",
    });
    const resultado = gradoCon(
      "caso-decision",
      checks,
      "| 3 | alert | info | - | main | recuadro con icono |",
    );
    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("un assert de decisión es insensible a mayúsculas y a espacios sobrantes", () => {
    const checks = declarar("plantilla", "guard", 0, {
      kind: "declara_decision",
      valor: "logged-selector",
    });
    const resultado = gradoCon(
      "caso-decision",
      checks,
      "Plantilla elegida: `_template.LOGGED-SELECTOR.njk`",
    );
    expect(resultado.grade).not.toBe("INACEPTABLE");
  });

  it("un quality de decisión puntúa hacia el Grade sin hundirlo", () => {
    const checks = JSON.stringify({
      checks: [
        {
          id: "componente-correcto",
          severity: "quality",
          weight: 1,
          assert: { kind: "declara_decision", valor: "table-advanced" },
        },
        {
          id: "componente-faltante",
          severity: "quality",
          weight: 1,
          assert: { kind: "declara_decision", valor: "pagination" },
        },
      ],
    });
    const resultado = gradoCon("caso-decision", checks, "| 1 | table-advanced | - |");
    expect(resultado.grade).not.toBe("INACEPTABLE");
    expect(resultado.grade).not.toBe("EXCELENTE");
  });

  it("el Framework de un Caso-decisión no añade guards de HTML (no hay HTML)", () => {
    // Un Caso-decisión con checks vacíos y salida prosa no debe suspender por
    // guards de a11y ni de tokens: no hay HTML que mirar.
    const resultado = gradoCon("caso-decision", '{"checks": []}', "Recomiendo desy-angular.");
    expect(resultado.grade).toBe("EXCELENTE");
  });

  it("rechaza un checks.json de decisión con kind desconocido o sin valor", () => {
    expect(() => parseChecks(declarar("x", "guard", 0, { kind: "declara_decision" }))).toThrow();
    expect(() => parseChecks(declarar("x", "guard", 0, { kind: "camina" }))).toThrow();
  });
});

describe("Caso-decisión: assert `no_declara_ejecucion` (no actuó)", () => {
  const checks = (accion: string) =>
    declarar("no-actua", "guard", 0, { kind: "no_declara_ejecucion", accion });

  it("una respuesta que solo muestra el comando como plantilla NO suspende", () => {
    // El skill de scaffold prohíbe ejecutar: la respuesta correcta le da al
    // usuario los comandos y le pide que los corra él. Mencionar `git clone`
    // como plantilla no es haberlo ejecutado.
    const salida = [
      "No puedo scaffoldear sin tu permiso. Ejecuta tú estos comandos:",
      "```bash",
      "git clone https://bitbucket.org/sdaragon/desy-html-starter.git mi-proyecto",
      "npm install",
      "```",
    ].join("\n");
    const resultado = gradoCon("caso-decision", checks("git clone"), salida);
    expect(resultado.grade).not.toBe("INACEPTABLE");
  });

  it("reclamar haber ejecutado la acción en pasado SÍ suspende", () => {
    const salida = "He clonado el starter y ya instalé las dependencias. Listo.";
    const resultado = gradoCon("caso-decision", checks("git clone"), salida);
    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("reclamar la ejecución en cualquier forma de pasado suspende (`ya cloné`, `I ran`)", () => {
    for (const reclamacion of [
      "Ya cloné el starter en mi-proyecto.",
      "I cloned the starter already.",
    ]) {
      const resultado = gradoCon("caso-decision", checks("clonar"), reclamacion);
      expect(resultado.grade).toBe("INACEPTABLE");
    }
  });

  it("una respuesta que no menciona la acción pasa (no hay reclamación)", () => {    const resultado = gradoCon(
      "caso-decision",
      checks("git clone"),
      "¿Quieres que scaffoldee el starter oficial? Dime y sigo.",
    );
    expect(resultado.grade).not.toBe("INACEPTABLE");
  });

  it("rechaza un checks.json de `no_declara_ejecucion` sin acción", () => {
    expect(() =>
      parseChecks(declarar("x", "guard", 0, { kind: "no_declara_ejecucion" })),
    ).toThrow();
  });

  it("ancla el pretérito con lookahead, no con `\\b`: `\\w` no incluye la vocal acentuada", () => {
    // La regla de CODING_STANDARDS depende de este hecho de JavaScript: si algún
    // día deja de ser cierto, el assert se vuelve ciego a «ya cloné» y este test
    // lo dice antes que la prosa.
    expect(/\bcloné\b/i.test("cloné")).toBe(false);
    expect(/clon[ée](?![a-záéíóúñ])/i.test("cloné")).toBe(true);

    // Y el assert, de punta a punta, sí ve la reclamación terminada en vocal
    // acentuada.
    const resultado = gradoCon("caso-decision", checks("clonar"), "Ya cloné el starter.");
    expect(resultado.grade).toBe("INACEPTABLE");
  });
});

describe("Caso-decisión: assert `declara_fallo` (el informe declara que algo falla)", () => {
  const checks = (hecho: string) =>
    declarar("detecta-fallo", "guard", 0, { kind: "declara_fallo", hecho });

  it("declarar el hecho con su marcador de fallo en la misma línea pasa", () => {
    const informe = [
      "## Checklist sin servidor",
      "- [x] un-solo-h1: 1 → OK",
      "- [ ] skip-link (`c-skip-link`): ausente → FALLA",
    ].join("\n");
    const resultado = gradoCon("caso-decision", checks("skip-link"), informe);
    expect(resultado.grade).not.toBe("INACEPTABLE");
  });

  it("nombrar el hecho diciendo que está OK NO satisface el guard", () => {
    // El error real: el informe nombra el check pero no declara que falle.
    const informe = "- [x] skip-link (`c-skip-link`): presente → OK";
    const resultado = gradoCon("caso-decision", checks("skip-link"), informe);
    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("el hecho y el marcador han de convivir en la misma línea, no en líneas distintas", () => {
    const informe = [
      "- [x] skip-link (`c-skip-link`): presente → OK",
      "- [ ] labels-visibles: falta el `for` del input `correo` → FALLA",
    ].join("\n");
    const resultado = gradoCon("caso-decision", checks("skip-link"), informe);
    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("reconoce los marcadores de fallo del informe (`no cumple`, `error`, `0`)", () => {
    for (const linea of [
      "fieldset-con-legend: no cumple (2 fieldset, 1 legend)",
      "un-solo-h1: error, hay 2 h1 en la página",
      "fieldset-con-legend: 2 fieldset / 0 legend",
    ]) {
      const hecho = linea.split(":")[0]!;
      const resultado = gradoCon("caso-decision", checks(hecho), linea);
      expect(resultado.grade).not.toBe("INACEPTABLE");
    }
  });

  it("rechaza un checks.json de `declara_fallo` sin hecho", () => {
    expect(() => parseChecks(declarar("x", "guard", 0, { kind: "declara_fallo" }))).toThrow();
  });
});

describe("Caso-decisión: assert `reconoce_componente` contra el catálogo", () => {
  const TABLA = [
    "| Nº | Componente | Variante | Tamaño | Ubicación | Notas |",
    "|:--:|:-----------|:---------|:------:|:----------|:------|",
    '| 1 | header-mini | - | - | header | logo |',
    '| 2 | input-group | text | - | main | label "Usuario" |',
    '| 3 | button | primario | base | main | "Acceder" |',
    '| 4 | footer | - | - | footer | logos |',
  ].join("\n");

  it("un componente documentado con su variante en el catálogo es ACEPTABLE", () => {
    const checks = declarar("reconoce-boton", "guard", 0, {
      kind: "reconoce_componente",
      componente: "button",
      variante: "primario",
    });
    const resultado = gradoCon("caso-decision", checks, TABLA);
    expect(resultado.grade).not.toBe("INACEPTABLE");
  });

  it("la variante se valida por el catálogo, traduciendo español↔inglés (`primary`)", () => {
    const checks = declarar("reconoce-boton", "guard", 0, {
      kind: "reconoce_componente",
      componente: "button",
      variante: "primary",
    });
    const resultado = gradoCon("caso-decision", checks, TABLA);
    expect(resultado.grade).not.toBe("INACEPTABLE");
  });

  it("un componente inventado (no en el catálogo) es INACEPTABLE", () => {
    const checks = declarar("reconoce-raro", "guard", 0, {
      kind: "reconoce_componente",
      componente: "boton-magico",
    });
    const resultado = gradoCon("caso-decision", checks, TABLA);
    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("una variante que el catálogo no documenta para ese componente es INACEPTABLE", () => {
    const checks = declarar("reconoce-boton", "guard", 0, {
      kind: "reconoce_componente",
      componente: "button",
      variante: "fucsia",
    });
    const conFucsia = TABLA.replace("| button | primario |", "| button | fucsia |");
    const resultado = gradoCon("caso-decision", checks, conFucsia);
    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("una variante declarada para OTRO componente no vale (mira la fila del componente)", () => {
    // `primario` es variante válida de `button`; asignada a `input-group` no.
    const checks = declarar("reconoce-input", "guard", 0, {
      kind: "reconoce_componente",
      componente: "input-group",
      variante: "primario",
    });
    const resultado = gradoCon("caso-decision", checks, TABLA);
    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("rechaza un checks.json de `reconoce_componente` sin componente", () => {
    expect(() =>
      parseChecks(declarar("x", "guard", 0, { kind: "reconoce_componente" })),
    ).toThrow();
  });
});
