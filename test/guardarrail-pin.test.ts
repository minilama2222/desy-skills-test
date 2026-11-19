import { describe, expect, it } from "vitest";
import {
  EXCLUIDOS_DEL_HASH,
  cuentaParaElHash,
  hashDelArbol,
  problemasDelArbolSucio,
} from "../src/guardarrail-pin.js";

/**
 * Ticket 04 (bucle-de-refinamiento): el Pin no puede mentir. El hash identifica
 * QUÉ skills se midieron; el guardarraíl impide medir un árbol sucio.
 */

describe("hashDelArbol: la identidad de una versión de skills", () => {
  const arbol = [
    { ruta: "desy-preflight-check/SKILL.md", contenido: "paso 0" },
    { ruta: "desy-implement-component/SKILL.md", contenido: "usa macros" },
  ];

  it("es estable entre llamadas con el mismo contenido", () => {
    expect(hashDelArbol(arbol)).toBe(hashDelArbol(arbol));
  });

  it("no depende del orden en que el FS enumeró los ficheros", () => {
    expect(hashDelArbol(arbol)).toBe(hashDelArbol([...arbol].reverse()));
  });

  it("cambia si cambia un solo byte de un SKILL.md", () => {
    const mutado = arbol.map((f) =>
      f.ruta === "desy-implement-component/SKILL.md"
        ? { ...f, contenido: "usa macroz" }
        : f,
    );

    expect(hashDelArbol(mutado)).not.toBe(hashDelArbol(arbol));
  });

  it("cambia si se añade un fichero", () => {
    expect(hashDelArbol([...arbol, { ruta: "nuevo/SKILL.md", contenido: "x" }])).not.toBe(
      hashDelArbol(arbol),
    );
  });

  it("EXCLUYE assets/catalog.json: refrescar el catálogo no es cambiar la versión", () => {
    const conCatalogo = [
      ...arbol,
      { ruta: "desy-component-recognizer/assets/catalog.json", contenido: "{}" },
    ];
    const otroCatalogo = [
      ...arbol,
      { ruta: "desy-component-recognizer/assets/catalog.json", contenido: '{"x":1}' },
    ];

    expect(hashDelArbol(conCatalogo)).toBe(hashDelArbol(arbol));
    expect(hashDelArbol(otroCatalogo)).toBe(hashDelArbol(arbol));
  });

  it("un árbol vacío tiene hash (no explota)", () => {
    expect(hashDelArbol([])).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("cuentaParaElHash", () => {
  it("cuenta los SKILL.md de cualquier skill", () => {
    expect(cuentaParaElHash("desy-styles-reference/SKILL.md")).toBe(true);
  });

  it("no cuenta el catálogo, que está en la lista de excluidos", () => {
    expect(cuentaParaElHash(EXCLUIDOS_DEL_HASH[0]!)).toBe(false);
  });
});

describe("problemasDelArbolSucio: no se mide un árbol sucio", () => {
  it("un árbol limpio no da hallazgos", () => {
    expect(problemasDelArbolSucio("", "vendor/desy-skills")).toEqual([]);
    expect(problemasDelArbolSucio("\n  \n", "vendor/desy-skills")).toEqual([]);
  });

  it("un SKILL.md modificado da un hallazgo que nombra el fichero", () => {
    const hallazgos = problemasDelArbolSucio(
      " M skills/desy-implement-component/SKILL.md\n",
      "vendor/desy-skills",
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("skills/desy-implement-component/SKILL.md");
    expect(hallazgos[0]).toMatch(/sin commitear/);
  });

  it("lista todos los cambios, no sólo el primero", () => {
    const hallazgos = problemasDelArbolSucio(
      " M skills/a/SKILL.md\n?? skills/b/SKILL.md\n",
      "vendor/desy-skills",
    );

    expect(hallazgos[0]).toContain("skills/a/SKILL.md");
    expect(hallazgos[0]).toContain("skills/b/SKILL.md");
    expect(hallazgos[0]).toContain("2 cambio");
  });

  it("un cambio ya preparado para commit no es un árbol sucio", () => {
    // `bump-pin` reescribe `vendor/` y lo deja preparado: si esto contara como
    // sucio, el pre-commit se bloquearía a sí mismo y el bump nunca podría
    // entrar, que es justo el commit que reconcilia el vendor con su pin.
    expect(
      problemasDelArbolSucio("M  skills/desy-implement-layout-patterns/SKILL.md\n", "vendor/desy-skills"),
    ).toEqual([]);
  });

  it("el árbol sucio se sigue cazando aunque haya además un cambio preparado", () => {
    // Control: quitar lo preparado no puede llevarse por delante lo sucio.
    const hallazgos = problemasDelArbolSucio(
      "M  skills/a/SKILL.md\n M skills/b/SKILL.md\n",
      "vendor/desy-skills",
    );

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("skills/b/SKILL.md");
    expect(hallazgos[0]).not.toContain("skills/a/SKILL.md");
  });
});
