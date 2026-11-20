import type { Scorecard } from "./scorecard.js";

/**
 * El **scorecard de versión** (ticket 09): la conclusión de una suite sobre una
 * versión de los skills, pequeña y `git diff`-able. Vive fuera del árbol de
 * Ejecuciones —que sigue ignorado por pesado— y su nombre es el `arbolHash` del
 * contenido medido: el hash, no el commit, es la identidad de versión (ticket
 * 04), así que dos corridas del mismo contenido sobre el mismo commit son la
 * misma versión y no duplican fichero.
 *
 * Es el mismo JSON que el `scorecard.json` de la corrida, sin re-envolver: si
 * hubiera dos formas de decir lo mismo, el diff compararía la que no se mide.
 */
export interface ScorecardDeVersion {
  /** La identidad de lo medido: el nombre del fichero es este hash. */
  arbolHash: string;
  pin: Scorecard["pin"];
  skills: Scorecard["skills"];
  /**
   * Las corridas que han medido esta versión, la última al final (ticket 23).
   *
   * Sin esto, medir dos veces el mismo árbol reescribía el fichero y borraba la
   * medida anterior: no había de dónde leer el criterio de **dos corridas
   * consecutivas** del ADR-0014. `skills` sigue siendo la última corrida, para
   * que `diff-versiones` y todo lo que lee una versión no cambien.
   *
   * Opcional a propósito: un fichero escrito antes de esta regla no lo trae.
   */
  corridas?: CorridaDeVersion[];
}

/** Lo que se guarda de una corrida: cuándo fue y cómo salió cada Caso. */
export interface CorridaDeVersion {
  /** ISO-8601. En un legado sin historial se usa la fecha del Pin, que es lo único que hay. */
  fecha: string;
  /** `skill/caso` → veredicto. */
  veredictos: Record<string, string>;
}

/** Cuántas corridas se conservan por versión: la historia útil sin crecer sin fin. */
export const CORRIDAS_QUE_SE_GUARDAN = 10;

/** Los veredictos de una versión, indexados como los lee `pasaSostenido`. */
function veredictosDe(version: ScorecardDeVersion): Record<string, string> {
  const veredictos: Record<string, string> = {};
  for (const skill of version.skills) {
    for (const caso of skill.casos) {
      veredictos[`${skill.skill}/${caso.caso}`] = caso.veredicto;
    }
  }
  return veredictos;
}

/**
 * Añade una corrida al historial de una versión (ticket 23), sin destruir las
 * anteriores y sin pasar del tope.
 *
 * Si la versión anterior es un **legado** sin historial, se abre con ella misma:
 * su medida existió y perderla ahora sería repetir el fallo que este ticket
 * arregla. La fecha de esa entrada es la del Pin, la única que el fichero guarda.
 */
export function agregarCorrida(
  anterior: ScorecardDeVersion | undefined,
  nueva: ScorecardDeVersion,
  fecha: string,
  tope: number = CORRIDAS_QUE_SE_GUARDAN,
): ScorecardDeVersion {
  const previas: CorridaDeVersion[] =
    anterior === undefined
      ? []
      : (anterior.corridas ?? [{ fecha: anterior.pin.fecha, veredictos: veredictosDe(anterior) }]);
  const corridas = [...previas, { fecha, veredictos: veredictosDe(nueva) }].slice(-tope);
  return { ...nueva, corridas };
}

/**
 * Qué se versiona de un scorecard. Exige `arbolHash`: un scorecard sin hash no
 * sabe de qué versión habla, y versionarlo con `HASH_DESCONOCIDO` de nombre
 * haría que dos corridas sin identidad se pisaran entre sí.
 *
 * El Pin se copia **sin** `repo`: en un Pin local esa ruta es un checkout del
 * mantenedor (ADR-0015), y lo versionado no lleva la ruta de nadie. Los hechos
 * —`ref`, `commit`, `fecha`— sí, porque sitúan la versión.
 */
export function scorecardDeVersion(scorecard: Scorecard): ScorecardDeVersion {
  if (scorecard.arbolHash === undefined) {
    throw new Error(
      "El Scorecard no declara arbolHash: no hay versión que versionar " +
        "(se calcula al medir, ticket 04).",
    );
  }
  return {
    arbolHash: scorecard.arbolHash,
    pin: { ref: scorecard.pin.ref, commit: scorecard.pin.commit, fecha: scorecard.pin.fecha },
    skills: scorecard.skills,
  };
}

/** El contenido del fichero de versión: JSON con salto final, como el resto. */
export function serializarVersion(version: ScorecardDeVersion): string {
  return JSON.stringify(version, null, 2) + "\n";
}

