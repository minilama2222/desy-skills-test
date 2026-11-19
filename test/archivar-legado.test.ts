import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { archivarCorrida, CORRIDAS_ARCHIVADAS } from "../scripts/archivar-legado.js";

/**
 * Ticket 10: el **script** que archivó la evidencia, probado sobre un `reports/`
 * temporal en lugar del real. Lo que se fija es que copie (no reescriba) y que
 * se niegue a archivar lo que no tiene con qué decirse.
 *
 * El test que dice si el archivo del repo salió de aquí es
 * `test/legado-archivo.test.ts`, que compara byte a byte contra lo commiteado.
 */

const SUITE = CORRIDAS_ARCHIVADAS.find((c) => c.dir === "suite-2026-10-27")!;

const SCORECARD = {
  pin: {
    ref: "main",
    commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
    fecha: "2026-10-20",
    repo: "https://github.com/minilama2222/desy-skills",
  },
  skills: [
    {
      skill: "implement-component",
      casos: [
        {
          caso: "boton-primario",
          veredicto: "SUSPENDE",
          ejecuciones: 3,
          alcanzaronSkill: 2,
          correctas: 0,
          entregoMal: 0,
          sinArtefacto: 2,
        },
      ],
      pasados: 0,
      suspendidos: 1,
      indeterminados: 0,
    },
  ],
};

function conReports<T>(fn: (reports: string, legado: string) => T): T {
  const raiz = mkdtempSync(join(tmpdir(), "archivar-legado-"));
  const reports = join(raiz, "reports");
  const legado = join(raiz, "legado");
  try {
    return fn(reports, legado);
  } finally {
    rmSync(raiz, { recursive: true, force: true });
  }
}

/** Escribe un `reports/` con la forma que dejó la corrida del 27/10. */
function reportsDeLaCorrida(reports: string): void {
  const dir = join(reports, SUITE.origen);
  mkdirSync(join(dir, "ejecuciones", "implement-component", "boton-primario"), { recursive: true });
  writeFileSync(join(dir, "scorecard.json"), JSON.stringify(SCORECARD, null, 2) + "\n", "utf8");
  writeFileSync(join(dir, "scorecard.md"), "# Scorecard\n", "utf8");
  writeFileSync(
    join(dir, "ejecuciones", "implement-component", "boton-primario", "2.json"),
    JSON.stringify({ skill: "implement-component", caso: "boton-primario", grade: "INACEPTABLE" }),
    "utf8",
  );
}

