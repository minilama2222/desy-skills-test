import type { Caso } from "./caso.js";
import { esCasoPagina } from "./caso.js";
import type { DetalleCheck, Grade } from "./grader.js";
import { grado, pasoCoincide } from "./grader.js";
import type { Pin } from "./pin.js";
import { esPinLocal } from "./pin.js";
import type { RunDeps } from "./runner.js";
import { runCaso } from "./runner.js";
import { readFileSync } from "node:fs";

export interface ResultadoEjecucion {
  skill: string;
  caso: string;
  tipo: Caso["tipo"];
  pin: string;
  /**
   * La ruta del checkout, sólo cuando el Pin es local (ticket 05: va en `repo`
   * del Pin). El informe por Caso (ticket 06) la necesita para citar las
   * secciones del **árbol que se midió** en vez de las de `vendor/`, que no es lo
   * que se copió al sandbox. En un Pin remoto no existe.
   */
  pinRepo?: string;
  /**
   * La fecha del Pin con el que se midió. Va en la Ejecución, no se toma de
   * `pin.json` al reportar: re-etiquetar una corrida con el Pin de hoy es la
   * mentira que quitó el ticket 04, y con un Pin local (ticket 05) el resto del
   * Pin —`commit: local`— tampoco está en `pin.json`.
   */
  fecha: string;
  grade: Grade;
  detalle: DetalleCheck[];
  flujoObservado: string[];
  artefactos: Record<string, string>;
  entrega: Entrega;
  flujoAlcanzoSkill: boolean;
  /** Exit code del SUT: ≠ 0 ⇒ crasheó; 0 sin Artefacto ⇒ terminó sin entregar. */
  exitCode: number;
  /** Último paso del Flujo alcanzado, o null si no invocó ningún skill. */
  ultimoPasoDelFlujo: string | null;
  /** Hash del árbol de skills medido (ticket 04): la identidad de la versión. */
  arbolHash: string;
  /** Lo que el SUT escribió por cada canal, sin fusionar (ver `Evidencia.salida`). */
  salida: { stdout: string; stderr: string };
  /**
   * La ruta del JSON de Evidencia con el que esta Ejecución se guardó, relativa al
   * repo (ticket 07). La pone el adaptador que la escribe (`cli.ts`), no el
   * grader: sólo existe cuando la Ejecución está en disco, y es lo que deja al
   * scorecard **remitir** a la evidencia de un hallazgo de trigger en vez de
   * perderla al agregar.
   */
  evidencia?: string;
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
 * Regla: ¿dónde se paró el SUT? El último paso del Flujo observado, o null si no
 * invocó ningún skill. Con `exitCode` separa «crasheó» de «se quedó sin entregar»:
 * un exit ≠ 0 con dos pasos no es lo mismo que un exit 0 con dos pasos y sin
 * Artefacto. Ver el ticket 02 del bucle de refinamiento.
 */
export function ultimoPasoDelFlujo(flujoObservado: string[]): string | null {
  return flujoObservado.length === 0 ? null : flujoObservado[flujoObservado.length - 1]!;
}

/**
 * El Gold-HTML de un Caso-página, o undefined para un Caso-componente (no lleva
 * Gold). Los guards de fidelidad estructural comparan contra él; el resto de
 * checks lo ignoran. Se lee del disco aquí, en el orquestador, para que el
 * grader siga siendo puro: recibe texto, no rutas.
 */
function goldDeCaso(caso: Caso): string | undefined {
  if (!esCasoPagina(caso)) return undefined;
  return readFileSync(caso.goldPath, "utf8");
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
    gold: goldDeCaso(caso),
  });

  return {
    skill: caso.skill,
    caso: caso.id,
    tipo: caso.tipo,
    pin: pin.commit,
    ...(esPinLocal(pin) && pin.repo !== undefined ? { pinRepo: pin.repo } : {}),
    fecha: pin.fecha,
    grade,
    detalle,
    flujoObservado: evidencia.transcript.invocaciones,
    artefactos: evidencia.artefactos.files,
    entrega: entregaDeArtefactos(evidencia.artefactos.files),
    flujoAlcanzoSkill: alcanzoSkill(evidencia.transcript.invocaciones, caso.skill),
    exitCode: evidencia.exitCode,
    ultimoPasoDelFlujo: ultimoPasoDelFlujo(evidencia.transcript.invocaciones),
    salida: evidencia.salida,
    arbolHash: evidencia.arbolHash,
  };
}
