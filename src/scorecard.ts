import type { ResultadoEjecucion } from "./ejecutar.js";
import type { Grade } from "./grader.js";
import type { Pin } from "./pin.js";

/**
 * El veredicto agregado de un Caso (ADR-0007): el Grade de una Ejecución no es
 * el veredicto del Caso — la política vive por encima de él.
 *
 * - `PASA`: al menos una de las Ejecuciones que alcanzaron el skill es correcta.
 * - `SUSPENDE`: alguna alcanzó el skill, pero ninguna fue correcta.
 * - `INDETERMINADO`: ninguna Ejecución alcanzó el skill; no es suspenso, es que
 *   no hay dato para juzgar el skill (el agente no arrancó).
 */
export type VeredictoCaso = "PASA" | "SUSPENDE" | "INDETERMINADO";

/** La Ejecución que se considera correcta para el veredicto del Caso. */
const GRADE_CORRECTO = "EXCELENTE";

/** Orden de Grades, para desempatar cuál es «la mejor» Ejecución de un Caso. */
const RANGO_GRADE: Record<Grade, number> = {
  INACEPTABLE: 0,
  ACEPTABLE: 1,
  BUENO: 2,
  EXCELENTE: 3,
};

export interface CasoScorecard {
  caso: string;
  tipo: ResultadoEjecucion["tipo"];
  veredicto: VeredictoCaso;
  /** Total de Ejecuciones del Caso. */
  ejecuciones: number;
  /** Ejecuciones cuyo Flujo observado contiene el skill bajo test (denominador limpio). */
  alcanzaronSkill: number;
  /** Ejecuciones que alcanzaron el skill, con Artefacto y Grade EXCELENTE («entregó bien»). */
  correctas: number;
  /** Ejecuciones que alcanzaron el skill, tienen Artefacto y no aprobaron los Checks. */
  entregoMal: number;
  /** Ejecuciones que alcanzaron el skill pero no produjeron Artefacto («no entregó»). */
  sinArtefacto: number;
  /** Checks fallados, con su severidad, para leer el Scorecard sin transcripciones. */
  fallos: { id: string; severity: "guard" | "quality" }[];
  /**
   * Resumen de Checks de la **mejor** Ejecución que alcanzó el skill (la que
   * decide el veredicto): guards OK/total y el Grade de calidad. Es lo que deja
   * ver «guards verdes + puntuación de calidad» sin abrir la transcripción, y en
   * un Caso INDETERMINADO queda en cero (no hubo Ejecución que juzgar).
   */
  guards: { ok: number; total: number };
  gradeCalidad: Grade;
}

export interface SkillScorecard {
  skill: string;
  casos: CasoScorecard[];
  pasados: number;
  suspendidos: number;
  indeterminados: number;
}

export interface Scorecard {
  /** El Pin testeado: commit + fecha. Todo reporte lo declara. */
  pin: Pick<Pin, "ref" | "commit" | "fecha" | "repo">;
  skills: SkillScorecard[];
}

function esCorrecta(ejecucion: ResultadoEjecucion): boolean {
  return ejecucion.entrega === "con-artefacto" && ejecucion.grade === GRADE_CORRECTO;
}

/**
 * Las Ejecuciones que alcanzaron el skill bajo test: el **denominador limpio**
 * del ADR-0007. Las que no lo alcanzaron no evalúan el skill, así que no entran
 * en ninguna cuenta del Caso. Es el único predicado que define el denominador;
 * `veredictoDe`, `mejorEjecucion` y `agregarCaso` lo comparten.
 */
function conDatoDe(ejecuciones: ResultadoEjecucion[]): ResultadoEjecucion[] {
  return ejecuciones.filter((e) => e.flujoAlcanzoSkill);
}

function veredictoDe(ejecuciones: ResultadoEjecucion[]): VeredictoCaso {
  const conDato = conDatoDe(ejecuciones);
  if (conDato.length === 0) return "INDETERMINADO";
  return conDato.some(esCorrecta) ? "PASA" : "SUSPENDE";
}

function fallosDe(ejecuciones: ResultadoEjecucion[]): CasoScorecard["fallos"] {
  const vistos = new Map<string, "guard" | "quality">();
  for (const ejecucion of ejecuciones) {
    if (ejecucion.entrega === "sin-artefacto") continue;
    for (const check of ejecucion.detalle) {
      if (!check.passed) vistos.set(check.id, check.severity);
    }
  }
  return [...vistos].map(([id, severity]) => ({ id, severity }));
}

function guardsDe(ejecucion: ResultadoEjecucion): { ok: number; total: number } {
  const guards = ejecucion.detalle.filter((d) => d.severity === "guard");
  return { ok: guards.filter((d) => d.passed).length, total: guards.length };
}

/**
 * La Ejecución que representa el Caso en el resumen: la que más guards pasó y,
 * a igualdad, la de mejor Grade. Sólo entre las que alcanzaron el skill (las que
 * no, no evalúan el skill y no aportan dato). Devuelve undefined si no hubo
 * ninguna: es el Caso indeterminado.
 */
function mejorEjecucion(ejecuciones: ResultadoEjecucion[]): ResultadoEjecucion | undefined {
  const conDato = conDatoDe(ejecuciones);
  if (conDato.length === 0) return undefined;
  return conDato.reduce((mejor, actual) => {
    const okMejor = guardsDe(mejor).ok;
    const okActual = guardsDe(actual).ok;
    if (okActual !== okMejor) return okActual > okMejor ? actual : mejor;
    return RANGO_GRADE[actual.grade] > RANGO_GRADE[mejor.grade] ? actual : mejor;
  });
}

