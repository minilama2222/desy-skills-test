import type { Caso } from "./caso.js";
import type { DetalleCheck, Grade } from "./grader.js";
import { grado, pasoCoincide } from "./grader.js";
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
  entrega: Entrega;
  flujoAlcanzoSkill: boolean;
}

/**
 * Qué produjo la Ejecución: si hay Artefacto que graduar o no. Es un eje
 * distinto del Grade — «no entregó» y «entregó mal» no son la misma cosa, y hoy
 * ambas colapsaban en INACEPTABLE. Ver el glosario (Artefacto, Entrega).
 */
export type Entrega = "con-artefacto" | "sin-artefacto";

/**
 * Regla: ¿hubo algún Artefacto que graduar? Cuenta como entrega que exista
 * **algún** fichero de Artefacto; su contenido ya lo juzgan los Checks. Un
 * fichero vacío sigue siendo una entrega (y fallará los Checks): lo que aquí se
 * separa es «no produjo nada» de «produjo algo», no «bien» de «mal».
 * Ver ADR-0006 para qué fichero es el Artefacto según el tipo de Caso.
 */
export function entregaDeArtefactos(artefactos: Record<string, string>): Entrega {
  return Object.keys(artefactos).length > 0 ? "con-artefacto" : "sin-artefacto";
}

/**
 * Regla: ¿llegó a ejecutarse el skill bajo test? Es el punto en que el SUT se
 * paró. Falso significa que un INACEPTABLE **no evalúa el skill**: el agente ni
 * lo invocó. Segundo eje, ortogonal a la Entrega (ver glosario, Alcanzó el
 * skill). Se apoya en `pasoCoincide` para no discrepar del guard de flujo.
 */
export function alcanzoSkill(flujoObservado: string[], skill: string): boolean {
  return flujoObservado.some((paso) => pasoCoincide(paso, skill));
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
    entrega: entregaDeArtefactos(evidencia.artefactos.files),
    flujoAlcanzoSkill: alcanzoSkill(evidencia.transcript.invocaciones, caso.skill),
  };
}
