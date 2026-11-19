import { cuentaComoEntrega, type ResultadoEjecucion } from "./ejecutar.js";
import type { ContradiccionDeSkill } from "./caso.js";
import type { Grade } from "./grader.js";
import type { Pin } from "./pin.js";
import { LOCAL, esPinLocal } from "./pin.js";

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
  /**
   * Las **entregas** del Caso que cuentan para el presupuesto y el veredicto: con
   * Artefacto **y** habiendo alcanzado el skill. Es lo que estaba mal nombrado
   * como `ejecuciones` mientras la N contaba intentos; desde el ticket 03 el
   * presupuesto es de entregas y el nombre dice lo que cuenta.
   *
   * Un Artefacto entregado **sin invocar el skill** no es una entrega del Caso: no
   * midió el skill, así que no lo aprueba ni consume su presupuesto de entregas.
   * Se cuenta en `hallazgosConArtefacto`.
   */
  entregas: number;
  /** Los **intentos** que costaron esas entregas: todas las Ejecuciones del Caso. */
  intentos: number;
  /** Ejecuciones cuyo Flujo observado contiene el skill bajo test (denominador limpio). */
  alcanzaronSkill: number;
  /** De las `entregas`, las de Grade EXCELENTE («entregó bien»). */
  correctas: number;
  /** De las `entregas`, las que no aprobaron los Checks («entregó mal»). */
  entregoMal: number;
  /** Ejecuciones que alcanzaron el skill pero no produjeron Artefacto («no entregó»). */
  sinArtefacto: number;
  /**
   * Ejecuciones que **no se pudieron medir** (ticket 21): el SUT dejó de
   * responder y se cortó, o no hubo conversación con el proveedor. No son «no
   * entregó» —no hubo juicio del skill— y por eso van aparte. La igualdad del
   * Caso pasa a ser `correctas + entregoMal + sinArtefacto + sinMedir ===
   * alcanzaronSkill`.
   */
  sinMedir: number;
  /**
   * Ejecuciones con Artefacto que **no** alcanzaron el skill. No son entregas ni
   * `sinArtefacto`: son el complemento del denominador limpio. Con contenido
   * EXCELENTE son el hallazgo de trigger (`hallazgosDeTrigger`).
   */
  hallazgosConArtefacto?: number;
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
  /**
   * Hallazgos de **trigger** del Caso (ticket 07): Ejecuciones que entregaron un
   * Artefacto EXCELENTE **sin invocar el skill**. Se cuenta aparte del veredicto
   * —no lo convierte en PASA—, pero se destaca en la cabecera: es un hecho sobre
   * la `description`/frontmatter del skill, no ruido, y el scorecard lo tiraba.
   */
  hallazgosDeTrigger: number;
  /**
   * De esas, las que traen un JSON de Evidencia en disco (`reports/.../*.json`) al
   * que apuntar. Es la parte que se pierde si sólo se lee el scorecard agregado:
   * el hallazgo remite a la Evidencia, no la reemplaza.
   */
  triggerConEvidencia: number;
  /**
   * Las contradicciones entre un Check y su skill que el Caso **declara** en su
   * `rubric.md` (ticket 13): el Check mide una cosa y la sección del skill
   * recomienda la contraria. No es un veredicto ni un fallo del SUT; se destaca en
   * la cabecera para que quien lea sólo el Scorecard lo vea. Cero, nunca ausente,
   * como el resto de la forma del JSON, aunque un `npm run report` de un árbol sin
   * `casos/` no pueda saberlas y deje la lista vacía.
   */
  contradiccionesDeclaradas: (ContradiccionDeSkill & { id: string })[];
}

export interface SkillScorecard {
  skill: string;
  casos: CasoScorecard[];
  pasados: number;
  suspendidos: number;
  indeterminados: number;
}

/**
 * El hash que se declara cuando no hay ninguno real: un scorecard construido en
 * un test, o un árbol de Ejecuciones mezclado a mano. Es un valor explícito, no
 * una cadena vacía: que un scorecard diga «desconocido» es información; que
 * parezca un hash inventado no lo es.
 */
export const HASH_DESCONOCIDO = "desconocido";

export interface Scorecard {
  /** El Pin testeado: commit + fecha, o —en una corrida local— `local` (ticket 05). */
  pin: Pick<Pin, "ref" | "commit" | "fecha" | "repo">;
  /**
   * La identidad de **qué skills se midieron**: hash del árbol copiado al
   * sandbox (ticket 04). El commit no basta — una versión local sucia no tiene
   * commit — y es este hash el que se compara entre versiones.
   *
   * Opcional porque `npm run report` agrega Ejecuciones ya hechas, y sólo las
   * nuevas declaran el hash; el agregador lo recoge de ellas cuando existe.
   */
  arbolHash?: string;
  skills: SkillScorecard[];
}

