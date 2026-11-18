import type { Check } from "./caso.js";
import type { ResultadoEjecucion } from "./ejecutar.js";
import type { Grade, GradeResult } from "./grader.js";
import { gradoDeEvidencia } from "./grader.js";
import { seccionDeSkill } from "./seccion-skill.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * El **tier rápido** (ticket 08 del bucle de refinamiento): dos artefactos
 * baratos que contestan preguntas **distintas** y por eso no comparten gate.
 *
 * - (a) **Replay del grader**: los Artefactos de una Ejecución ya guardada pasan
 *   otra vez por `grader.ts` y tienen que dar el mismo Grade. Pregunta «¿derivó
 *   el grader?». Es determinista, y por eso **es** un guardarraíl.
 * - (b) **Checklist Skill → Casos**: qué afirma cada Caso sobre el contenido de
 *   los `SKILL.md`, para decir qué Casos re-correr tras editar una sección.
 *   Pregunta «¿qué Casos dependen de lo que acabo de editar?». **No es un gate**:
 *   fallará cada vez que un Skill se mejore legítimamente, y ese rojo no es un
 *   defecto de nada.
 *
 * Las dos reglas son puras —reciben lo ya leído de disco y devuelven hechos—; los
 * adaptadores que leen disco y escriben son `scripts/replay-grader.ts` y
 * `scripts/checklist-casos.ts`.
 */

/**
 * De dónde salen las dos cosas que el replay necesita para re-graduar sin que el
 * Caso del disco se cuele en la cuenta: los Checks con los que se graduó y el
 * Gold-HTML con el que se compararon los guards de fidelidad.
 *
 * `desde-la-ejecucion` (el camino normal) re-gradua con lo que la propia
 * Ejecución trae. `desde-el-caso` es el respaldo: una Ejecución anterior al
 * ticket 06 no lleva `assert` por Check, y sin él no hay aserción que volver a
 * evaluar. Se lee el Caso del disco y se dice en voz alta.
 */
export type OrigenDeLosChecks = "desde-la-ejecucion" | "desde-el-caso";

export interface CasoDelDisco {
  checks: Check[];
  /** El Gold-HTML del Caso-página, si lo tiene. */
  gold?: string;
}

export interface ReplayDeEjecucion {
  /** La Ejecución guardada, tal cual se leyó. */
  ejecucion: ResultadoEjecucion;
  /** La ruta de su fichero de Evidencia, para poder abrirla. */
  origen: string;
  /** De dónde se tomaron los Checks con los que se re-graduó. */
  origenChecks: OrigenDeLosChecks;
  /**
   * Los campos de la Ejecución que no vinieron con ella (`exitCode` del ticket
   * 02, `arbolHash` del 04). No hace fallar el replay —el Grade es lo que se
   * comprueba—, pero se dice: la mitad de la Evidencia no estaba cuando se
   * escribió.
   */
  faltanCampos: string[];
}

export type EstadoDelReplay = "reproduce" | "deriva";

export interface DiferenciaDeCheck {
  id: string;
  guardado: boolean;
  actual: boolean;
}

export interface ResultadoDelReplay {
  skill: string;
  caso: string;
  /** El fichero de Evidencia, o su ruta relativa, para poder abrirla. */
  origen: string;
  /**
   * La Ejecución tal como se leyó. Viaja para que el adaptador pueda decir qué
   * campos le faltan (tickets 02/04) sin volver a leer el fichero.
   */
  ejecucion: ResultadoEjecucion;
  /** De dónde salieron los Checks con los que se re-graduó. */
  origenChecks: OrigenDeLosChecks;
  /** Los campos que la Ejecución no traía (ver `camposQueFaltan`). */
  faltanCampos: string[];
  gradeGuardado: Grade;
  gradeActual: Grade;
  estado: EstadoDelReplay;
  /** Los Checks que cambiaron de veredicto: vacío si sólo cambió el Grade por pesos. */
  checksQueCambian: DiferenciaDeCheck[];
}

/**
 * La Evidencia de una Ejecución en la forma que el grader recibe: los Artefactos
 * y el Flujo, que es **todo** lo que `grado` mira. El Gold lo pasa el adaptador
 * aparte porque vive en el Caso, no en la Ejecución (ver `goldDeCaso`).
 *
 * `artefactos` y `transcript` son lo que viaja, no la salida del SUT: re-graduar
 * sobre el stdout leería un transcript distinto del que se graduó la primera vez.
 */
function evidenciaDe(ejecucion: ResultadoEjecucion) {
  return {
    artefactos: { files: ejecucion.artefactos },
    transcript: { invocaciones: ejecucion.flujoObservado },
  };
}

