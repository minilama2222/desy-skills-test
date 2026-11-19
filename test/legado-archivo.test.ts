import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { REPO_ROOT } from "../src/repo.js";

/**
 * Ticket 10 (bucle de refinamiento): el archivo de legado **existe** en el árbol
 * del repo, y lo que el ticket pide como resultado visible es verdad de cada
 * fichero, no de un ejemplo: las dos corridas están, cada fichero lleva su
 * cabecera con la regla con la que se midió, y el README del archivo explica su
 * SUSPENDE.
 *
 * Lo copiado **es de antes** y coincide byte a byte con la evidencia: eso no se
 * puede afirmar aquí desde el original (vive en `reports/`, ignorado, y la suite
 * lo vacía), así que lo fija el script sobre un `reports/` temporal
 * (`test/archivar-legado.test.ts`) y la columna `copiado de` de cada cabecera.
 */

const LEGADO = join(REPO_ROOT, "reports", "legado");

/**
 * Las corridas que conserva el archivo. Las dos primeras se pueden re-graduar con
 * su fichero delante y dicen con qué regla contaban las entregas entonces; la
 * tercera es `soloLectura` (ticket 18): su árbol no se conservó y la cabecera dice
 * lo que **no** se puede afirmar, en vez de afirmarlo.
 */
const CORRIDAS = ["suite-2026-10-27", "estabilidad-2026-10-22", "suite-2026-11-18-macro-comentado"];

/** Las que se midieron con el ADR-0007, cuyo SUSPENDE no significa lo de hoy. */
const CORRIDAS_CON_REGLA_DE_MEDIDA = ["suite-2026-10-27", "estabilidad-2026-10-22"];

/** Todas las rutas bajo `dir`, relativa y con `/`, ordenadas. */
function rutasDe(dir: string): string[] {
  const rutas: string[] = [];
  const visitar = (actual: string): void => {
    for (const entry of readdirSync(actual, { withFileTypes: true })) {
      const full = join(actual, entry.name);
      const rel = relative(dir, full).split("\\").join("/");
      if (entry.isDirectory()) visitar(full);
      else rutas.push(rel);
    }
  };
  if (existsSync(dir)) visitar(dir);
  return rutas.sort();
}

