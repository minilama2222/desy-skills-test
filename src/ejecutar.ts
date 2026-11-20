import type { Caso } from "./caso.js";
import { esCasoPagina } from "./caso.js";
import type { DetalleCheck, Grade } from "./grader.js";
import { grado, pasoCoincide } from "./grader.js";
import type { Pin } from "./pin.js";
import { esPinLocal } from "./pin.js";
import type { RunDeps } from "./runner.js";
import { runCaso } from "./runner.js";
import type { Evidencia } from "./runner.js";
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
  /**
   * Por qué esta Ejecución **no es dato** (ticket 21): el SUT dejó de responder
   * y se cortó, o la salida dice que no hubo conversación con el proveedor. Un
   * `exitCode` ≠ 0 por un crash del SUT **no** lo rellena: eso sí es del SUT.
   */
  infraestructura?: MotivoDeInfraestructura;
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
 * Por qué una Ejecución **no se pudo medir** (ticket 21): el SUT se quedó sin
 * respuesta y hubo que cortarlo. No es un juicio sobre el skill —no llegó a
 * producir dato— y por eso no puede leerse como «no entregó».
 *
 * - `tiempo`: saltó el techo de pared del runner (`TIMEOUT_SUT_MS`).
 * - `red`: el SUT terminó, pero la salida dice que no hubo conversación con el
 *   proveedor (`ENOTFOUND`, `provider.transport`, `ECONNRESET`…).
 * - `entorno`: el harness no pudo compilar la página (`npm` ausente o build fuera
 *   de techo, ticket 22). El SUT no tiene shell, así que aquí no hay juicio suyo.
 */
export type MotivoDeInfraestructura = "entorno" | "tiempo" | "red";

/** La frase con que `npmCommand` nombra un build que no pudo ni empezar. */
const MARCA_DE_ENTORNO = "no pudo compilar (ticket 22)";

/** La frase con que `runner.ts` nombra un corte por techo de pared. */
const MARCA_DE_TIEMPO = "techo de pared, ticket 21";

/** Fallos de transporte del proveedor: el SUT existió, la medida no. */
const MARCAS_DE_RED = /ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|provider\.transport|socket hang up/i;

/**
 * Regla (ticket 21): ¿esta Ejecución es dato del skill o una falta de medida?
 *
 * Se mira la **salida**, que es lo único que queda en disco: el corte por tiempo
 * deja su frase, y un fallo de transporte deja la suya. Un exit ≠ 0 por un crash
 * del SUT **no** entra aquí: eso sí es del SUT y se sigue contando como fallo.
 */
export function motivoDeInfraestructura(
  evidencia: Pick<Evidencia, "salida">,
): MotivoDeInfraestructura | undefined {
  const texto = `${evidencia.salida.stdout}\n${evidencia.salida.stderr}`;
  if (texto.includes(MARCA_DE_ENTORNO)) return "entorno";
  if (texto.includes(MARCA_DE_TIEMPO)) return "tiempo";
  if (MARCAS_DE_RED.test(texto)) return "red";
  return undefined;
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
 * Regla: ¿esta Ejecución **da dato** sobre el skill bajo test? Normalmente sí
 * cuando el Flujo alcanzó el skill. La excepción son los **Caso-decisión**: su
 * artefacto es la respuesta (`salida.md`), no un fichero del `workDir`, así que
 * la respuesta se juzga con los Checks aunque el skill no se haya invocado
 * (decisión del mantenedor, ticket 22).
 */
export function daDato(
  ejecucion: Pick<ResultadoEjecucion, "tipo" | "flujoAlcanzoSkill">,
): boolean {
  return ejecucion.flujoAlcanzoSkill || ejecucion.tipo === "caso-decision";
}

/**
 * Regla (ticket 03): ¿esta Ejecución es una **entrega del Caso** que cuenta para
 * el presupuesto y el veredicto? Hace falta la Entrega **y** dar dato sobre el
 * skill: un Artefacto escrito sin invocar el skill no midió el skill, así que no
 * rellena su presupuesto de entregas ni lo aprueba (es el hallazgo de trigger,
 * ticket 07). La comparten el bucle que corre (`cli.ts`) y el que agrega
 * (`scorecard.ts`): si discreparan, el bucle podría parar sin haber medido nada.
 */
export function cuentaComoEntrega(
  ejecucion: Pick<ResultadoEjecucion, "tipo" | "entrega" | "flujoAlcanzoSkill">,
): boolean {
  return ejecucion.entrega === "con-artefacto" && daDato(ejecucion);
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
  // Una sola lectura de la salida decide si esto es dato del skill o una falta
  // de medida (ticket 21); se escribe en la Evidencia para que el Scorecard no
  // tenga que volver a interpretar la prosa del SUT.
  const infraestructura = motivoDeInfraestructura(evidencia);

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
    ...(infraestructura === undefined ? {} : { infraestructura }),
    ultimoPasoDelFlujo: ultimoPasoDelFlujo(evidencia.transcript.invocaciones),
    salida: evidencia.salida,
    arbolHash: evidencia.arbolHash,
  };
}
