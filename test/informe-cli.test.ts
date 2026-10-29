import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { REPO_ROOT } from "../src/repo.js";
import { guardarEjecucion } from "../src/reportes.js";
import type { ResultadoEjecucion } from "../src/ejecutar.js";

/**
 * Ticket 06 (bucle de refinamiento): el informe por Caso es un **producto** del
 * CLI, no sólo de una función. `npm run report` tiene que dejar en disco un
 * `informe/<skill>/<caso>.md` junto al Scorecard, porque es el documento con el
 * que alguien que no conoce el harness decide si toca el skill o el check.
 *
 * Corre el CLI **de verdad** (proceso aparte) sobre un árbol de Ejecuciones
 * temporal: lo que se mide es lo que el mantenedor obtiene al teclearlo. Es
 * determinista y sin SUT —sólo lee Ejecuciones ya guardadas—, así que cuesta
 * ~1 s y no necesita el presupuesto de tiempo de la suite (CODING_STANDARDS:
 * ese presupuesto es para lo que copia el scaffold).
 */

const TSX = join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");

/** La Ejecución del 27/10 que puso nombre al ticket, transcrita de la Evidencia. */
const EJECUCION: ResultadoEjecucion = {
  skill: "implement-component",
  caso: "boton-primario",
  tipo: "caso-componente",
  pin: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-28",
  grade: "INACEPTABLE",
  detalle: [
    {
      id: "tokens-del-sistema",
      severity: "guard",
      passed: true,
      assert: { kind: "sin_utility_por_defecto" },
    },
    {
      id: "usa-macro-boton",
      severity: "guard",
      passed: true,
      assert: { kind: "macro_presente", macro: "componentButton" },
    },
    {
      id: "variante-primaria",
      severity: "guard",
      passed: false,
      assert: { kind: "macro_con_clase", macro: "componentButton", clase: "c-button--primary" },
      ancla: {
        skill: "desy-styles-reference",
        seccion: "Componentes con `c-*` (bloques UI completos)",
      },
    },
  ],
  flujoObservado: ["preflight-check", "implement-component"],
  artefactos: {
    "src/boton-enviar.njk": [
      '{% from "components/button/_macro.button.njk" import componentButton %}',
      "",
      "{{ componentButton({",
      '  "text": "Enviar",',
      '  "classes": "c-button--secondary c-button--sm"',
      "}) }}",
    ].join("\n"),
  },
  entrega: "con-artefacto",
  flujoAlcanzoSkill: true,
  exitCode: 0,
  ultimoPasoDelFlujo: "implement-component",
  arbolHash: "hash-de-fixture",
  salida: { stdout: "", stderr: "" },
};

describe("npm run report: deja el informe por Caso en disco", () => {
  it("escribe informe/<skill>/<caso>.md con la aserción, la línea y la sección", () => {
    const dir = mkdtempSync(join(tmpdir(), "informe-cli-"));
    try {
      const reports = join(dir, "reports");
      guardarEjecucion(join(reports, "ejecuciones"), EJECUCION);
      // Un informe de una corrida anterior, de un Caso que ya no existe: no puede
      // sobrevivir al siguiente `report` describiendo algo que nadie midió.
      const viejo = join(reports, "informe", "implement-component", "caso-borrado.md");
      mkdirSync(dirname(viejo), { recursive: true });
      writeFileSync(viejo, "informe de otra corrida");

      const r = spawnSync(
        process.execPath,
        [TSX, "src/cli.ts", "report", "--reports", reports],
        { cwd: REPO_ROOT, encoding: "utf8" },
      );

      expect(r.status, r.stderr).toBe(0);
      const informe = join(reports, "informe", "implement-component", "boton-primario.md");
      expect(existsSync(informe)).toBe(true);

      const texto = readFileSync(informe, "utf8");
      expect(texto).toContain("# Informe — implement-component/boton-primario");
      expect(texto).toContain("✗ **variante-primaria** (guard)");
      // La cita del artefacto: la línea del fichero con su número, la que hay que
      // tocar para que la variante primaria esté en `classes`.
      const artefacto = EJECUCION.artefactos["src/boton-enviar.njk"]!;
      const numero = artefacto.split("\n").findIndex((l) => l.includes("c-button--secondary")) + 1;
      expect(texto).toContain(`| {{ componentButton({`);
      // La sección del skill, leída del árbol medido y citada por su título.
      expect(texto).toContain("«Componentes con `c-*` (bloques UI completos)»");
      expect(texto).toContain("```markdown");
      // Lo anuncia por stderr, como el Scorecard.
      expect(r.stderr).toMatch(/Informe: .*informe[\\/]implement-component[\\/]boton-primario\.md/);

      expect(readdirSync(join(reports, "informe", "implement-component"))).toEqual([
        "boton-primario.md",
      ]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it(
    "no remite a una Evidencia que no está en el árbol que se reporta (retro del ticket 07)",
    () => {
      // La ruta de `evidencia` se escribió donde la Ejecución se **corrió**. Al
      // leer una copia del árbol —un artefacto de CI— esa ruta apunta a un fichero
      // que aquí no existe: el hallazgo no puede decir «ver en X» y que X falte.
      const dir = mkdtempSync(join(tmpdir(), "informe-cli-evidencia-"));
      try {
        const reports = join(dir, "reports");
        guardarEjecucion(join(reports, "ejecuciones"), {
          ...EJECUCION,
          grade: "EXCELENTE",
          detalle: EJECUCION.detalle.map((d) => ({ ...d, passed: true })),
          flujoObservado: ["preflight-check"],
          flujoAlcanzoSkill: false,
          evidencia: "reports/oytra-corrida/ejecuciones/boton-primario/3.json",
        });

        const r = spawnSync(
          process.execPath,
          [TSX, "src/cli.ts", "report", "--reports", reports],
          { cwd: REPO_ROOT, encoding: "utf8" },
        );

        expect(r.status, r.stderr).toBe(0);
        const informe = readFileSync(
          join(reports, "informe", "implement-component", "boton-primario.md"),
          "utf8",
        );
        // El hallazgo sigue saliendo; lo que desaparece es la ruta fantasma.
        expect(informe).toContain("Hallazgo de trigger");
        expect(informe).toContain("**Ejecución 1** — `EXCELENTE`");
        expect(informe).not.toContain("oytra-corrida");
        expect(r.stdout).not.toContain("oytra-corrida");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
    60_000,
  );
});
