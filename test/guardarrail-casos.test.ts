import { describe, expect, it } from "vitest";
import {
  problemasDelArbolDeCasos,
  type CasoEnDisco as CasoParaValidar,
} from "../src/guardarrail-casos.js";

/** Un Caso bien formado (Caso-componente). */
const casoOk = (overrides: Partial<CasoParaValidar> = {}): CasoParaValidar => ({
  ruta: "casos/implement-component/componente/boton-primario",
  skill: "implement-component",
  tipo: "componente",
  id: "boton-primario",
  tienePrompt: true,
  tieneChecks: true,
  tieneRubric: true,
  ...overrides,
});

describe("problemasDelArbolDeCasos", () => {
  it("no señala nada si todos los Casos están bien formados", () => {
    expect(problemasDelArbolDeCasos([casoOk()])).toEqual([]);
  });

  it("señala un Caso sin rubric.md", () => {
    const hallazgos = problemasDelArbolDeCasos([casoOk({ tieneRubric: false })]);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toMatch(/rubric\.md/i);
    expect(hallazgos[0]).toContain("casos/implement-component/componente/boton-primario");
  });

  it("señala un Caso sin checks.json", () => {
    const hallazgos = problemasDelArbolDeCasos([casoOk({ tieneChecks: false })]);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toMatch(/checks\.json/i);
  });

  it("señala un Caso sin prompt.md", () => {
    const hallazgos = problemasDelArbolDeCasos([casoOk({ tienePrompt: false })]);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toMatch(/prompt\.md/i);
  });

  it("señala una carpeta con un tipo de Caso desconocido", () => {
    const hallazgos = problemasDelArbolDeCasos([
      casoOk({ tipo: "otro", ruta: "casos/implement-component/otro/x" }),
    ]);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toMatch(/tipo/i);
  });

  it("señala un Caso-página sin Gold-HTML", () => {
    const hallazgos = problemasDelArbolDeCasos([
      casoOk({
        tipo: "pagina",
        ruta: "casos/implement-pattern/pagina/paso-1",
        tieneGold: false,
      }),
    ]);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toMatch(/gold\.html/i);
  });

  it("no exige Gold a un Caso-decisión", () => {
    const hallazgos = problemasDelArbolDeCasos([
      casoOk({
        tipo: "decision",
        ruta: "casos/choose-library/decision/portal",
        tieneGold: false,
      }),
    ]);
    expect(hallazgos).toEqual([]);
  });

  it("acumula varios hallazgos del mismo Caso", () => {
    const hallazgos = problemasDelArbolDeCasos([
      casoOk({ tieneChecks: false, tieneRubric: false }),
    ]);
    expect(hallazgos).toHaveLength(2);
  });

  it("señala un Caso con un checks.json que no carga (mensaje del loader)", () => {
    const hallazgos = problemasDelArbolDeCasos([
      casoOk({ errorDeCarga: 'Caso inválido: checks.json malformado (...)' }),
    ]);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toMatch(/checks\.json/i);
  });
});