/** ¿La Ejecución guardada trae lo mínimo para re-graduarse sola? */
function checksDeLaEjecucion(ejecucion: ResultadoEjecucion): Check[] | undefined {
  if (ejecucion.detalle.length === 0) return undefined;
  const checks: Check[] = [];
  for (const check of ejecucion.detalle) {
    if (check.assert === undefined) return undefined;
    checks.push({
      id: check.id,
      severity: check.severity,
      // El peso no viaja en el detalle: el Grade de calidad lo decide, y el
      // replay sólo compara con el Grade guardado. Un 1 es neutro para el
      // veredicto de cada Check; si el de hoy discrepara del guardado, el score
      // del Caso se vería en `scorecard.test.ts`, no aquí.
      weight: 1,
      assert: check.assert,
    });
  }
  return checks;
}

/**
 * Re-graduar una Ejecución guardada. Los Checks salen, por orden de preferencia,
 * de la propia Ejecución (así el Caso de hoy no puede mover la cuenta) o, si no
 * los trae, del Caso del disco —y se declara—. El Gold sólo puede venir del Caso:
 * no se persiste en la Ejecución porque es la página de referencia, no Evidencia
 * del SUT.
 */
export function replayDeEjecucion(
  ejecucion: ResultadoEjecucion,
  origen: string,
  casoDelDisco: CasoDelDisco | undefined,
): ResultadoDelReplay {
  const deLaEjecucion = checksDeLaEjecucion(ejecucion);
  const checks = deLaEjecucion ?? casoDelDisco?.checks;
  const origenChecks: OrigenDeLosChecks =
    deLaEjecucion === undefined ? "desde-el-caso" : "desde-la-ejecucion";

  const base: Omit<ResultadoDelReplay, "gradeActual" | "estado" | "checksQueCambian"> = {
    skill: ejecucion.skill,
    caso: ejecucion.caso,
    origen,
    ejecucion,
    origenChecks,
    faltanCampos: camposQueFaltan(ejecucion),
    gradeGuardado: ejecucion.grade,
  };

  if (checks === undefined) {
    // Sin Checks no hay nada que re-graduar. No se inventa un Grade ni se da el
    // replay por bueno: se dice que la Evidencia no alcanza para re-graduarla.
    throw new Error(
      `${origen}: la Ejecución no trae \`assert\` por Check (anterior al ticket 06) y ` +
        `el Caso ${ejecucion.skill}/${ejecucion.caso} no está en \`casos/\`: ` +
        "no hay con qué re-graduarla.",
    );
  }

  const actual: GradeResult = gradoDeEvidencia(evidenciaDe(ejecucion), {
    tipo: ejecucion.tipo,
    checksJson: JSON.stringify({ checks: checks.map(sinAncla) }),
    ...(casoDelDisco?.gold === undefined ? {} : { gold: casoDelDisco.gold }),
  });

  const guardados = new Map(ejecucion.detalle.map((d) => [d.id, d.passed]));
  const checksQueCambian: DiferenciaDeCheck[] = actual.detalle
    .filter((d) => guardados.has(d.id) && guardados.get(d.id) !== d.passed)
    .map((d) => ({ id: d.id, guardado: guardados.get(d.id)!, actual: d.passed }));

  return {
    ...base,
    gradeActual: actual.grade,
    estado: actual.grade === ejecucion.grade ? "reproduce" : "deriva",
    checksQueCambian,
  };
}

/**
 * El Check sin su `ancla`: `gradoDeEvidencia` recibe Checks en crudo, y el ancla
 * es la cita del informe (ticket 06), no una entrada del grader.
 */
function sinAncla(check: Check): object {
  const { ancla: _ancla, ...sin } = check;
  return sin;
}

/**
 * Los hechos que una Ejecución guardada no conserva y que el ticket 08 declaró
 * obligatorios (`exitCode` del ticket 02, `arbolHash` del 04). Es opcional en el
 * tipo porque una Ejecución vieja existe; el replay lo **dice** en vez de
 * reventar, y el guardarraíl falla sólo si el fichero no trae ni el Grade.
 */
export function camposQueFaltan(ejecucion: Partial<ResultadoEjecucion>): string[] {
  const faltan: string[] = [];
  if (typeof ejecucion.exitCode !== "number") faltan.push("exitCode");
  if (typeof ejecucion.arbolHash !== "string" || ejecucion.arbolHash.length === 0) {
    faltan.push("arbolHash");
  }
  return faltan;
}

/**
 * El replay completo de un árbol de Ejecuciones, en el orden en que se leen. Si
 * alguna Ejecución no se puede re-graduar, el error la nombra y el adaptador sale
 * en rojo: un replay que se salta una Evidencia en silencio no prueba nada.
 */
