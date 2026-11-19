import { describe, expect, it } from "vitest";
import {
  PENDIENTES_DE_ANCLAR,
  deudaDeAnclaje,
  idsDeChecksCitadosEnRubric,
  problemasDeLaListaDePendientes,
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
  // Cada test de aquí mide la coherencia rúbrica↔checks; los Checks van todos
  // anclados para que no se cuele el hallazgo de «Check sin ancla», que tiene su
  // propio describe (ticket 06).
  const conChecks = (ids: string[]): CasoParaValidar =>
    casoOk({
      idsDeChecks: ids,
      anclas: new Map(ids.map((id) => [id, { skill: "desy-styles-reference", seccion: "X" }])),
      seccionesPorSkill: new Map([["desy-styles-reference", new Set(["X"])]]),
    });

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
  const SECCION = { skill: "desy-styles-reference", seccion: "Componentes con `c-*` (bloques UI completos)" };
  const conAnclas = (
    anclas: [string, { skill: string; seccion: string }][],
    over: Partial<CasoParaValidar> = {},
  ): CasoParaValidar =>
    casoOk({
      // Todos los Checks del Caso anclados salvo que el test diga otra cosa: cada
      // test de aquí mide **una** regla, no la falta de anclaje (que tiene la suya).
      idsDeChecks: anclas.map(([id]) => id),
      anclas: new Map(anclas),
      seccionesPorSkill: new Map([
        ["desy-styles-reference", new Set(["Componentes con `c-*` (bloques UI completos)"])],
      ]),
      ...over,
    });

  it("no señala nada si el ancla nombra un Check del Caso y una sección que existe", () => {
    const hallazgos = problemasDelArbolDeCasos([
      conAnclas([["variante-primaria", SECCION]]),
    ]);

    expect(hallazgos).toEqual([]);
  });

  it("señala un ancla a un Check que el Caso no tiene: sería una sección citada por nadie", () => {
    const hallazgos = problemasDelArbolDeCasos([
      conAnclas([
        ["variante-antigua", SECCION],
        ["variante-primaria", SECCION],
      ], { idsDeChecks: ["variante-primaria"] }),
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

  it("señala los Checks de un Caso que no tienen ancla, uno a uno", () => {
    // El caso de la retro: el Caso tiene 3 Checks y su rubric.md los describe en
    // prosa de apoyo, sin una línea de ancla por Check. Antes era silencio.
    const hallazgos = problemasDelArbolDeCasos([
      conAnclas([["uno", { skill: "desy-styles-reference", seccion: "X" }]], {
        idsDeChecks: ["uno", "dos", "tres"],
        seccionesPorSkill: new Map([["desy-styles-reference", new Set(["X"])]]),
      }),
    ]);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("no ancla 2 de sus 3 Check/s");
    expect(hallazgos[0]).toContain("dos, tres");
    // El que sí está anclado no se nombra como falta.
    expect(hallazgos[0]).not.toContain("(uno,");
  });

  it("señala todos los Checks cuando ninguno está anclado", () => {
    const hallazgos = problemasDelArbolDeCasos([
      casoOk({ idsDeChecks: ["a", "b"], anclas: undefined, seccionesPorSkill: new Map() }),
    ]);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("no ancla 2 de sus 2");
  });

  it("no señala la falta de ancla de un Caso que no declara Checks", () => {
    expect(problemasDelArbolDeCasos([casoOk({ idsDeChecks: [] })])).toEqual([]);
  });

  it("no señala un Caso cuyos Checks están todos anclados", () => {
    const hallazgos = problemasDelArbolDeCasos([conAnclas([["variante-primaria", SECCION]])]);

    expect(hallazgos).toEqual([]);
  });

  it("tolera los Checks sin ancla de un Caso que está en PENDIENTES_DE_ANCLAR", () => {
    // Deuda declarada: el pendiente existe, pero no rompe el build mientras esté
    // nombrado. El script lo anuncia aparte.
    const [ruta] = [...PENDIENTES_DE_ANCLAR.keys()];
    const hallazgos = problemasDelArbolDeCasos([
      casoOk({ ruta, idsDeChecks: ["a", "b"], anclas: undefined }),
    ]);

    expect(hallazgos).toEqual([]);
  });

  it("un Caso que NO está en la lista y no ancla sus Checks sigue siendo un rojo", () => {
    const hallazgos = problemasDelArbolDeCasos([
      casoOk({ ruta: "casos/skill-nuevo/decision/caso-nuevo", idsDeChecks: ["a"] }),
    ]);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("no ancla 1 de sus 1");
  });
});

describe("contradicciones declaradas del Caso (ticket 13)", () => {
  const SECCION = { skill: "desy-styles-reference", seccion: "Espaciado (escala de tokens del proyecto)" };
  const conContradicciones = (
    contradicciones: [string, { skill: string; seccion: string; texto: string }][],
    over: Partial<CasoParaValidar> = {},
  ): CasoParaValidar =>
    casoOk({
      idsDeChecks: ["espaciado-del-sistema"],
      anclas: new Map([["espaciado-del-sistema", SECCION]]),
      contradicciones: new Map(contradicciones),
      seccionesPorSkill: new Map([
        ["desy-styles-reference", new Set(["Espaciado (escala de tokens del proyecto)"])],
        ["desy-implement-layout-patterns", new Set(["Grid responsivo del formulario"])],
      ]),
      ...over,
    });

  const REAL = {
    skill: "desy-implement-layout-patterns",
    seccion: "Grid responsivo del formulario",
    texto: "el skill dice «`gap-x-4`»",
  };

  it("no señala nada si la contradicción nombra un Check del Caso y una sección que existe", () => {
    expect(
      problemasDelArbolDeCasos([conContradicciones([["espaciado-del-sistema", REAL]])]),
    ).toEqual([]);
  });

  it("señala una contradicción que cita una sección fantasma: es un error, no un hallazgo", () => {
    const hallazgos = problemasDelArbolDeCasos([
      conContradicciones([
        ["espaciado-del-sistema", { ...REAL, seccion: "Una sección que nadie escribió" }],
      ]),
    ]);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("Una sección que nadie escribió");
    expect(hallazgos[0]).toMatch(/no tiene esa sección/);
  });

  it("señala una contradicción sobre un Check que el Caso no tiene", () => {
    const hallazgos = problemasDelArbolDeCasos([
      conContradicciones([["espaciado-primario", REAL]]),    ]);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("espaciado-primario");
    expect(hallazgos[0]).toMatch(/el Caso no tiene/);
  });

  it("sin contradicciones declaradas no se señala nada: no es un gate", () => {
    expect(problemasDelArbolDeCasos([conContradicciones([])])).toEqual([]);
  });
});

describe("problemasDeLaListaDePendientes: la deuda declarada no miente", () => {
  /** Los 13 pendientes, para que no salgan como fantasmas los que no mido. */
  const todosLosPendientes = (over: Partial<CasoParaValidar> = {}): CasoParaValidar[] =>
    [...PENDIENTES_DE_ANCLAR.keys()].map((ruta) =>
      casoOk({ ruta, idsDeChecks: ["a"], anclas: undefined, ...over }),
    );

  it("un pendiente que no está en el árbol es un fantasma, y se señala", () => {
    const [ruta] = [...PENDIENTES_DE_ANCLAR.keys()];
    const hallazgos = problemasDeLaListaDePendientes(todosLosPendientes().slice(1));

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain(ruta!);
    expect(hallazgos[0]).toContain("quítalo de la lista");
  });

  it("un pendiente que ya ancla todos sus Checks sobra, y se señala", () => {
    const [ruta] = [...PENDIENTES_DE_ANCLAR.keys()];
    const casos = todosLosPendientes().map((caso) =>
      caso.ruta === ruta
        ? { ...caso, anclas: new Map([["a", { skill: "s", seccion: "x" }]]) }
        : caso,
    );
    const hallazgos = problemasDeLaListaDePendientes(casos);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("ya ancla sus 1 Check/s");
  });

  it("un pendiente que sigue sin anclar no se señala: ésa es la deuda real", () => {
    expect(problemasDeLaListaDePendientes(todosLosPendientes())).toEqual([]);
  });
});

describe("deudaDeAnclaje: la deuda se mide por Check, no por ruta (retro del ticket 07)", () => {
  /** Los 13 pendientes, igual que en los tests de la lista: los que no mido existen. */
  const todosLosPendientes = (over: Partial<CasoParaValidar> = {}): CasoParaValidar[] =>
    [...PENDIENTES_DE_ANCLAR.keys()].map((ruta) =>
      casoOk({ ruta, idsDeChecks: ["a"], anclas: undefined, ...over }),
    );

  const [primera] = [...PENDIENTES_DE_ANCLAR.keys()];
  const deudaDel = (caso: CasoParaValidar): ReturnType<typeof deudaDeAnclaje> =>
    deudaDeAnclaje([caso]).filter((d) => d.ruta === caso.ruta);

  it("dice cuántos Checks le faltan a un pendiente y cuáles son", () => {
    const deuda = deudaDel(casoOk({ ruta: primera!, idsDeChecks: ["a", "b", "c"] }));

    expect(deuda).toHaveLength(1);
    expect(deuda[0]).toMatchObject({
      ruta: primera,
      ticket: PENDIENTES_DE_ANCLAR.get(primera!),
      ancladas: 0,
      total: 3,
      sinAncla: ["a", "b", "c"],
    });
  });

  it("un pendiente a medio anclar sigue en la deuda, con el progreso", () => {
    // El agujero que esto cierra: `problemasDeChecksSinAncla` tolera el Caso
    // entero por estar en la lista, así que 1 de 2 anclados pasaba por «sin
    // deuda igual». Aquí se ve que queda la mitad, **por la vía pública**: el
    // guardarraíl sigue callado (la lista lo tolera) y la deuda lo dice.
    const medio = casoOk({
      ruta: primera!,
      idsDeChecks: ["a", "b"],
      anclas: new Map([["a", { skill: "s", seccion: "x" }]]),
    });

    expect(deudaDel(medio)[0]).toMatchObject({ ancladas: 1, total: 2, sinAncla: ["b"] });
    expect(
      problemasDelArbolDeCasos(
        todosLosPendientes().map((caso) => (caso.ruta === primera ? medio : caso)),
      ),
    ).toEqual([]);
  });

  it("un pendiente ya anclado del todo no es deuda (y la lista lo delata como sobrante)", () => {
    const completo = casoOk({
      ruta: primera!,
      idsDeChecks: ["a"],
      anclas: new Map([["a", { skill: "s", seccion: "x" }]]),
    });

    expect(deudaDel(completo)).toEqual([]);
    expect(
      problemasDeLaListaDePendientes(
        todosLosPendientes().map((caso) => (caso.ruta === primera ? completo : caso)),
      ),
    ).toHaveLength(1);
  });

  it("la tolerancia por ruta y la medida por Check no pueden discrepar", () => {
    // Control: un Caso **fuera** de la lista con la misma mitad anclada sí da
    // rojo. Sin esto, el verde de arriba podría ser un guardarraíl apagado.
    const medioFuera = casoOk({
      ruta: "casos/skill-nuevo/decision/caso-nuevo",
      idsDeChecks: ["a", "b"],
      anclas: new Map([["a", { skill: "s", seccion: "x" }]]),
    });

    expect(problemasDelArbolDeCasos([medioFuera])).toHaveLength(1);
    expect(deudaDel(medioFuera)).toEqual([]);
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
