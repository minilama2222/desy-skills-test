import { describe, expect, it } from "vitest";
import {
  casosDeclaradosEnReadme,
  problemasDeEnlaces,
  problemasDelReadme,
} from "../src/guardarrail-readme.js";

describe("casosDeclaradosEnReadme", () => {
  it("lee el número declarado en la forma canónica `**N** Casos`", () => {
    expect(casosDeclaradosEnReadme("Hay **7** Casos:")).toBe(7);
  });

  it("acepta el singular `Caso`", () => {
    expect(casosDeclaradosEnReadme("Hay **1** Caso:")).toBe(1);
  });

  it("devuelve undefined si no hay declaración", () => {
    expect(casosDeclaradosEnReadme("Los Casos viven en casos/.")).toBeUndefined();
  });

  it("no confunde el prefijo de otra cifra", () => {
    expect(casosDeclaradosEnReadme("Hay **17** Casos:")).toBe(17);
  });
});

describe("problemasDeEnlaces", () => {
  const existe = (ruta: string): boolean => ruta === "./GLOSSARY.md" || ruta === "./docs/adr/";

  it("no señala un enlace relativo cuya ruta existe", () => {
    expect(
      problemasDeEnlaces("README.md", "[glosario](./GLOSSARY.md) y [adr](./docs/adr/)", existe),
    ).toEqual([]);
  });

  it("señala un enlace relativo cuya ruta no existe", () => {
    const hallazgos = problemasDeEnlaces("README.md", "[bucle](./.scratch/no-existe/)", existe);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("./.scratch/no-existe/");
  });

  it("mira el fichero, no el ancla: una sección se renombra sin mover el fichero", () => {
    // El ancla es prosa y se lee a ojo; lo que el guardarraíl puede afirmar es que
    // la ruta existe. Si mirarse el ancla fuese regla, este caso sería un hallazgo.
    expect(problemasDeEnlaces("README.md", "[glosario](./GLOSSARY.md#lo-que-sea)", existe)).toEqual([]);
  });

  it("no mira las URL absolutas", () => {
    expect(
      problemasDeEnlaces("README.md", "[desy](https://github.com/minilama2222/desy-skills)", existe),
    ).toEqual([]);
  });

  it("enumera un enlace por hallazgo, no uno por README", () => {
    const readme = "[a](./no-a.md) y [b](./no-b.md)";
    // El segundo control: con dos rotos, dos hallazgos. Que la regla enumere es lo
    // que evita arreglar uno y dar el otro por bueno.
    const hallazgos = problemasDeEnlaces("README.md", readme, existe);

    expect(hallazgos.map((h) => (h.includes("no-a") ? "a" : "b"))).toEqual(["a", "b"]);
  });

  it("no se rompe con una ruta cuyo `%` está mal formado: la deja tal cual y la señala", () => {
    // Antes el adaptador hacía `decodeURIComponent` y una ruta con `%zz` lanzaba
    // `URIError`: el guardarraíl reventaba en vez de dar un hallazgo. La regla
    // devuelve hallazgos, no excepciones.
    const hallazgos = problemasDeEnlaces("README.md", "[x](./a%zz.md)", existe);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("./a%zz.md");
  });

  it("decodifica la ruta antes de preguntar: `%20` es un espacio del fichero", () => {
    const existeConEspacio = (ruta: string): boolean => ruta === "./mi fichero.md";

    expect(problemasDeEnlaces("README.md", "[x](./mi%20fichero.md)", existeConEspacio)).toEqual([]);
  });
});

describe("problemasDelReadme", () => {
  it("no señala nada cuando el conteo declarado coincide con el disco", () => {
    const hallazgos = problemasDelReadme("Hay **7** Casos:", 7);
    expect(hallazgos).toEqual([]);
  });

  it("señala un conteo desactualizado (disco con más Casos que el README)", () => {
    const hallazgos = problemasDelReadme("Hay **5** Casos:", 7);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toMatch(/declara 5/i);
    expect(hallazgos[0]).toMatch(/7/);
  });

  it("señala un conteo desactualizado (disco con menos Casos que el README)", () => {
    const hallazgos = problemasDelReadme("Hay **7** Casos:", 5);
    expect(hallazgos).toHaveLength(1);
  });

  it("señala que falta la declaración del conteo", () => {
    const hallazgos = problemasDelReadme("Los Casos viven en casos/.", 7);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toMatch(/no declara/i);
  });
});