describe("archivarCorrida: copia la evidencia y le pone la regla encima (ticket 10)", () => {
  it("copia el JSON byte a byte, y no lo reescribe con la forma de hoy", () => {
    conReports((reports, legado) => {
      reportsDeLaCorrida(reports);
      archivarCorrida(SUITE, reports, legado);

      const original = readFileSync(join(reports, SUITE.origen, "scorecard.json"));
      const copia = readFileSync(join(legado, SUITE.dir, "scorecard.json"));
      expect(copia.equals(original)).toBe(true);
    });
  });

  it("escribe una cabecera por corrida, con la regla y el SUSPENDE de entonces", () => {
    conReports((reports, legado) => {
      reportsDeLaCorrida(reports);
      archivarCorrida(SUITE, reports, legado);

      const cabecera = readFileSync(join(legado, SUITE.dir, "LEGADO.md"), "utf8");
      expect(cabecera).toContain(`origen: \`reports/${SUITE.origen}/scorecard.json\``);
      expect(cabecera).toContain("ADR-0007");
      expect(cabecera).toContain("era **SUSPENDE**");
      expect(cabecera).toContain("**INDETERMINADO**, no SUSPENDE");
      // La tabla sale del propio fichero, con las entregas que no guardó en «—».
      expect(cabecera).toContain("| boton-primario | SUSPENDE | — | 3 | 0 | 0 | 2 |");
    });
  });

  it("una cabecera al lado de cada JSON, para quien abra el fichero y no el README", () => {
    conReports((reports, legado) => {
      reportsDeLaCorrida(reports);
      archivarCorrida(SUITE, reports, legado);

      for (const rel of ["scorecard.json", "ejecuciones/implement-component/boton-primario/2.json"]) {
        const cabecera = join(legado, SUITE.dir, `${rel}.LEGADO.md`);
        expect(existsSync(cabecera), rel).toBe(true);
        expect(readFileSync(cabecera, "utf8")).toContain("ADR-0007");
      }
    });
  });

  it("un expediente no se copia como folio, y la cabecera dice por qué", () => {
    conReports((reports, legado) => {
      const estabilidad = CORRIDAS_ARCHIVADAS.find((c) => c.dir === "estabilidad-2026-10-22")!;
      const dir = join(reports, estabilidad.origen);
      mkdirSync(dir, { recursive: true });
      for (const n of [1, 2, 3]) {
        writeFileSync(
          join(dir, `ejecucion-${n}.json`),
          JSON.stringify({
            skill: "implement-component",
            caso: "boton-primario",
            grade: "INACEPTABLE",
            pin: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
          }),
          "utf8",
        );
      }
      writeFileSync(join(dir, "resumen.json"), JSON.stringify([{ ejecucion: 1 }]), "utf8");
      writeFileSync(join(dir, "veredicto.json"), JSON.stringify({ veredicto: "SUSPENDE" }), "utf8");

      archivarCorrida(estabilidad, reports, legado);

      const copia = join(legado, estabilidad.dir, "veredicto.json");
      expect(existsSync(copia)).toBe(false);
      const cabecera = readFileSync(join(legado, estabilidad.dir, "LEGADO.md"), "utf8");
      expect(cabecera).toContain("No se copia `veredicto.json`");
    });
  });

  it("un origen que ya no está es un error: el archivo no inventa una corrida", () => {
    conReports((reports, legado) => {
      mkdirSync(reports, { recursive: true });
      expect(() => archivarCorrida(SUITE, reports, legado)).toThrow(/No hay nada que archivar/);
    });
  });

  it("no copia el artefacto HTML: es output del SUT y se regenera", () => {
    conReports((reports, legado) => {
      reportsDeLaCorrida(reports);
      writeFileSync(join(reports, SUITE.origen, "pagina.html"), "<html></html>", "utf8");
      archivarCorrida(SUITE, reports, legado);

      expect(existsSync(join(legado, SUITE.dir, "pagina.html"))).toBe(false);
    });
  });

  it("una corrida con un solo fichero que no es legado se niega entera: nada a medias", () => {
    conReports((reports, legado) => {
      reportsDeLaCorrida(reports);
      // El `veredicto.json` real del 22/10: no tiene Pin ni folio conocido.
      writeFileSync(
        join(reports, SUITE.origen, "veredicto.json"),
        JSON.stringify({ veredicto: "SUSPENDE" }),
        "utf8",
      );

      expect(() => archivarCorrida(SUITE, reports, legado)).toThrow(/no es legado/);
      // El fallo ocurre antes de copiar: no queda un archivo a medias —una
      // cabecera que dice tener unos ficheros que no están—.
      expect(existsSync(join(legado, SUITE.dir, "scorecard.json"))).toBe(false);
      expect(existsSync(join(legado, SUITE.dir, "LEGADO.md"))).toBe(false);
    });
  });

  it("la corrida del 22/10 se archiva con la misma regla, y con su propia evidencia", () => {
    conReports((reports, legado) => {
      const estabilidad = CORRIDAS_ARCHIVADAS.find((c) => c.dir === "estabilidad-2026-10-22")!;
      const dir = join(reports, estabilidad.origen);
      mkdirSync(dir, { recursive: true });
      for (const n of [1, 2, 3]) {
        writeFileSync(
          join(dir, `ejecucion-${n}.json`),
          JSON.stringify({
            skill: "implement-component",
            caso: "boton-primario",
            grade: "INACEPTABLE",
            pin: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
          }),
          "utf8",
        );
      }
      writeFileSync(join(dir, "ejecucion-1-fuente.txt"), "{{ componentButton() }}", "utf8");

      archivarCorrida(estabilidad, reports, legado);

      const cabecera = readFileSync(join(legado, estabilidad.dir, "LEGADO.md"), "utf8");
      // La misma regla que el 27/10: el experimento la lleva escrita en línea
      // (`scripts/experimento-estabilidad.ts:118`), no es una regla nueva.
      expect(cabecera).toContain("**ADR-0007**");
      expect(cabecera).toContain("era **SUSPENDE**");
      // La fuente exacta del HALLAZGO es evidencia: tiene que viajar, y su
      // cabecera hereda el Pin de la corrida (ella no lo lleva en el texto).
      expect(existsSync(join(legado, estabilidad.dir, "ejecucion-1-fuente.txt"))).toBe(true);
      const cabeceraDeLaFuente = readFileSync(
        join(legado, estabilidad.dir, "ejecucion-1-fuente.txt.LEGADO.md"),
        "utf8",
      );
      expect(cabeceraDeLaFuente).toContain("Una captura en prosa de una Ejecución.");
      expect(cabeceraDeLaFuente).toContain("b523ca7df8594532f5fd47376894c16bc8f1b5df");
    });
  });
});