/** Una versión que todavía no se ha medido, o que no se sabe de qué habla. */
export function validarVersion(raw: unknown): ScorecardDeVersion {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("scorecard de versión inválido: se esperaba un objeto");
  }
  const version = raw as Partial<ScorecardDeVersion>;
  if (typeof version.arbolHash !== "string" || version.arbolHash.length === 0) {
    throw new Error('scorecard de versión inválido: falta el campo "arbolHash"');
  }
  if (typeof version.pin !== "object" || version.pin === null) {
    throw new Error('scorecard de versión inválido: falta el campo "pin"');
  }
  if (!Array.isArray(version.skills)) {
    throw new Error('scorecard de versión inválido: falta el campo "skills"');
  }
  if (version.corridas !== undefined && !Array.isArray(version.corridas)) {
    throw new Error('scorecard de versión inválido: "corridas" tiene que ser una lista');
  }
  return version as ScorecardDeVersion;
}

/** Los Casos de una versión, indexados por `skill/caso` para cruzarlos. */
function casosPorClave(version: ScorecardDeVersion) {
  const casos = new Map<string, { skill: string; caso: Scorecard["skills"][number]["casos"][number] }>();
  for (const skill of version.skills) {
    for (const caso of skill.casos) {
      casos.set(`${skill.skill}/${caso.caso}`, { skill: skill.skill, caso });
    }
  }
  return casos;
}

/** Las cuentas que el diff compara de un Caso: veredicto y las tres de entrega. */
export interface CuentasDelCaso {
  veredicto: string;
  correctas: number;
  entregoMal: number;
  /** Las Ejecuciones que alcanzaron el skill y no entregaron (`sinArtefacto`). */
  sinEntregar: number;
}

/**
 * Lo que cambió en un Caso entre dos versiones. `antes` o `despues` falta cuando
 * el Caso sólo existe en una de las dos —un Caso nuevo o retirado—: decir que
 * «no cambió» sería mentir con un cero.
 */
export interface CambioDeCaso {
  skill: string;
  caso: string;
  antes?: CuentasDelCaso;
  despues?: CuentasDelCaso;
  /** `true` si las cuentas o el veredicto cambian, o el Caso aparece/desaparece. */
  cambio: boolean;
}

export interface CambioDeSkill {
  skill: string;
  antes?: { pasados: number; suspendidos: number; indeterminados: number };
  despues?: { pasados: number; suspendidos: number; indeterminados: number };
  cambio: boolean;
}

export interface DiffDeVersiones {
  a: { arbolHash: string; pin: Scorecard["pin"] };
  b: { arbolHash: string; pin: Scorecard["pin"] };
  casos: CambioDeCaso[];
  skills: CambioDeSkill[];
  /** Cuántos Casos y Skills cambian: el resumen que se lee primero. */
  resumen: { casos: number; skills: number };
}

function cuentasDe(caso: Scorecard["skills"][number]["casos"][number]): CuentasDelCaso {
  return {
    veredicto: caso.veredicto,
    correctas: caso.correctas,
    entregoMal: caso.entregoMal,
    sinEntregar: caso.sinArtefacto,
  };
}

function cuentasSkill(skill: Scorecard["skills"][number]) {
  return {
    pasados: skill.pasados,
    suspendidos: skill.suspendidos,
    indeterminados: skill.indeterminados,
  };
}

function mismasCuentas(a: CuentasDelCaso, b: CuentasDelCaso): boolean {
  return (
    a.veredicto === b.veredicto &&
    a.correctas === b.correctas &&
    a.entregoMal === b.entregoMal &&
    a.sinEntregar === b.sinEntregar
  );
}

/** Todos los Casos de las dos versiones, por `skill/caso`, en orden estable. */
function clavesDe(versiones: ScorecardDeVersion[]): string[] {
  return [...new Set(versiones.flatMap((v) => [...casosPorClave(v).keys()]))].sort();
}

/**
 * El **diff** entre dos versiones, por Caso y por Skill: el cambio de veredicto
 * y de correctas/entregó-mal/sin-entregar. Es una función pura sobre dos
 * scorecards de versión —sus JSON de fixture bastan para probarla— y no lee
 * nada de disco: quién es «a» y quién «b», y de dónde se leen, lo decide el
 * adaptador (`scripts/diff-versiones.ts`).
 *
 * Los Casos y Skills aparecen **todos**, cambien o no, para que el lector vea
 * lo que sigue igual sin cruzarlo a mano: `cambio` es lo que lo distingue.
 */