/**
 * El resumen de un Caso. **Todas las cuentas se miden sobre el denominador
 * limpio** (las Ejecuciones que alcanzaron el skill, ADR-0007): re-mezclar las
 * que no arrancaron el skill es justo el bug que el ticket 15 separó. Así
 * `correctas + entregoMal + sinArtefacto === alcanzaronSkill`, y un Caso
 * INDETERMINADO sale a cero en las tres (no se contradice con su veredicto).
 */
function agregarCaso(
  caso: string,
  ejecuciones: ResultadoEjecucion[],
): CasoScorecard {
  const conDato = conDatoDe(ejecuciones);
  const conArtefacto = conDato.filter((e) => e.entrega === "con-artefacto");
  const correctas = conDato.filter(esCorrecta);
  const mejor = mejorEjecucion(ejecuciones);
  return {
    caso,
    tipo: ejecuciones[0]!.tipo,
    veredicto: veredictoDe(ejecuciones),
    ejecuciones: ejecuciones.length,
    alcanzaronSkill: conDato.length,
    correctas: correctas.length,
    entregoMal: conArtefacto.filter((e) => !esCorrecta(e)).length,
    sinArtefacto: conDato.filter((e) => e.entrega === "sin-artefacto").length,
    fallos: fallosDe(conDato),
    guards: mejor ? guardsDe(mejor) : { ok: 0, total: 0 },
    gradeCalidad: mejor?.grade ?? "INACEPTABLE",
  };
}

function agruparPor<T>(items: T[], clave: (item: T) => string): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const item of items) {
    const k = clave(item);
    const grupo = grupos.get(k);
    if (grupo) grupo.push(item);
    else grupos.set(k, [item]);
  }
  return grupos;
}

/**
 * Agrega las Ejecuciones de la suite en el JSON del Scorecard (fuente de verdad:
 * es lo que consume CI). Agrupa por Skill y por Caso, y aplica la política de N
 * del ADR-0007 (`veredictoDe`) sobre el denominador limpio.
 *
 * La forma es estable: las claves se emiten siempre, aunque el Caso no tenga
 * Ejecuciones de esa clase. Un reporte de CI no puede tener campos opcionales que
 * aparezcan o desaparezcan según los datos.
 */
export function agregarScorecard(
  ejecuciones: ResultadoEjecucion[],
  pin: Pin,
): Scorecard {
  const porSkill = agruparPor(ejecuciones, (e) => e.skill);

  const skills: SkillScorecard[] = [...porSkill].map(([skill, delSkill]) => {
    const porCaso = agruparPor(delSkill, (e) => e.caso);
    const casos = [...porCaso].map(([caso, dels]) => agregarCaso(caso, dels));
    return {
      skill,
      casos,
      pasados: casos.filter((c) => c.veredicto === "PASA").length,
      suspendidos: casos.filter((c) => c.veredicto === "SUSPENDE").length,
      indeterminados: casos.filter((c) => c.veredicto === "INDETERMINADO").length,
    };
  });

  return {
    pin: { ref: pin.ref, commit: pin.commit, fecha: pin.fecha, repo: pin.repo },
    skills,
  };
}

/**
 * Renderiza el Scorecard legible desde el JSON (que sigue siendo la fuente de
 * verdad: esto es sólo la vista). Una tabla por Skill con sus Casos, el
 * veredicto y el Grade, más las líneas de qué Check falló — para saber dónde
 * mirar sin abrir ninguna transcripción.
 */
export function renderScorecard(reporte: Scorecard): string {
  const lineas: string[] = [];
  lineas.push(`# Scorecard — Pin ${reporte.pin.commit} (${reporte.pin.fecha})`);
  if (reporte.pin.ref) lineas.push(`Ref: ${reporte.pin.ref}`);

  if (reporte.skills.length === 0) {
    lineas.push("", "Sin Ejecuciones.");
    return lineas.join("\n");
  }

  for (const skill of reporte.skills) {
    lineas.push("", `## ${skill.skill}`);
    lineas.push(
      `Casos: ${skill.casos.length} · PASA ${skill.pasados} · ` +
        `SUSPENDE ${skill.suspendidos} · INDETERMINADO ${skill.indeterminados}`,
    );
    lineas.push("");
    lineas.push("| Caso | Veredicto | Guards | Grade | Ejecuciones | Con dato | Correctas | No entregó | Entregó mal |");
    lineas.push("|---|---|---|---|---|---|---|---|---|");

    for (const caso of skill.casos) {
      const guards =
        caso.guards.total === 0 ? "—" : `${caso.guards.ok}/${caso.guards.total}`;
      lineas.push(
        `| ${caso.caso} | ${caso.veredicto} | ${guards} | ${caso.gradeCalidad} | ` +
          `${caso.ejecuciones} | ${caso.alcanzaronSkill} | ${caso.correctas} | ` +
          `${caso.sinArtefacto} | ${caso.entregoMal} |`,
      );
    }

    for (const caso of skill.casos) {
      if (caso.fallos.length === 0) continue;
      lineas.push("");
      lineas.push(`Fallos de \`${caso.caso}\`:`);
      for (const fallo of caso.fallos) {
        lineas.push(`  - [${fallo.severity}] ${fallo.id}`);
      }
    }
  }

  return lineas.join("\n");
}