describe("reports/legado/: el archivo está, y es de antes (ticket 10)", () => {
  it("tiene el README del archivo y las dos corridas archivadas", () => {
    const rutas = rutasDe(LEGADO);

    expect(rutas).toContain("README.md");
    for (const corrida of CORRIDAS) {
      expect(rutas, corrida).toContain(`${corrida}/LEGADO.md`);
    }
  });

  it("cada fichero de una corrida lleva al lado su cabecera, con la regla con la que se midió", () => {
    // El criterio del ticket, aplicado a todos: una cabecera por fichero
    // archivado, y en ella la regla. `LEGADO.md` es la de la corrida; el resto
    // tiene `<fichero>.LEGADO.md`.
    let comprobadas = 0;
    for (const corrida of CORRIDAS) {
      for (const rel of rutasDe(join(LEGADO, corrida)).filter(
        (f) => !f.endsWith(".LEGADO.md") && f !== "LEGADO.md",
      )) {
        const cabecera = join(LEGADO, corrida, `${rel}.LEGADO.md`);
        expect(existsSync(cabecera), `${corrida}/${rel}`).toBe(true);
        expect(readFileSync(cabecera, "utf8"), `${corrida}/${rel}`).toContain("- regla de medida: **");
        comprobadas++;
      }
    }
    // Si el archivo se vaciara, el bucle de arriba no comprobaría nada. Los 13:
    // 4 del 27/10 (scorecard + 3 Ejecuciones), 6 del 22/10 (3 Ejecuciones,
    // 2 capturas de fuente y el resumen) y 3 del 18/11 (scorecard + 2 Ejecuciones).
    expect(comprobadas).toBe(13);
  });

  it("conserva la evidencia de los dos HALLAZGOS (el porqué, no sólo las cabeceras)", () => {
    const rutas = rutasDe(LEGADO);

    // La fuente exacta del Caso que destapó «los guards de macro leen el
    // artefacto equivocado» (HALLAZGO-guards-macro-artefacto.md): sin ella, el
    // archivo es un resumen y no evidencia.
    expect(rutas).toContain("estabilidad-2026-10-22/ejecucion-1-fuente.txt");
    // Y el Scorecard de la primera suite real, con su SUSPENDE y sus cuentas.
    expect(rutas).toContain("suite-2026-10-27/scorecard.json");
  });

  it("ninguna cabecera presenta el archivo como una versión", () => {
    for (const corrida of CORRIDAS) {
      const cabecera = readFileSync(join(LEGADO, corrida, "LEGADO.md"), "utf8");
      expect(cabecera, corrida).not.toMatch(/arbolHash/);
      expect(cabecera, corrida).toMatch(/origen: `reports\//);
      expect(cabecera, corrida).toContain("Este directorio no se compara");
    }
  });

  it("la cabecera de cada corrida dice qué significaba entonces el Caso sin entregas", () => {
    // Las dos se midieron con la MISMA regla (el ADR-0007), y eso es el dato: el
    // bucle no nace de dos reglas distintas. La cabecera lo dice igual en las dos.
    for (const corrida of CORRIDAS_CON_REGLA_DE_MEDIDA) {
      const cabecera = readFileSync(join(LEGADO, corrida, "LEGADO.md"), "utf8");
      expect(cabecera, corrida).toContain("era **SUSPENDE**");
      expect(cabecera, corrida).toContain("ADR-0007");
    }
    // Y el aviso de que hoy no significa lo mismo va donde hay veredictos de los
    // que hablar: el Scorecard del 27/10. La carpeta del 22/10 no trae ninguno.
    const suite = readFileSync(join(LEGADO, "suite-2026-10-27/LEGADO.md"), "utf8");
    expect(suite).toContain("**INDETERMINADO**, no SUSPENDE");
  });

  it("la del 18/11 no dice con qué regla iban las entregas: su árbol no se conservó", () => {
    // `archivoHash` es una cadena alfanumérica: el nombre del campo, escrito
    // aquí como ruta de código, no es dato de ningún fichero del repo.
    const soloLectura = readFileSync(join(LEGADO, "suite-2026-11-18-macro-comentado/LEGADO.md"), "utf8");

    expect(soloLectura).toContain("no se puede re-graduar");
    expect(soloLectura).toContain("No se puede afirmar:");
    expect(soloLectura).not.toContain("## Con qué regla se midió");
    expect(soloLectura).not.toContain("era **INDETERMINADO**");
  });

  it("la del 27/10 habla de sus veredictos; la del 22/10, de su Ejecución y su tasa", () => {
    // El error que corrigió la review: decir «su SUSPENDE» de una carpeta que
    // no trae ninguno. El Scorecard del 27/10 sí lo trae; el del 22/10, no.
    const suite = readFileSync(join(LEGADO, "suite-2026-10-27/LEGADO.md"), "utf8");
    const estabilidad = readFileSync(join(LEGADO, "estabilidad-2026-10-22/LEGADO.md"), "utf8");

    expect(suite).toContain("## Lo que significan sus veredictos");
    expect(suite).toContain("| boton-primario | SUSPENDE | — | 3 | 0 | 0 | 2 |");
    expect(estabilidad).not.toContain("## Lo que significan sus veredictos");
    // La cifra que sostiene el bucle, leída del resumen.
    expect(estabilidad).toContain("**1 de 3** Ejecuciones entregaron Artefacto");
  });

  it("la Ejecución que entregó dice de sí misma que acertó, no un SUSPENDE que no tiene", () => {
    const ejecucion = readFileSync(
      join(LEGADO, "estabilidad-2026-10-22/ejecucion-2.json.LEGADO.md"),
      "utf8",
    );

    expect(ejecucion).toContain("## Qué hizo esta Ejecución");
    expect(ejecucion).toContain("Grade: **EXCELENTE**");
    expect(ejecucion).toContain("Entrega: `con-artefacto`");
    // Y no le adjudica un veredicto de Caso que una Ejecución no tiene.
    expect(ejecucion).not.toContain("## Lo que significan sus veredictos");
  });

  it("el README del legado explica que su SUSPENDE no significa lo de hoy", () => {
    const readme = readFileSync(join(LEGADO, "README.md"), "utf8");

    expect(readme).toMatch(/SUSPENDE/);
    expect(readme).toMatch(/INDETERMINADO/);
    // Y dice dónde está lo que sí se compara.
    expect(readme).toContain("reports/versiones/");
  });
});
