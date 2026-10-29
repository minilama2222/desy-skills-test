import type { Caso } from "./caso.js";
import type { ResultadoEjecucion } from "./ejecutar.js";
import type { Scorecard, VeredictoCaso } from "./scorecard.js";

/**
 * La suite entera como comando apto para CI (ticket 13): elegir qué Casos
 * corren, N Ejecuciones por Caso (ADR-0007), el veredicto agregado y el exit
 * code que bloquea un merge. Todo aquí es **puro** —recibe Casos y resultados,
 * no toca el disco ni el SUT— para poder probar la política sin modelo. El
 * adaptador (sandbox + `opencode run` + persistencia) vive en `src/cli.ts`.
 */

/**
 * Por defecto un Caso se corre hasta tener 3 **entregas** (ADR-0007 y
 * ADR-0014): con una sola, el veredicto al azar de un SUT flaky sería el
 * veredicto del skill.
 *
 * Desde el ADR-0014 ese 3 es un presupuesto de **entregas**, no de intentos: se
 * intenta hasta tener 3 entregas o agotar el tope duro (`limiteDeIntentos`), lo
 * que antes llegue. Una Ejecución sin Artefacto consume intento y no entrega.
 */
export const N_POR_DEFECTO = 3;

/** Cuántos intentos extra por entrega da el tope duro, si no se declara otro. */
export const INTENTOS_POR_ENTREGA = 2;

/**
 * El tope duro de intentos para conseguir `n` entregas (ADR-0014): `n * 2` por
 * defecto. Es una regla pura para poder probar el borde sin correr el SUT —
 * agotarlo se para y el veredicto sale de lo que sí se entregó.
 *
 * Un tope menor que `n` sería un presupuesto que no puede cumplirse; no es un
 * error de la regla de scoring, es un argumento inválido.
 */
export function limiteDeIntentos(n: number, tope?: number): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`presupuesto inválido: ${n} entregas (se esperaba un entero ≥ 1)`);
  }
  if (tope === undefined) return n * INTENTOS_POR_ENTREGA;
  if (!Number.isInteger(tope) || tope < n) {
    throw new Error(
      `tope inválido: ${tope} intentos para ${n} entregas ` +
        `(se esperaba un entero ≥ ${n})`,
    );
  }
  return tope;
}

export interface Seleccion {
  /** Sólo los Casos de este skill. */
  skill?: string;
  /** Sólo este Caso (dentro de los de `skill`, si se ha dado). */
  caso?: string;
  /** Entregas que el Caso busca: se intenta hasta tenerlas o topar. */
  n: number;
  /** Tope duro de intentos; por defecto, `limiteDeIntentos(n)`. */
  tope?: number;
}

/**
 * Qué Casos entran en la corrida. Un filtro que no casa con ningún Caso es un
 * error, no una suite vacía: una suite vacía saldría con exit 0 y un CI verde sin
 * haber evaluado nada es peor que un CI rojo.
 */
export function seleccionarCasos(casos: Caso[], seleccion: Seleccion): Caso[] {
  if (seleccion.n < 1 || !Number.isInteger(seleccion.n)) {
    throw new Error(`N inválido: ${seleccion.n} (se esperaba un entero ≥ 1)`);
  }
  const delSkill =
    seleccion.skill === undefined
      ? casos
      : casos.filter((c) => c.skill === seleccion.skill);
  if (delSkill.length === 0) {
    throw new Error(
      `No hay Casos para el skill "${seleccion.skill}". ` +
        `Skills con Casos: ${skillsDe(casos).join(", ") || "(ninguno)"}`,
    );
  }
  if (seleccion.caso === undefined) return delSkill;

  const delCaso = delSkill.filter((c) => c.id === seleccion.caso);
  if (delCaso.length === 0) {
    throw new Error(
      `No hay Caso "${seleccion.caso}"` +
        (seleccion.skill === undefined ? "" : ` para el skill "${seleccion.skill}"`) +
        `. Casos disponibles: ${[...new Set(delSkill.map((c) => c.id))].join(", ")}`,
    );
  }
  return delCaso;
}

/** Los Skills que tienen al menos un Caso, sin repetir. */
export function skillsDe(casos: Caso[]): string[] {
  return [...new Set(casos.map((c) => c.skill))];
}

/**
 * ¿El Caso pasó? Un Caso **INDETERMINADO** no bloquea el merge: el ADR-0007 dice
 * que no es suspenso —el agente no arrancó el skill, no hay dato para juzgarlo—,
 * y un bloqueo por una corrida en que el SUT no llegó no mide el skill. Lo que
 * bloquea es **SUSPENDE**: alguna Ejecución alcanzó el skill y ninguna fue
 * correcta. En ambos casos el caso queda dicho en el Scorecard, con su veredicto,
 * y `resumen()` cuenta los indeterminados aparte para que nadie los lea como
 * verdes.
 */
export function pasarCaso(veredicto: VeredictoCaso): boolean {
  return veredicto !== "SUSPENDE";
}

/**
 * El exit code de la suite: distinto de cero si algún Caso no pasa (ver
 * `pasarCaso`). Una suite que corrió cero Casos tampoco pasa: es un error de
 * uso, no un verde.
 */
export function exitCodeDe(scorecard: Scorecard): number {
  const casos = scorecard.skills.flatMap((s) => s.casos);
  if (casos.length === 0) return 1;
  return casos.every((c) => pasarCaso(c.veredicto)) ? 0 : 1;
}

/**
 * El recuento que se anuncia en la consola. `suspendidos` es lo que tumba el exit
 * code; `indeterminados` se cuenta aparte porque no bloquea.
 */
export interface ResumenSuite {
  skills: number;
  casos: number;
  pasados: number;
  suspendidos: number;
  indeterminados: number;
  /**
   * Los **intentos** hechos (las Ejecuciones): no son entregas, y desde el ticket
   * 03 el nombre lo dice. Una que no escribió nada consume intento y no entrega, y
   * la diferencia es justo lo que mide la tasa de entrega que pide el 14 (ver
   * Presupuesto de intentos, ADR-0014).
   */
  intentos: number;
  /** Las **entregas** conseguidas: las Ejecuciones con Artefacto. */
  entregas: number;
}

export function resumen(scorecard: Scorecard, ejecuciones: ResultadoEjecucion[]): ResumenSuite {
  const casos = scorecard.skills.flatMap((s) => s.casos);
  return {
    skills: scorecard.skills.length,
    casos: casos.length,
    pasados: casos.filter((c) => c.veredicto === "PASA").length,
    suspendidos: casos.filter((c) => c.veredicto === "SUSPENDE").length,
    indeterminados: casos.filter((c) => c.veredicto === "INDETERMINADO").length,
    intentos: ejecuciones.length,
    entregas: ejecuciones.filter((e) => e.entrega === "con-artefacto").length,
  };
}