export function diffDeVersiones(
  a: ScorecardDeVersion,
  b: ScorecardDeVersion,
): DiffDeVersiones {
  const antes = casosPorClave(a);
  const despues = casosPorClave(b);
  const casos: CambioDeCaso[] = clavesDe([a, b]).map((clave) => {
    const enA = antes.get(clave);
    const enB = despues.get(clave);
    const skill = (enA ?? enB)!.skill;
    const caso = (enA ?? enB)!.caso.caso;
    const cuentasA = enA === undefined ? undefined : cuentasDe(enA.caso);
    const cuentasB = enB === undefined ? undefined : cuentasDe(enB.caso);
    const cambio =
      cuentasA === undefined || cuentasB === undefined || !mismasCuentas(cuentasA, cuentasB);
    return {
      skill,
      caso,
      ...(cuentasA === undefined ? {} : { antes: cuentasA }),
      ...(cuentasB === undefined ? {} : { despues: cuentasB }),
      cambio,
    };
  });

  const skillsA = new Map(a.skills.map((s) => [s.skill, s]));
  const skillsB = new Map(b.skills.map((s) => [s.skill, s]));
  const nombres = [...new Set([...skillsA.keys(), ...skillsB.keys()])].sort();
  const skills: CambioDeSkill[] = nombres.map((nombre) => {
    const enA = skillsA.get(nombre);
    const enB = skillsB.get(nombre);
    const hechosA = enA === undefined ? undefined : cuentasSkill(enA);
    const hechosB = enB === undefined ? undefined : cuentasSkill(enB);
    return {
      skill: nombre,
      ...(hechosA === undefined ? {} : { antes: hechosA }),
      ...(hechosB === undefined ? {} : { despues: hechosB }),
      cambio:
        hechosA === undefined ||
        hechosB === undefined ||
        JSON.stringify(hechosA) !== JSON.stringify(hechosB),
    };
  });

  return {
    a: { arbolHash: a.arbolHash, pin: a.pin },
    b: { arbolHash: b.arbolHash, pin: b.pin },
    casos,
    skills,
    resumen: {
      casos: casos.filter((c) => c.cambio).length,
      skills: skills.filter((s) => s.cambio).length,
    },
  };
}

/** Una versión de las cuentas en una celda: veredicto y correctas/entregó-mal/sin-entregar. */
function celdaDeCuentas(cuentas: CuentasDelCaso | undefined): string {
  if (cuentas === undefined) return "—";
  return `${cuentas.veredicto} · ${cuentas.correctas}/${cuentas.entregoMal}/${cuentas.sinEntregar}`;
}

/**
 * El diff legible. Cada fila dice `antes → después` de veredicto y de
 * correctas/entregó-mal/sin-entregar, con las tres cuentas en el orden de la
 * cabecera de la tabla (entregó bien, entregó mal, sin entregar).
 */
export function renderDiff(diff: DiffDeVersiones): string {
  const lineas: string[] = [];
  lineas.push(
    `# Diff de versiones — \`${diff.a.arbolHash.slice(0, 12)}\` → \`${diff.b.arbolHash.slice(0, 12)}\``,
  );
  lineas.push("");
  lineas.push(`A — ${diff.a.arbolHash} · Pin ${diff.a.pin.commit} (${diff.a.pin.fecha})`);
  lineas.push(`B — ${diff.b.arbolHash} · Pin ${diff.b.pin.commit} (${diff.b.pin.fecha})`);

  if (diff.resumen.casos === 0 && diff.resumen.skills === 0) {
    lineas.push("", "Sin cambios: las dos versiones dan las mismas cuentas por Caso y por Skill.");
    return lineas.join("\n");
  }

  lineas.push(
    "",
    `**Cambian ${diff.resumen.casos} Caso/s y ${diff.resumen.skills} Skill/s.** ` +
      "Cada cuenta va como correctas/entregó-mal/sin-entregar.",
    "",
    "| Caso | Antes | Después | Cambia |",
    "|---|---|---|---|",
  );
  for (const caso of diff.casos) {
    lineas.push(
      `| ${caso.skill}/${caso.caso} | ${celdaDeCuentas(caso.antes)} | ` +
        `${celdaDeCuentas(caso.despues)} | ${caso.cambio ? "sí" : "no"} |`,
    );
  }

  lineas.push(
    "",
    "| Skill | Antes (PASA/SUSPENDE/INDET.) | Después | Cambia |",
    "|---|---|---|---|",
  );
  for (const skill of diff.skills) {
    const fmt = (s: CambioDeSkill["antes"]): string =>
      s === undefined ? "—" : `${s.pasados}/${s.suspendidos}/${s.indeterminados}`;
    lineas.push(
      `| ${skill.skill} | ${fmt(skill.antes)} | ${fmt(skill.despues)} | ${skill.cambio ? "sí" : "no"} |`,
    );
  }

  return lineas.join("\n");
}