/** Cómo se nombra el Pin de una corrida local en todo lo que se lee (ticket 05). */
export const PIN_LOCAL_DECLARADO = "local (sin commit)";

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

/**
 * El hallazgo de trigger (ticket 07): una Ejecución que **entregó** un Artefacto
 * **EXCELENTE sin invocar el skill**. El ADR-0007 la deja fuera del denominador
 * —no midió el skill— pero lo que enseña no es del agente: es que el skill no se
 * disparó y aun así hubo entrega buena. Por eso no se descarta: se cuenta.
 *
 * Vive aquí, junto al veredicto que la descarta, para que descarte y hallazgo no
 * puedan divergir; el informe por Caso (`src/informe.ts`) lo re-exporta.
 */
export function esHallazgoDeTrigger(ejecucion: ResultadoEjecucion): boolean {
  return (
    ejecucion.entrega === "con-artefacto" &&
    ejecucion.grade === GRADE_CORRECTO &&
    !ejecucion.flujoAlcanzoSkill
  );
}

/**
 * Las entregas que **deciden** el veredicto: con Artefacto y habiendo alcanzado el
 * skill (`flujoAlcanzoSkill`). Es la intersección de los dos ejes del ADR-0007 y
 * el ADR-0014, y la usan el veredicto y **todas** las cuentas del Caso, para que no
 * puedan decir cosas distintas de las mismas Ejecuciones.
 *
 * Por qué la exclusión por eje: el ADR-0014 se apoya en el ADR-0007, que manda
 * descartar las que no llegaron al skill — y un Caso que no invocó el skill y aun
 * así entregó un Artefacto EXCELENTE es el **hallazgo de trigger** (ticket 07):
 * no midió el skill, así que no puede aprobarlo.
 */
function entregasQueDeciden(ejecuciones: ResultadoEjecucion[]): ResultadoEjecucion[] {
  return ejecuciones.filter(cuentaComoEntrega);
}

function veredictoDe(ejecuciones: ResultadoEjecucion[]): VeredictoCaso {
  const entregadas = entregasQueDeciden(ejecuciones);
  // Cero entregas ⇒ INDETERMINADO, nunca SUSPENDE (ADR-0014): no hay nada que
  // graduar, así que no hay juicio sobre el skill.
  if (entregadas.length === 0) return "INDETERMINADO";
  return entregadas.some(esCorrecta) ? "PASA" : "SUSPENDE";
}

/**
 * Regla: ¿está **refinada** una versión de skill? Dos corridas **consecutivas**
 * del mismo Caso, contadas por separado, y las dos PASA (ADR-0014). Una sola
 * corrida PASA con una entrega de tres significa «acertó una vez», que es
 * exactamente la conclusión que hacía desconfiar del scorecard.
 *
 * Vive aquí y no en el scorecard porque el scorecard agrega **una** suite: esta
 * regla compara dos, y por eso depende del versionado de scorecards (ticket 09).
 */
