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
 * Es pura: recibe los tickets y devuelve una descripción por hallazgo. La única
 * pregunta al disco —¿existe el test que el comentario cita?— se hace sólo si el
 * ticket trae `raiz`, y el test la cubre con un árbol temporal.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

export interface Ticket {
  /** Ruta del fichero, para el mensaje. */
  path: string;
  contenido: string;
  /**
   * La raíz del repo, para comprobar que un fichero citado existe. Opcional: sin
   * ella (un test con contenido inventado) esa comprobación se omite.
   */
  raiz?: string;
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
  return /^\*\*Status depende de:\*\*\s*(\S.*?)\s*$/m.exec(contenido)?.[1];
}

/**
 * El `Status` del ticket, leído de su **cabecera** (antes del primer `##`): un
 * ticket que cita otro en su cuerpo no puede pasar por estar en ese estado.
 */
function estadoDe(contenido: string): string | undefined {
  const cabecera = contenido.split(/^## /m)[0] ?? "";
  return /\*\*Status:\*\*\s*(\S+)/.exec(cabecera)?.[1];
}

/**
 * Una casilla hecha que se **excusa** en vez de construirse. Retro de la sesión
 * del ticket 03: se marcó «un test de proceso real, si hace falta, lleva su
 * presupuesto medido» con un inciso «(no hizo falta: …)», y el criterio no decía
 * quién lo cubre. `done` significa construido, y un paréntesis que rebaja el
 * criterio no lo construye.
 *
 * Un inciso que **nombra** a qué se debe («porque lo cubre `X`», «ver `Y`») sí vale:
 * entonces el criterio apunta a algo, que es lo que `CODING_STANDARDS.md` pide. Lo
 * que se rechaza es el paréntesis que sólo dice «no se hizo».
 */
const EXCUSA_SIN_DESTINO =
  /- \[x\][^\n]*\((?![^)]*\b(?:porque|lo cubre|cubiert[oa]|ver|lo prueba|en)\b)[^)]*(?:no hizo falta|no aplica|no se añadió|no se puede|pendiente|excepción|sin test|no test)[^)]*\)/i;

function excusaSinDestino(contenido: string): string | undefined {
  return EXCUSA_SIN_DESTINO.exec(contenido)?.[0];
}

/**
 * Los ficheros que citan los `## Comments` del ticket, para que un diagnóstico no
 * nombre un fichero que no existe. Nace del mismo fallo: el ticket 03 se marcó
 * `done` con un `## Comments` que citaba dos tests en rojo como causa, y el
 * diagnóstico de esa causa («el `opencode` real pisa al preludio») era falso. Un
 * check no puede leer si la causa es cierta; sí puede exigir que el test que
 * nombra exista, que es la parte mecánica — el test que luego desmiente el
 * diagnóstico.
 *
 * Sólo se citan como test los nombres con la **extensión** de un test
 * (`x.test.ts`): un `policy.md` o un `tokens.test` a medias no son una ruta.
 */
export function ficherosCitadosEnComentarios(contenido: string): string[] {
  const comentarios = contenido.split(/^## Comments/m).slice(1).join("\n");
  const nombres = new Set<string>();
  for (const match of comentarios.matchAll(/\b[`"]?([\w./-]*[\w-]+\.test\.[cm]?[jt]s)\b/g)) {
    // Un nombre sin barra es una ruta suelta; una con barra ya puede ser relativa
    // (`test/x.test.ts`) o absoluta. Al fichero le basta lo que se pueda resolver.
    nombres.add(match[1]!);
  }
  return [...nombres];
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
export function problemasDelTracker(tickets: Ticket[]): string[] {
  const hallazgos: string[] = [];
  for (const ticket of tickets) {
    const estado = estadoDe(ticket.contenido);
    if (estado === undefined) continue;
    const { abiertas, hechas } = casillas(ticket.contenido);

    if (estado === "done") {
      if (abiertas > 0) {
        hallazgos.push(
          `${ticket.path}: Status "done" con ${abiertas} casilla/s sin marcar. ` +
            "Un `done` cuyo criterio depende de trabajo no construido es " +
            "`ready-for-human`, no `done` (ver CODING_STANDARDS.md).",
        );
      }
      const excusa = excusaSinDestino(ticket.contenido);
      if (excusa !== undefined) {
        hallazgos.push(
          `${ticket.path}: una casilla hecha se excusa en vez de apuntar a algo: ` +
            `«${excusa}». ` +
            "Un `done` dice a qué test o ticket lo cubre, o el criterio no está construido " +
            "(ver CODING_STANDARDS.md § Claim only what is built and measured).",
        );
      }
      if (ticket.raiz !== undefined) {
        for (const fichero of ficherosCitadosEnComentarios(ticket.contenido)) {
          if (!existsSync(join(ticket.raiz, fichero))) {
            hallazgos.push(
              `${ticket.path}: el comentario cita «${fichero}», que no existe en el repo: ` +
                "un diagnóstico que nombra un fichero de otro sitio no se puede comprobar.",
            );
          }
        }
      }
      continue;
    }

    if (abiertas === 0 && hechas > 0 && motivoDeclarado(ticket.contenido) === undefined) {
      hallazgos.push(
        `${ticket.path}: Status "${estado}" con sus ${hechas} casilla/s ya hechas: ` +
          "el ticket está construido y el estado dice que no. Es `done`, o " +
          "declara por qué espera con `**Status depende de:**` (ver " +
          "docs/agents/issue-tracker.md).",
      );
    }
  }
  return hallazgos;
}
