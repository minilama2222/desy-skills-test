import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pruebasQueAfirmanContenidoDelArbol } from "../src/guardarrail-tests.js";
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