export function pasaSostenido(
  veredictos: readonly VeredictoCaso[],
): { refinado: boolean; motivo: string } {
  if (veredictos.length < 2) {
    return {
      refinado: false,
      motivo: `hacen falta dos corridas consecutivas y hay ${veredictos.length}`,
    };
  }
  // Sólo las dos últimas importan: refinado es «ahora pasa, y ya pasaba antes».
  const [penultima, ultima] = veredictos.slice(-2);
  if (penultima === "PASA" && ultima === "PASA") {
    return { refinado: true, motivo: "las dos últimas corridas PASA" };
  }
  const fallo = ultima !== "PASA" ? ultima : penultima;
  return { refinado: false, motivo: `la última corrida que no pasa es ${fallo}` };
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
  contradicciones?: ReadonlyMap<string, ContradiccionDeSkill>,
): CasoScorecard {
  const conDato = conDatoDe(ejecuciones);
  // Las que no se pudieron medir (ticket 21) no juzgan al skill: van aparte en
  // `sinMedir` y no se mezclan con las que sí llegaron a entregar o no.
  const medibles = conDato.filter((e) => e.infraestructura === undefined);
  const entregadas = entregasQueDeciden(ejecuciones);
  const correctas = entregadas.filter(esCorrecta);
  const mejor = mejorEjecucion(ejecuciones);
  // Los hallazgos de trigger NO están en `conDato`: el veredicto los descarta a
  // propósito. Se cuentan de las Ejecuciones completas del Caso (ticket 07).
  const triggers = ejecuciones.filter(esHallazgoDeTrigger);
  return {
    caso,
    tipo: ejecuciones[0]!.tipo,
    veredicto: veredictoDe(ejecuciones),
    entregas: entregadas.length,
    intentos: ejecuciones.length,
    alcanzaronSkill: conDato.length,
    correctas: correctas.length,
    // «Entregó mal» es un juicio de los Checks sobre una entrega que **se midió**:
    // una que no llegó al skill no se juzga, dice otra cosa (ver el hallazgo).
    entregoMal: entregadas.filter((e) => !esCorrecta(e)).length,
    sinArtefacto: medibles.filter((e) => e.entrega === "sin-artefacto").length,
    sinMedir: conDato.length - medibles.length,
    hallazgosConArtefacto: ejecuciones.filter(
      (e) => e.entrega === "con-artefacto" && !e.flujoAlcanzoSkill,
    ).length,
    fallos: fallosDe(medibles),
    guards: mejor ? guardsDe(mejor) : { ok: 0, total: 0 },
    gradeCalidad: mejor?.grade ?? "INACEPTABLE",
    hallazgosDeTrigger: triggers.length,
    triggerConEvidencia: triggers.filter((e) => e.evidencia !== undefined).length,
    contradiccionesDeclaradas: [...(contradicciones ?? [])].map(([id, c]) => ({ id, ...c })),
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
 *
 * `contradicciones` dice qué Casos declaran una contradicción con su skill
 * (ticket 13), por clave `<skill>/<caso>`: son de la **rúbrica**, no de las
 * Ejecuciones, y el agregador no las busca —quien lo llama las leyó de `casos/`—.
 * La entrada de un Caso que no está entre las Ejecuciones se ignora: un Caso que
 * no se midió no tiene Scorecard en el que destacar nada.
 */
export function agregarScorecard(
  ejecuciones: ResultadoEjecucion[],
  pin: Pin,
  arbolHash?: string,
  contradicciones?: ReadonlyMap<string, ReadonlyMap<string, ContradiccionDeSkill>>,
): Scorecard {
  const porSkill = agruparPor(ejecuciones, (e) => e.skill);

  const skills: SkillScorecard[] = [...porSkill].map(([skill, delSkill]) => {
    const porCaso = agruparPor(delSkill, (e) => e.caso);
    const casos = [...porCaso].map(([caso, dels]) =>
      agregarCaso(caso, dels, contradicciones?.get(`${skill}/${caso}`)),
    );
    return {
      skill,
      casos,
      pasados: casos.filter((c) => c.veredicto === "PASA").length,
      suspendidos: casos.filter((c) => c.veredicto === "SUSPENDE").length,
      indeterminados: casos.filter((c) => c.veredicto === "INDETERMINADO").length,
    };
  });

  return {
    // El Pin declarado es el de la corrida, con la ruta **relativa** del checkout
    // local cuando toca (`rutaEnElRepo` la construye). Qué se versiona de esto y
    // qué no es decisión del ticket 09, sobre esta misma forma.
    pin: { ref: pin.ref, commit: pin.commit, fecha: pin.fecha, repo: pin.repo },
    ...(arbolHash === undefined ? {} : { arbolHash }),
    skills,
  };
}

/**
 * La etiqueta del Pin en lo que se lee: `local (sin commit)` cuando la corrida
 * salió de un checkout local, el commit en cualquier otro caso. La decisión va por
 * `commit === LOCAL`, no por la marca `local` del Pin en memoria: el scorecard de
 * versión (ticket 09) se versiona sin la marca, y el H1 no puede depender de algo
 * que no se guardó. Una corrida local no puede leerse como si fuera un commit.
 */
export function etiquetaDelPin(pin: Scorecard["pin"]): string {
  return esPinLocal(pin) || pin.commit === LOCAL ? PIN_LOCAL_DECLARADO : pin.commit;
}

/**
 * Renderiza el Scorecard legible desde el JSON (que sigue siendo la fuente de
 * verdad: esto es sólo la vista). Una tabla por Skill con sus Casos, el
 * veredicto y el Grade, más las líneas de qué Check falló — para saber dónde
 * mirar sin abrir ninguna transcripción.
 */
export function renderScorecard(reporte: Scorecard): string {
  const lineas: string[] = [];
  lineas.push(`# Scorecard — Pin ${etiquetaDelPin(reporte.pin)} (${reporte.pin.fecha})`);
  if (reporte.pin.ref) lineas.push(`Ref: ${reporte.pin.ref}`);
  if (reporte.arbolHash) lineas.push(`Árbol ${reporte.arbolHash}`);

  if (reporte.skills.length === 0) {
    lineas.push("", "Sin Ejecuciones.");
    return lineas.join("\n");
  }

  // Lo alto del Scorecard es el hallazgo, no el Pin: una entrega EXCELENTE sin
  // invocar el skill es información sobre el trigger, y quien sólo lea la
  // cabecera tiene que verla antes que ninguna tabla (ticket 07).
  const hallazgos = reporte.skills.flatMap((skill) =>
    skill.casos.flatMap((caso) =>
      caso.hallazgosDeTrigger === 0
        ? []
        : [{ skill: skill.skill, caso: caso.caso, casoScorecard: caso }],
    ),
  );
  if (hallazgos.length > 0) {
    lineas.push(
      "",
      "## ⚠ Hallazgo de trigger: entrega correcta sin invocar el skill",
      "",
      "Hay Ejecuciones que entregaron un Artefacto EXCELENTE **sin invocar el skill**.",
      "No son dato del veredicto (ADR-0007: no midieron el skill, así que no lo",
      "aprueban), pero sí son prueba de que la `description`/frontmatter no lo disparó:",
      "eso se arregla en el skill, no en el check.",
      "",
    );
    for (const hallazgo of hallazgos) {
      const caso = hallazgo.casoScorecard;
      const evidencia =
        caso.triggerConEvidencia === caso.hallazgosDeTrigger
          ? "con Evidencia en disco"
          : caso.triggerConEvidencia === 0
            ? "sin Evidencia en disco"
            : `${caso.triggerConEvidencia} con Evidencia en disco`;
      lineas.push(
        `- \`${hallazgo.skill}/${hallazgo.caso}\` — ${caso.hallazgosDeTrigger} ` +
          `Ejecución/es (${evidencia}); veredicto del Caso: **${caso.veredicto}**`,
      );
    }
  }

  // La contradicción declarada con el skill sigue al hallazgo de trigger, también
  // en la cabecera: es información sobre el skill que el veredicto no puede dar
  // (ticket 13), y quien lea sólo el Scorecard tiene que verla antes que las tablas.
  const contradicciones = reporte.skills.flatMap((skill) =>
    skill.casos.flatMap((caso) =>
      caso.contradiccionesDeclaradas.map((c) => ({ caso: `${skill.skill}/${caso.caso}`, ...c })),
    ),
  );
  if (contradicciones.length > 0) {
    lineas.push(
      "",
      "## ⚠ El skill contradice este Check",
      "",
      "La rúbrica de estos Casos declara que una sección del skill recomienda lo",
      "contrario de lo que exige uno de sus Checks. No mueve el veredicto —el Check",
      "sigue midiendo lo que mide— ni dice cuál de los dos cambia: se presenta para",
      "que una persona decida, y su detalle está en el informe del Caso.",
      "",
    );
    for (const c of contradicciones) {
      lineas.push(
        `- \`${c.caso}\` — \`${c.id}\`: \`${c.skill}\` → «${c.seccion}» dice: ${c.texto}`,
      );
    }
  }

  // El CI lee el veredicto de un INDETERMINADO como verde (no bloquea), así que
  // el documento tiene que decir lo que la consola dice: un verde de un Caso que
  // no midió el skill no es un verde del skill.
  const indeterminados = reporte.skills.flatMap((skill) =>
    skill.casos.filter((caso) => caso.veredicto === "INDETERMINADO"),
  );
  if (indeterminados.length > 0) {
    lineas.push(
      "",
      `**INDETERMINADO:** ${indeterminados.length} Caso/s sin dato para juzgar el skill ` +
        `(${indeterminados.map((c) => `\`${c.caso}\``).join(", ")}): ninguno de sus ` +
        "intentos alcanzó el skill con un Artefacto que graduar. No bloquean, pero " +
        "tampoco aprueban.",
    );
  }

  for (const skill of reporte.skills) {
    lineas.push("", `## ${skill.skill}`);
    lineas.push(
      `Casos: ${skill.casos.length} · PASA ${skill.pasados} · ` +
        `SUSPENDE ${skill.suspendidos} · INDETERMINADO ${skill.indeterminados}`,
    );
    lineas.push("");
    // Intentos junto a entregas, no en lugar de ellas (ticket 03): la diferencia
    // entre las dos es la tasa de entrega, y es lo que dice si el presupuesto
    // topó. Un Caso que topa con 6 intentos y 2 entregas se lee de un vistazo.
    lineas.push(
      "| Caso | Veredicto | Guards | Grade | Intentos | Entregas | Con dato | " +
        "Correctas | No entregó | Entregó mal | Sin medir |",
    );
    lineas.push("|---|---|---|---|---|---|---|---|---|---|---|");

    for (const caso of skill.casos) {
      const guards =
        caso.guards.total === 0 ? "—" : `${caso.guards.ok}/${caso.guards.total}`;
      lineas.push(
        `| ${caso.caso} | ${caso.veredicto} | ${guards} | ${caso.gradeCalidad} | ` +
          `${caso.intentos} | ${caso.entregas} | ${caso.alcanzaronSkill} | ` +
          `${caso.correctas} | ${caso.sinArtefacto} | ${caso.entregoMal} | ` +
          `${caso.sinMedir} |`,
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

