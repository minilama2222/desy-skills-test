import { describe, expect, it } from "vitest";
import {
  idsDeChecksCitadosEnRubric,
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

describe("coherencia rúbrica ↔ checks.json", () => {
  const conChecks = (ids: string[]): CasoParaValidar =>
    casoOk({ idsDeChecks: ids });

  it("no señala nada si la rúbrica nombra exactamente los checks del Caso", () => {
    const caso = conChecks(["token-base-16px", "token-lg-28px"]);
    const rubric = [
      "## Guards",
      "- **token-base-16px**: el token de 16 px.",
      "- **token-lg-28px**: el token de 28 px.",
    ].join("\n");
    expect(problemasDelArbolDeCasos([{ ...caso, textoRubric: rubric }])).toEqual([]);
  });

  it("señala un check del Caso que la rúbrica no documenta", () => {
    // Es el fallo de esta sesión: el checks.json cambió y la rúbrica se quedó
    // describiendo los ids anteriores. Se señalan las dos direcciones: los que
    // faltan y el que sobra.
    const caso = conChecks(["token-base-16px", "familia-gap-base"]);
    const otro: CasoParaValidar = {
      ...conChecks(["token-lg-28px"]),
      ruta: "casos/otro-skill/decision/otro-caso",
    };
    const rubric = [
      "## Quality",
      "- **token-base-16px**: el token de 16 px.",
      "- **token-lg-28px**: el token de 28 px.",
    ].join("\n");
    const hallazgos = problemasDelArbolDeCasos([
      { ...caso, textoRubric: rubric },
      otro,
    ]);

    expect(hallazgos).toHaveLength(2);
    const sinDocumentar = hallazgos.find((h) => /no documenta/.test(h))!;
    expect(sinDocumentar).toContain("familia-gap-base");
    const sobrante = hallazgos.find((h) => /ya no tiene/.test(h))!;
    expect(sobrante).toContain("token-lg-28px");
  });

  it("señala un id obsoleto que otro Caso del árbol sigue declarando", () => {
    // `token-lg-28px` vive en otro Caso: es lo que permite saber que el de la
    // rúbrica **es** un id, y por tanto que sobra en este.
    const caso = conChecks(["token-base-16px"]);
    const otro: CasoParaValidar = {
      ...conChecks(["token-lg-28px"]),
      ruta: "casos/otro-skill/decision/otro-caso",
    };
    const rubric = [
      "- **token-base-16px**: ok.",
      "- **token-lg-28px**: obsoleto en este Caso.",
    ].join("\n");
    const hallazgos = problemasDelArbolDeCasos([
      { ...caso, textoRubric: rubric },
      otro,
    ]);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("token-lg-28px");
  });

  it("un valor de dominio en negrita no es un id de check", () => {
    // `**desy-html**` es una librería, no un id: sólo los ids del Caso y los del
    // Framework se juzgan. Era un falso positivo real en `choose-library`.
    const caso = conChecks(["libreria-desy-html"]);
    const rubric = [
      "- **libreria-desy-html**: la recomendación es **desy-html**.",
      "**desy-angular** sería la decisión errónea.",
    ].join("\n");
    expect(problemasDelArbolDeCasos([{ ...caso, textoRubric: rubric }])).toEqual([]);
  });

  it("un id del Framework documentado en la rúbrica no se señala", () => {
    // El Framework añade `tokens-del-sistema` por tipo de Caso: documentarlo
    // está bien aunque no viva en el checks.json del Caso.
    const caso = conChecks(["token-base-16px"]);
    const rubric = [
      "- **token-base-16px**: ok.",
      "- **tokens-del-sistema**: ni escala numérica ni valores arbitrarios.",
    ].join("\n");
    expect(problemasDelArbolDeCasos([{ ...caso, textoRubric: rubric }])).toEqual([]);
  });

  it("una rúbrica en prosa que no nombra ids no se señala", () => {
    // Muchas rúbricas explican la idea sin citar el id del check: eso es prosa
    // válida, no una incoherencia.
    const caso = conChecks(["token-base-16px"]);
    const rubric = "## Guards\n- El SUT declara el token base para los 16 px.";
    expect(problemasDelArbolDeCasos([{ ...caso, textoRubric: rubric }])).toEqual([]);
  });

  it("con ids del Caso y sin texto de rúbrica no se señala (el loader ya avisa de lo que falta)", () => {
    expect(problemasDelArbolDeCasos([conChecks(["token-base-16px"])])).toEqual([]);
  });
});

describe("anclas de skill del Caso (ticket 06)", () => {
  const conAnclas = (
    anclas: [string, { skill: string; seccion: string }][],
    over: Partial<CasoParaValidar> = {},
  ): CasoParaValidar =>
    casoOk({
      idsDeChecks: ["variante-primaria"],
      anclas: new Map(anclas),
      seccionesPorSkill: new Map([
        ["desy-styles-reference", new Set(["Componentes con `c-*` (bloques UI completos)"])],
      ]),
      ...over,
    });

  it("no señala nada si el ancla nombra un Check del Caso y una sección que existe", () => {
    const hallazgos = problemasDelArbolDeCasos([
      conAnclas([
        [
          "variante-primaria",
          { skill: "desy-styles-reference", seccion: "Componentes con `c-*` (bloques UI completos)" },
        ],
      ]),
    ]);

    expect(hallazgos).toEqual([]);
  });

  it("señala un ancla a un Check que el Caso no tiene: sería una sección citada por nadie", () => {
    const hallazgos = problemasDelArbolDeCasos([
      conAnclas([["variante-antigua", { skill: "desy-styles-reference", seccion: "Componentes con `c-*` (bloques UI completos)" }]]),
    ]);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("variante-antigua");
    expect(hallazgos[0]).toMatch(/el Caso no tiene/);
  });

  it("señala un ancla a una sección que el SKILL.md no tiene", () => {
    const hallazgos = problemasDelArbolDeCasos([
      conAnclas([["variante-primaria", { skill: "desy-styles-reference", seccion: "Una sección que nadie escribió" }]]),
    ]);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("Una sección que nadie escribió");
    expect(hallazgos[0]).toMatch(/no tiene esa sección/);
  });

  it("señala un ancla a un skill que no está en el árbol medido", () => {
    const hallazgos = problemasDelArbolDeCasos([
      conAnclas([["variante-primaria", { skill: "desy-skill-que-no-existe", seccion: "X" }]]),
    ]);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("desy-skill-que-no-existe");
  });

  it("sin secciones del árbol no juzga la existencia (una prueba de un Caso aislado)", () => {
    const hallazgos = problemasDelArbolDeCasos([
      conAnclas([["variante-primaria", { skill: "desy-styles-reference", seccion: "Lo que sea" }]], {
        seccionesPorSkill: undefined,
      }),
    ]);

    expect(hallazgos).toEqual([]);
  });

  it("un Caso sin anclas no se señala: el ancla es opcional", () => {
    expect(problemasDelArbolDeCasos([casoOk()])).toEqual([]);
  });
});

describe("idsDeChecksCitadosEnRubric", () => {
  it("extrae los ids en negrita, ignorando la prosa en negrita", () => {
    const rubric = [
      "## Guards (su fallo ⇒ INACEPTABLE)",
      "- **token-base-16px**: el token de 16 px.",
      "- **no-escala-numerica** (peso 2): sin `gap-7`.",
      "**Nota**: la escala numérica no se comprueba con un negativo.",
    ].join("\n");

    expect(idsDeChecksCitadosEnRubric(rubric)).toEqual([
      "token-base-16px",
      "no-escala-numerica",
    ]);
  });

  it("no confunde los títulos en negrita con ids de check", () => {
    const rubric = [
      "**Status:** ok.",
      "**Rúbrica — styles-reference / token-espaciado**",
      "- **token-base-16px**: el token.",
    ].join("\n");

    expect(idsDeChecksCitadosEnRubric(rubric)).toEqual(["token-base-16px"]);
  });
});