export function replayDeEjecuciones(
  lecturas: { origen: string; ejecucion: ResultadoEjecucion }[],
  casos: (skill: string, caso: string) => CasoDelDisco | undefined,
): { resultados: ResultadoDelReplay[]; declaranGrade: number } {
  return {
    resultados: lecturas.map(({ origen, ejecucion }) =>
      replayDeEjecucion(ejecucion, origen, casos(ejecucion.skill, ejecucion.caso)),
    ),
    declaranGrade: lecturas.filter(({ ejecucion }) => typeof ejecucion.grade === "string")
      .length,
  };
}

/** ¿Cuántas Ejecuciones no reproducen su Grade? Es el veredicto del guardarraíl. */
export function derivas(resultados: ResultadoDelReplay[]): ResultadoDelReplay[] {
  return resultados.filter((r) => r.estado === "deriva");
}

/** La línea de consola de un replay: una por Ejecución, con lo que cambió si cambió. */
export function renderLineaDeReplay(r: ResultadoDelReplay): string {
  const donde = `${r.skill}/${r.caso} ← ${r.origen}`;
  if (r.estado === "reproduce") {
    return `OK  ${donde} → ${r.gradeActual}`;
  }
  const cambios =
    r.checksQueCambian.length === 0
      ? "los Checks dan lo mismo: cambió el Grade (pesos o Framework)"
      : r.checksQueCambian
          .map((c) => `${c.id} ${c.guardado ? "✓" : "✗"} → ${c.actual ? "✓" : "✗"}`)
          .join(", ");
  return `DERIVA  ${donde} → guardado ${r.gradeGuardado}, hoy ${r.gradeActual}; ${cambios}`;
}

// ---------------------------------------------------------------------------
// (b) Checklist Skill → Casos
// ---------------------------------------------------------------------------

/**
 * Un hecho del Skill del que un Caso depende, con su ubicación. Por defecto es un
 * texto que debe **estar** en una sección; `ausente` es lo que **hoy** no está y
 * el Caso depende de que siga sin estar (una petición de cambio sin aplicar). Un
 * hallazgo de esa clase **no** deja el texto ausente para siempre: cuando se
 * aplica, el hecho deja de estar vigente, y eso es el aviso, no un fallo.
 */
export interface AfirmacionDelSkill {
  /** El Skill al que pertenece la sección (`desy-styles-reference`). */
  skill: string;
  /** Qué se comprueba, en una frase para el informe. */
  resumen: string;
  /** El título exacto de la sección del `SKILL.md` donde vive. */
  seccion: string;
  /** Texto que la sección debe contener. */
  contiene?: string;
  /** Texto que la sección NO debe contener (para lo retirado a propósito). */
  ausente?: string;
  /** El Caso de este repo que lo mide, si lo mide. */
  caso?: string;
  /** Qué hará el Caso si el hecho cambia: p. ej. «el Guard cae». */
  efecto?: string;
}

export type EstadoDeAfirmacion = "vigente" | "cambiada" | "sin-seccion";

export interface ResultadoDeAfirmacion extends AfirmacionDelSkill {
  /** Si el hecho sigue vigente en el `SKILL.md` del árbol consultado. */
  estado: EstadoDeAfirmacion;
  /** Por qué no está vigente: lo que falta, lo que sobra o la sección que no existe. */
  motivo?: string;
}

/**
 * El contrato del repo con los Skills: qué afirma cada Caso del contenido de los
 * `SKILL.md`, y por tanto qué Casos hay que re-correr si eso cambia.
 *
 * No es la lista de todo lo que hay en los Skills: es la de lo que un Caso mide
 * **por el texto de la sección** (no por el catálogo, que tiene su propio
 * guardarraíl). Por eso son pocos y cada uno nombra su Caso.
 */