describe("archivar no pisa la historia, y una corrida de solo lectura no afirma un Grade", () => {
  it("re-archivar un directorio que ya existe se niega en vez de pisarlo", () => {
    // Le pasó al 27/10: al añadir una corrida nueva se re-corrió el script entero,
    // y como `reports/` guardaba los ficheros de otra noche, el archivo histórico
    // se reescribió con ellos. La evidencia archivada no se refresca.
    conReports((reports, legado) => {
      reportsDeLaCorrida(reports);
      archivarCorrida(SUITE, reports, legado);

      expect(() => archivarCorrida(SUITE, reports, legado)).toThrow(/ya está archivado/);
    });
  });

  it("una corrida sin re-graduación posible dice qué no se puede afirmar, no con qué regla iban las entregas", () => {
    const soloLectura = CORRIDAS_ARCHIVADAS.find((c) => c.dir === "suite-2026-11-18-macro-comentado")!;

    conReports((reports, legado) => {
      const dir = join(reports, soloLectura.origen);
      mkdirSync(join(dir, "ejecuciones", "implement-component", "boton-primario"), { recursive: true });
      writeFileSync(
        join(dir, "ejecuciones", "implement-component", "boton-primario", "2.json"),
        JSON.stringify({
          skill: "implement-component",
          caso: "boton-primario",
          grade: "ACEPTABLE",
          entrega: "con-artefacto",
          flujoAlcanzoSkill: false,
          pin: { ref: "main", commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df", fecha: "2026-10-28" },
        }),
        "utf8",
      );

      archivarCorrida(soloLectura, reports, legado);

      const cabecera = readFileSync(join(legado, soloLectura.dir, "LEGADO.md"), "utf8");
      expect(cabecera).toContain("no se puede re-graduar");
      expect(cabecera).toContain("No se puede afirmar:");
      // Lo que no se sabe, no se dice: la afirmación sobre lo que entregó la
      // corrida no se imprime, porque el árbol que se midió no está.
      expect(cabecera).not.toContain("## Con qué regla se midió");

      const deLaEjecucion = readFileSync(
        join(legado, soloLectura.dir, "ejecuciones", "implement-component", "boton-primario", "2.json.LEGADO.md"),
        "utf8",
      );
      expect(deLaEjecucion).toContain("Grade guardado:");
      expect(deLaEjecucion).toContain("no lo que hoy daría");
    });
  });
});
