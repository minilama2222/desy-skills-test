import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pruebasQueAfirmanContenidoDelArbol, pruebasQueTomanConstantesDeDatos } from "../src/guardarrail-tests.js";
import { REPO_ROOT } from "../src/repo.js";

/**
 * Retro del ticket 08: el mismo género apareció dos veces —un test que afirmaba el
 * **texto** de un `SKILL.md` del `vendor/`—, así que la regla se vuelve mecánica.
 * El test se escribió mirando el caso que la review rechazó, y se vio en rojo
 * contra `scripts/verificar-tests.ts` sin la llamada a la regla.
 */
describe("pruebasQueAfirmanContenidoDelArbol: leer el árbol para afirmar su texto", () => {
  it("marca un test que lee un SKILL.md del vendor", () => {
    const [hallazgo] = pruebasQueAfirmanContenidoDelArbol([
      {
        path: "test/ejemplo.test.ts",
        contenido: [
          'import { VENDOR_SKILLS_DIR } from "../src/runner.js";',
          'const md = readFileSync(join(VENDOR_SKILLS_DIR, "x", "SKILL.md"), "utf8");',
          "expect(md).toContain('gap-x-4');",
        ].join("\n"),
      },
    ]);

    expect(hallazgo).toBeDefined();
    expect(hallazgo).toContain("test/ejemplo.test.ts");
    expect(hallazgo).toContain("VENDOR_SKILLS_DIR");
  });

  it("marca también el lector de secciones y el de SKILL.md, que devuelven texto del árbol", () => {
    for (const marcador of ["lectorDeSecciones", "lectorDeSkillMd", "CASOS_DIR"]) {
      expect(
        pruebasQueAfirmanContenidoDelArbol([
          { path: "test/x.test.ts", contenido: `${marcador}(dir); readFileSync(p);` },
        ]),
        marcador,
      ).toHaveLength(1);
    }
  });

  it("no marca a quien nombra el árbol para montar un sandbox: sin leer no hay texto que afirmar", () => {
    // El control positivo: `copySkills()` copia el vendor, y eso no afirma su
    // texto. Sin `readFileSync` en el fichero, la regla calla.
    expect(
      pruebasQueAfirmanContenidoDelArbol([
        {
          path: "test/runner.test.ts",
          contenido:
            'import { VENDOR_SKILLS_DIR } from "../src/runner.js";\nsandbox.copySkills(VENDOR_SKILLS_DIR);',
        },
      ]),
    ).toEqual([]);
  });

  it("no marca a quien lee un fichero que no es del árbol", () => {
    expect(
      pruebasQueAfirmanContenidoDelArbol([
        {
          path: "test/y.test.ts",
          contenido: 'const x = readFileSync(join(dir, "a.json"), "utf8");',
        },
      ]),
    ).toEqual([]);
  });

  it("el tier rápido ya no lee el árbol: es el caso que originó la regla", () => {
    const contenido = readFileSync(join(REPO_ROOT, "test", "tier-rapido.test.ts"), "utf8");
    expect(
      pruebasQueAfirmanContenidoDelArbol([{ path: "test/tier-rapido.test.ts", contenido }]),
    ).toEqual([]);
  });
});

/**
 * Retro de la sesión del ticket 12: seis tests de `guardarrail-casos` armaban sus
 * casos desde `PENDIENTES_DE_ANCLAR`, y vaciar la lista los puso rojos con el
 * producto correcto. Es la hermana de la regla del árbol, por otra puerta: una
 * constante de `src/` que cambia con el contenido del repo.
 */
describe("pruebasQueTomanConstantesDeDatos: el fixture no sale del producto", () => {
  it("marca un test que recorre los pendientes reales para armar sus casos", () => {
    // El caso que originó la regla, copiado de `guardarrail-casos.test.ts`.
    const [hallazgo] = pruebasQueTomanConstantesDeDatos([
      {
        path: "test/ejemplo.test.ts",
        contenido: [
          'import { PENDIENTES_DE_ANCLAR } from "../src/guardarrail-casos.js";',
          "const todos = [...PENDIENTES_DE_ANCLAR.keys()].map((ruta) => casoOk({ ruta }));",
        ].join("\n"),
      },
    ]);

    expect(hallazgo).toBeDefined();
    expect(hallazgo).toContain("PENDIENTES_DE_ANCLAR");
    expect(hallazgo).toContain("fixture");
  });

  it("marca los ids del Framework, que son datos y no configuración", () => {
    expect(
      pruebasQueTomanConstantesDeDatos([
        { path: "test/x.test.ts", contenido: "for (const id of IDS_DEL_FRAMEWORK) {}" },
      ]),
    ).toHaveLength(1);
  });

  it("no marca a quien arma su fixture con datos propios", () => {
    // El control positivo: el mismo recorrido, sobre una lista de prueba.
    expect(
      pruebasQueTomanConstantesDeDatos([
        {
          path: "test/guardarrail-casos.test.ts",
          contenido:
            'const RUTAS = ["casos/skill-a/decision/caso-a"];\n' +
            "const todos = RUTAS.map((ruta) => casoOk({ ruta }));",
        },
      ]),
    ).toEqual([]);
  });

  it("no marca la configuración: una ruta o un repo por defecto no es contenido", () => {
    expect(
      pruebasQueTomanConstantesDeDatos([
        {
          path: "test/y.test.ts",
          contenido: "expect(DEFAULT_REPO).toContain('github'); expect(CASOS_DIR).toBe(x);",
        },
      ]),
    ).toEqual([]);
  });
});
