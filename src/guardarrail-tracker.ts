/**
 * Guardarraíl del tracker: un ticket `done` no puede tener casillas sin marcar.
 *
 * Nace del retro del ticket 08. En esa sesión aparecieron dos tickets en la misma
 * situación —una casilla pendiente por depender del ticket 12— con **etiquetas
 * distintas**: el 08 decía `ready-for-human` y el 15 decía `done`. Ese `done` era
 * una mentira: `done` significa «hecho de verdad», y el criterio dependía de
 * trabajo no construido. Es exactamente el fallo que `CODING_STANDARDS.md` dice
 * que hay que evitar, y que el revisor humano tuvo que cazar a mano.
 *
 * La parte **mecánica** de esa regla es ésta: `done` + casillas abiertas. El
 * resto (¿el README describe bien el estado de los comandos?) es juicio, y vive
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

/**
 * Devuelve un hallazgo por ticket con `Status: done` y casillas `- [ ]` sin
 * marcar, o vacío si el tracker está coherente.
 *
 * Es simple a propósito: el formato del tracker es estable (ver
 * `docs/agents/issue-tracker.md`), así que basta con leer la línea de estado y
 * contar las casillas abiertas.
 */
export function ticketsDoneConCasillasAbiertas(tickets: Ticket[]): string[] {
  const hallazgos: string[] = [];
  for (const ticket of tickets) {
    const status = /\*\*Status:\*\*\s*(\S+)/.exec(ticket.contenido)?.[1];
    if (status !== "done") continue;
    const abiertas = (ticket.contenido.match(/^\s*- \[ \]/gm) ?? []).length;
    if (abiertas > 0) {
      hallazgos.push(
        `${ticket.path}: Status "done" con ${abiertas} casilla/s sin marcar. ` +
          "Un `done` cuyo criterio depende de trabajo no construido es " +
          "`ready-for-human`, no `done` (ver CODING_STANDARDS.md).",
      );
    }
  }
  return hallazgos;
}
