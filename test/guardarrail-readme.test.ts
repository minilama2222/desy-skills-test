import { describe, expect, it } from "vitest";
import {
  casosDeclaradosEnReadme,
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
