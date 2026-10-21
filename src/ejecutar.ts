import type { Caso } from "./caso.js";
import type { DetalleCheck, Grade } from "./grader.js";
import { grado } from "./grader.js";
import type { Pin } from "./pin.js";
import type { RunDeps } from "./runner.js";
import { runCaso } from "./runner.js";

export interface ResultadoEjecucion {
  skill: string;
  caso: string;
  tipo: Caso["tipo"];
  pin: string;
  grade: Grade;
  detalle: DetalleCheck[];
  flujoObservado: string[];
  artefactos: Record<string, string>;
}

/**
 * Camino vertical completo de un Caso: corre el SUT (runner), recoge la
 * Evidencia y la puntúa con el grader. Es el orquestador que consume el CLI.
 */
export async function ejecutarCaso(
  caso: Caso,
  pin: Pin,
  deps: RunDeps,
): Promise<ResultadoEjecucion> {
  const evidencia = await runCaso(caso, pin, deps);
  const { grade, detalle } = grado(evidencia, {
    tipo: caso.tipo,
    checks: caso.checks,
  });

  return {
    skill: caso.skill,
    caso: caso.id,
    tipo: caso.tipo,
    pin: pin.commit,
    grade,
    detalle,
    flujoObservado: evidencia.transcript.invocaciones,
    artefactos: evidencia.artefactos.files,
  };
}
