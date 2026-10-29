/**
 * Guardarraíl del tracker: el `Status` de un ticket y sus casillas tienen que
 * decir lo mismo.
 *
 * Nace del retro del ticket 08. En esa sesión aparecieron dos tickets en la misma
 * situación —una casilla pendiente por depender del ticket 12— con **etiquetas
 * distintas**: el 08 decía `ready-for-human` y el 15 decía `done`. Ese `done` era
 * una mentira: `done` significa «hecho de verdad», y el criterio dependía de
 * trabajo no construido. Es exactamente el fallo que `CODING_STANDARDS.md` dice
 * que hay que evitar, y que el revisor humano tuvo que cazar a mano.
 *
 * La primera versión sólo miraba una de las dos direcciones —`done` + casillas
 * abiertas— y el retro del ticket 07 encontró la otra, viva en el árbol: el 05,
 * construido y commiteado, seguía en `ready-for-human` con todas las casillas
 * hechas. Un ticket cuyas casillas están todas cerradas está **construido**, y un
 * estado de triage que dice lo contrario también miente.
 *
 * La excepción no se deduce, se **declara**: `**Status depende de:** <motivo>`
 * en la cabecera del ticket (ver `docs/agents/issue-tracker.md`). Un motivo en
 * texto libre no se puede validar, así que no se valida; lo que se exige es que
 * exista, porque escribir «espero a que un humano acepte esto» es una decisión,
 * y dejar las casillas sin marcar por olvido no lo es.
 *
 * El resto (¿el README describe bien el estado de los comandos?) es juicio, y vive
 * en `CODING_STANDARDS.md`, no aquí: un check que intente leer lenguaje natural
 * da falsos positivos y se acaba ignorando.
 *
 * Es pura: recibe los tickets y devuelve una descripción por hallazgo.
 */

export interface Ticket {
  /** Ruta del fichero, para el mensaje. */
  path: string;
  contenido: string;
}

/** Las casillas del ticket, contadas por su estado. */
function casillas(contenido: string): { abiertas: number; hechas: number } {
  return {
    abiertas: (contenido.match(/^\s*- \[ \]/gm) ?? []).length,
    hechas: (contenido.match(/^\s*- \[x\]/gm) ?? []).length,
  };
}

/**
 * El motivo declarado por el que el ticket está construido y aún así no es
 * `done`: «espera a que un humano acepte», «espera a que aterrice el 09».
 */
export function motivoDeclarado(contenido: string): string | undefined {
  return /\*\*Status depende de:\*\*\s*(\S.*?)\s*$/m.exec(contenido)?.[1];
}

/**
 * Devuelve un hallazgo por ticket cuyo `Status` y cuyas casillas se contradicen:
 *
 * - `done` con casillas abiertas: falta trabajo, y no está construido entero.
 * - cualquier otro estado con **todas** las casillas hechas y sin
 *   `**Status depende de:**`: está construido, y el estado dice que no.
 *
 * Un ticket sin casillas no se juzga: no hay nada con lo que contrastarlo.
 */
export function ticketsDoneConCasillasAbiertas(tickets: Ticket[]): string[] {
  const hallazgos: string[] = [];
  for (const ticket of tickets) {
    const status = /\*\*Status:\*\*\s*(\S+)/.exec(ticket.contenido)?.[1];
    if (status === undefined) continue;
    const { abiertas, hechas } = casillas(ticket.contenido);

    if (status === "done") {
      if (abiertas > 0) {
        hallazgos.push(
          `${ticket.path}: Status "done" con ${abiertas} casilla/s sin marcar. ` +
            "Un `done` cuyo criterio depende de trabajo no construido es " +
            "`ready-for-human`, no `done` (ver CODING_STANDARDS.md).",
        );
      }
      continue;
    }

    if (abiertas === 0 && hechas > 0 && motivoDeclarado(ticket.contenido) === undefined) {
      hallazgos.push(
        `${ticket.path}: Status "${status}" con sus ${hechas} casilla/s ya hechas: ` +
          "el ticket está construido y el estado dice que no. Es `done`, o " +
          "declara por qué espera con `**Status depende de:**` (ver " +
          "docs/agents/issue-tracker.md).",
      );
    }
  }
  return hallazgos;
}
