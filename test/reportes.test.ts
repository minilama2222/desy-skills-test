import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ResultadoEjecucion } from "../src/ejecutar.js";
import { guardarEjecucion, leerEjecuciones, EJECUCIONES_DIR } from "../src/reportes.js";

const ejecucion = (over: Partial<ResultadoEjecucion> = {}): ResultadoEjecucion => ({
  skill: "implement-component",
  caso: "boton-primario",
  tipo: "caso-componente",
  pin: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-20",
  grade: "EXCELENTE",
  detalle: [],
  flujoObservado: [],
  artefactos: {},
  entrega: "con-artefacto",
  flujoAlcanzoSkill: true,
  exitCode: 0,
  ultimoPasoDelFlujo: null,
  arbolHash: "hash-de-fixture",
  salida: { stdout: "", stderr: "" },
  ...over,
});

function conDirTemporal<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "reportes-test-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("guardarEjecucion / leerEjecuciones", () => {
  it("una Ejecución guardada se puede volver a leer íntegra", () => {
    conDirTemporal((dir) => {
      const original = ejecucion({ grade: "BUENO" });
      guardarEjecucion(dir, original);

      expect(leerEjecuciones(dir)).toEqual([original]);
    });
  });

  it("lee las Ejecuciones de todos los Skill y Casos del árbol", () => {
    conDirTemporal((dir) => {
      guardarEjecucion(dir, ejecucion({ skill: "implement-component", caso: "a" }));
      guardarEjecucion(dir, ejecucion({ skill: "implement-component", caso: "b" }));
      guardarEjecucion(dir, ejecucion({ skill: "implement-pattern", caso: "c" }));

      const leidas = leerEjecuciones(dir);
      expect(leidas.map((e) => `${e.skill}/${e.caso}`).sort()).toEqual([
        "implement-component/a",
        "implement-component/b",
        "implement-pattern/c",
      ]);
    });
  });

  it("varias Ejecuciones del mismo Caso se conservan como N distintas", () => {
    conDirTemporal((dir) => {
      guardarEjecucion(dir, ejecucion({ grade: "INACEPTABLE" }));
      guardarEjecucion(dir, ejecucion({ grade: "EXCELENTE" }));

      expect(leerEjecuciones(dir).map((e) => e.grade)).toEqual([
        "INACEPTABLE",
        "EXCELENTE",
      ]);
    });
  });

  it("un directorio sin Ejecuciones devuelve la lista vacía", () => {
    conDirTemporal((dir) => {
      expect(leerEjecuciones(dir)).toEqual([]);
    });
  });
});

describe("EJECUCIONES_DIR", () => {
  it("vive bajo reports/ del repo", () => {
    expect(EJECUCIONES_DIR.replace(/\\/g, "/")).toMatch(/\/reports\/ejecuciones$/);
  });
});
