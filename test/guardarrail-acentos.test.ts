import { describe, expect, it } from "vitest";
import { esProsa, problemasDeAcentos } from "../src/guardarrail-acentos.js";

/**
 * Retro del ticket 06: los acentos se aplanaron **dos veces** al reescribir
 * ficheros y ningún check lo vio (el de codificación mira bytes, no palabras).
 * Es mecánico, así que le toca un check. Estos tests fijan las dos caras: caza lo
 * que es prosa aplanada y **no** caza identificadores, rutas ni slugs.
 */

const codigo = (lineas: string[]) => ({ path: "src/x.ts", lineas, contexto: "codigo" as const });
const prosa = (lineas: string[], path = "README.md") => ({ path, lineas });

describe("problemasDeAcentos: lo que caza", () => {
  it("una palabra sin tilde en un comentario de código", () => {
    const hallazgos = problemasDeAcentos([codigo([" * La seccion del skill que el Caso nombra"])]);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("src/x.ts:1");
    expect(hallazgos[0]).toContain('"seccion"');
    expect(hallazgos[0]).toContain('"sección"');
  });

  it("el fallo real de la retro: `guardarrail`, `arbol canonico` aplanados", () => {
    const hallazgos = problemasDeAcentos([
      prosa(["El guardarrail puro del arbol canonico vive aqui."], "scripts/x.ts"),
    ]);

    const palabras = hallazgos.map((h) => h.match(/"([^"]+)" sin tilde/)![1]);
    expect(palabras).toEqual(["guardarrail", "arbol", "canonico"]);
  });

  it("un comando en un fence de markdown con la palabra suelta", () => {
    const hallazgos = problemasDeAcentos([prosa(["- corre el guardarrail del repo"])]);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("¿querías \"guardarraíl\"?");
  });

  it("informa una vez por palabra y fichero, con su primera línea", () => {
    const hallazgos = problemasDeAcentos([
      prosa(["primera linea", "El arbol uno.", "El arbol dos.", "El arbol tres."]),
    ]);

    const delArbol = hallazgos.filter((h) => h.includes('"arbol"'));
    expect(delArbol).toHaveLength(1);
    expect(delArbol[0]).toContain("README.md:2");
  });

  it("acumula hallazgos de varios ficheros", () => {
    const hallazgos = problemasDeAcentos([
      codigo(["// El arbol de skills"]),
      prosa(["El guardarrail de turno."]),
    ]);

    expect(hallazgos).toHaveLength(2);
  });
});

describe("problemasDeAcentos: lo que NO caza (sin rojos falsos)", () => {
  it("un identificador de código con nombre sin tilde", () => {
    // `ejecucion`, `seccion`, `numero` son variables del repo: renombrarlas no es
    // asunto de este guardarraíl.
    const hallazgos = problemasDeAcentos([
      codigo([
        "const ejecucion = leer();",
        "function render(seccion: string) {",
        "  return numero + 1;",
      ]),
    ]);

    expect(hallazgos).toEqual([]);
  });

  it("un nombre compuesto con guiones: un slug de Caso o un id de Check", () => {
    const hallazgos = problemasDeAcentos([
      prosa(["## Caso `patron-pagina-paso-1-nombre-nif` del Bloque A"]),
      prosa(['  "id": "encadenado-canonico",'], "casos/x/expected/checks.json"),
      prosa(["# Rúbrica — choose-page-template / 404-portal-publico"]),
    ]);

    expect(hallazgos).toEqual([]);
  });

  it("una ruta de fichero y un import", () => {
    const hallazgos = problemasDeAcentos([
      codigo(['import { x } from "./guardarrail-pin.js";', "// Ver src/guardarrail-arbol.ts"]),
      prosa(["- `casos/implement-pattern/pagina/patron-pagina-paso-1-nombre-nif/`"]),
    ]);

    expect(hallazgos).toEqual([]);
  });

  it("una palabra entre backticks en medio de una frase", () => {
    const hallazgos = problemasDeAcentos([prosa(["El `patron` de aquí es correcto."])]);

    expect(hallazgos).toEqual([]);
  });

  it("las formas que sin tilde SON correctas: esta, solo, mas, aun", () => {
    // La trampa de este guardarraíl: si metiera los pares ambiguos, daría rojos
    // en prosa perfectamente correcta y se acabaría ignorando.
    const hallazgos = problemasDeAcentos([
      prosa(["Esta línea solo tiene mas palabras, aun así está bien."]),
    ]);

    expect(hallazgos).toEqual([]);
  });

  it("el propio diccionario no se marca, y la prosa bien escrita pasa", () => {
    const hallazgos = problemasDeAcentos([
      prosa(["El árbol canónico y el guardarraíl de la sección."]),
      codigo(["/** La sección del skill, con su título. */"]),
    ]);

    expect(hallazgos).toEqual([]);
  });
});

describe("esProsa", () => {
  it("en un fichero de código sólo el comentario es prosa", () => {
    expect(esProsa("const arbol = 1;", "codigo")).toBe(false);
    expect(esProsa("// el arbol de skills", "codigo")).toBe(true);
    expect(esProsa(" * el arbol de skills", "codigo")).toBe(true);
    expect(esProsa("/** el arbol de skills */", "codigo")).toBe(true);
  });

  it("en un fichero de prosa, el fence de código no cuenta", () => {
    expect(esProsa("```bash", "prosa")).toBe(false);
    expect(esProsa("El árbol del repo.", "prosa")).toBe(true);
  });

  it("una línea vacía o una abertura de objeto no es prosa", () => {
    expect(esProsa("", "prosa")).toBe(false);
    expect(esProsa("   ", "prosa")).toBe(false);
    expect(esProsa('{ "id": "x" }', "prosa")).toBe(false);
  });
});

/**
 * Ticket 24: el patrón cortaba la palabra en la vocal acentuada y denunciaba
 * castellano correcto. Salió escribiendo el ADR-0006: «No funcionó, y no por
 * falta de instrucciones» se marcó como `funcion` sin tilde.
 */
describe("formas flexionadas con tilde: no son rojos falsos (ticket 24)", () => {
  it("«funcionó», «funcionar» y «funcionando» son correctas", () => {
    const hallazgos = problemasDeAcentos([
      prosa([
        "No funcionó, y no por falta de instrucciones.",
        "La regla tiene que funcionar igual en los dos lados.",
        "El vigilante sigue funcionando mientras corre la suite.",
      ]),
    ]);

    expect(hallazgos).toEqual([]);
  });

  it("«funcion» sola sí se caza: ahí falta la tilde", () => {
    const hallazgos = problemasDeAcentos([prosa(["La funcion del runner es medir."])]);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain('"funcion" sin tilde');
  });

  it("los demás del listado conservan el límite: «arbolado» no, «arbol» sí", () => {
    expect(problemasDeAcentos([prosa(["El arbolado del parque."])])).toEqual([]);
    expect(problemasDeAcentos([prosa(["El arbol del repo."])])).toHaveLength(1);
    // Y el plural sigue sin marcarse, como antes.
    expect(problemasDeAcentos([prosa(["Las ejecuciones del runner."])])).toEqual([]);
  });
});