export const AFIRMACIONES_DEL_REPO: readonly AfirmacionDelSkill[] = [
  {
    skill: "desy-styles-reference",
    resumen:
      "La escala de espaciado fija la unidad base en 1rem y nombra sus utilidades `p-base`/`gap-base`",
    seccion: "Espaciado (escala de tokens del proyecto)",
    contiene: "`gap-base`",
    caso: "styles-reference/token-espaciado",
    efecto: "los Guards `token-base-16px`/`token-lg-28px` y `familia-gap-base`",
  },
  {
    skill: "desy-styles-reference",
    resumen: "La escala de espaciado mantiene los valores `16px` y `1.75rem` que el Caso declara",
    seccion: "Espaciado (escala de tokens del proyecto)",
    contiene: "1.75rem",
    caso: "styles-reference/token-espaciado",
    efecto: "el Guard `token-lg-28px` y la Quality `explica-la-unidad-base`",
  },
  {
    skill: "desy-implement-layout-patterns",
    resumen:
      "La rejilla del formulario sigue con el `gap-x-4` legacy (la deuda del estándar de tokens)",
    seccion: "Grid responsivo del formulario",
    contiene: "gap-x-4",
    caso: "implement-layout-patterns/fieldset-grid-acciones",
    efecto:
      "el Caso mide la rejilla (`lg:grid-cols-4`); si el Skill migra a `gap-base`, el Caso ya no mide lo mismo",
  },
  {
    skill: "desy-implement-component",
    resumen:
      "El Skill **no** indica copiar la página de prueba antes de trabajar (la petición está sin aplicar)",
    seccion: "Ejemplo 1: Botón \"Enviar\" en desy-angular",
    ausente: "página de prueba",
    caso: "implement-component/boton-primario",
    efecto:
      "es lo que pide `.scratch/bucle-de-refinamiento/peticiones/peticion-copiar-pagina-prueba.md`; " +
      "cuando se aplique, el hecho deja de estar vigente y el Caso se re-corre (el SUT con pin local " +
      "tiene que crear un `src/*.html` propio en vez de editar el de ejemplo)",
  },
];

/**
 * ¿La sección de un `SKILL.md` satisface la afirmación? Se lee la sección por su
 * **título** (nunca por número de línea): un Skill se edita y las líneas se
 * mueven, pero el título es con el que el autor del Skill la reconoce.
 */
export function evaluarAfirmacion(
  skill: string,
  skillMd: string | undefined,
  afirmacion: AfirmacionDelSkill,
): ResultadoDeAfirmacion {
  const base = { ...afirmacion, skill };
  if (skillMd === undefined) {
    return {
      ...base,
      estado: "sin-seccion",
      motivo: `no hay \`SKILL.md\` para \`${skill}\` en el árbol`,
    };
  }
  const seccion = seccionDeSkill(skillMd, afirmacion.seccion);
  if (seccion === undefined) {
    return {
      ...base,
      estado: "sin-seccion",
      motivo: `la sección «${afirmacion.seccion}» no existe en el \`SKILL.md\` de \`${skill}\``,
    };
  }
  if (afirmacion.contiene !== undefined && !seccion.includes(afirmacion.contiene)) {
    return {
      ...base,
      estado: "cambiada",
      motivo: `la sección «${afirmacion.seccion}» ya no contiene \`${afirmacion.contiene}\``,
    };
  }
  if (afirmacion.ausente !== undefined && seccion.includes(afirmacion.ausente)) {
    return {
      ...base,
      estado: "cambiada",
      motivo: `la sección «${afirmacion.seccion}» ya contiene «${afirmacion.ausente}»`,
    };
  }
  return { ...base, estado: "vigente" };
}

/**
 * La checklist completa. `skillMd` resuelve el texto de un Skill del árbol que se
 * consulta; la devuelve el adaptador (el `vendor/` versionado o un
 * `--skills-local`), para que la regla no sepa dónde viven los Skills.
 */
export function checklist(
  afirmaciones: readonly AfirmacionDelSkill[],
  skillMd: (skill: string) => string | undefined,
): {
  queReCorrer: string[];
  vigentes: ResultadoDeAfirmacion[];
  cambiadas: ResultadoDeAfirmacion[];
} {
  const resultados = afirmaciones.map((a) => evaluarAfirmacion(a.skill, skillMd(a.skill), a));
  const cambiadas = resultados.filter((r) => r.estado !== "vigente");
  const queReCorrer = [
    ...new Set(cambiadas.flatMap((r) => (r.caso === undefined ? [] : [r.caso]))),
  ].sort();
  return {
    queReCorrer,
    vigentes: resultados.filter((r) => r.estado === "vigente"),
    cambiadas,
  };
}

/**
 * El lector de `SKILL.md` sobre un árbol de Skills, con su caché: devuelve el
 * fichero **entero**, que es lo que la checklist contrasta (el lector del informe
 * devuelve una sección, y la checklist necesita resolver varios títulos del
 * mismo fichero). Sin `SKILL.md` en el árbol devuelve `undefined`, y la checklist
 * lo dice en vez de suponer que la sección existe.
 */
export function lectorDeSkillMd(arbolDeSkills: string): (skill: string) => string | undefined {
  const cache = new Map<string, string | undefined>();
  return (skill) => {
    if (!cache.has(skill)) {
      const path = join(arbolDeSkills, skill, "SKILL.md");
      cache.set(skill, existsSync(path) ? readFileSync(path, "utf8") : undefined);
    }
    return cache.get(skill);
  };
}
