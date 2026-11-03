/**
 * El **legado** (ticket 10 del bucle de refinamiento): la evidencia que se midió
 * **antes** de la regla del ticket 01 —la que calcula el Veredicto de un Caso
 * sobre las Entregas y declara INDETERMINADO cuando ninguna entregó (ADR-0014)—.
 *
 * Vive en `reports/legado/`, versionado, y **fuera** del mecanismo de
 * comparación: `npm run diff-versiones` no lo lee, porque comparar un veredicto
 * de entonces con una Versión de skills de hoy es comparar dos medidas que no
 * dicen lo mismo. Lo que se conserva es el **porqué** (los dos HALLAZGOS, la
 * tasa de entrega que se midió), no el **qué** (los veredictos viejos como si
 * fueran una línea base: la línea base arranca vacía).
 *
 * El riesgo de un archivo así es que dentro de seis meses alguien lea
 * `SUSPENDE` y lo tome por un juicio del skill, como lo sería hoy. Por eso cada
 * corrida lleva una **cabecera de legado** (`LEGADO.md`) con la regla con la que
 * se midió y el Pin que declaró: `SUSPENDE` de entonces significa «alcanzó el
 * skill y no hubo entrega correcta», y con la regla nueva un Caso sin ninguna
 * entrega es INDETERMINADO.
 *
 * La regla es **pura**: recibe el JSON archivado y su contexto, y devuelve la
 * cabecera. Quién copia los ficheros y escribe los Markdown es
 * `scripts/archivar-legado.ts`.
 */

/**
 * Un **folio** del archivo: un fichero de una corrida que se puede nombrar en
 * una cabecera. Es lo que forma una corrida archivada.
 *
 * - `scorecard`: el Scorecard de la corrida (`skills` con `veredicto`).
 * - `resumen`: el resumen por Ejecución de un experimento (un array).
 * - `ejecucion`: una Ejecución persistida (`skill` + `caso` + `grade`).
 * - `texto`: una captura en prosa (la fuente exacta que reprodujo un HALLAZGO).
 * - `otro`: lo que no es ninguno: no se archiva sin contar qué es.
 */
export type FolioDeLegado = "scorecard" | "resumen" | "ejecucion" | "texto" | "otro";

/** Cómo se lee cada folio en la cabecera. */
const DESCRIPCION_DEL_FOLIO: Record<FolioDeLegado, string> = {
  scorecard: "El Scorecard de una corrida completa.",
  resumen: "El resumen por Ejecución de un experimento.",
  ejecucion: "Una Ejecución persistida.",
  texto: "Una captura en prosa de una Ejecución.",
  otro: "Un fichero que no es ninguno de los folios del archivo: no se archiva sin contarlo.",
};

/** La descripción con la que la cabecera explica qué es un fichero. */
export function descripcionDelFolio(folio: FolioDeLegado): string {
  return DESCRIPCION_DEL_FOLIO[folio];
}

/**
 * Qué se sabe del Pin con el que se midió. `comprobado` es lo único que la regla
 * nueva permite afirmar: el `arbolHash` (ticket 04) o la forma `entregas`/
 * `intentos` (ticket 03) prueban que se midió ese contenido. Antes de eso, el
 * commit es lo que la corrida **declaró**, y nadie comprobó que el árbol
 * medido coincidiera con él: es la mentira que el ticket 04 quitó.
 */
export type EstadoDelPin = "comprobado" | "declarado" | "desconocido";

export interface PinDeLegado {
  estado: EstadoDelPin;
  ref?: string;
  commit?: string;
  /** La fecha del Pin, con el formato del repo (`AAAA-MM-DD`). */
  fecha?: string;
}

/** La regla de medida con la que se hizo la corrida. */
export interface ReglaDeMedida {
  /** Cómo se llamaba entonces: `ADR-0007`, «experimento (lectura en línea)»… */
  nombre: string;
  /** En una frase: qué contaba como dato. */
  que: string;
  /** Qué significaba entonces un Caso que alcanzó el skill y no entregó nada. */
  entregaCero: string;
  /** El ADR que la fijaba, o `null` si nunca fue una decisión escrita. */
  adr: string | null;
}

export interface CabeceraDeLegado {
  /** De dónde se copió, relativo a la raíz del repo. */
  origen: string;
  /** Qué es este fichero de la corrida. */
  folio: FolioDeLegado;
  /** La fecha de la corrida. */
  fecha: string;
  pin: PinDeLegado;
  /** Ausente si nadie declaró con qué regla se midió: entonces no es legado. */
  regla?: ReglaDeMedida;
}

/** Lo que se sabe del fichero al archivarlo: de dónde sale y con qué regla. */
export interface ContextoDeArchivo {
  /** Ruta de origen, relativa a la raíz del repo (`reports/suite/scorecard.json`). */
  origen: string;
  /** Su nombre dentro de la corrida (`scorecard.json`): decide el folio. */
  fichero: string;
  /** La fecha de la corrida. */
  fecha: string;
  regla?: ReglaDeMedida;
  /**
   * El Pin de la corrida, para los folios que no lo llevan (una captura en
   * prosa, un resumen por Ejecución). Sólo se usa si el fichero no declara el
   * suyo: el que dice el fichero manda.
   */
  pinDeLaCorrida?: Pick<PinDeLegado, "ref" | "commit" | "fecha">;
}

/** ¿El JSON tiene la forma de un Scorecard (por Skill y Caso)? */
function tieneFormaDeScorecard(raw: Record<string, unknown>): boolean {
  const skills = raw["skills"];
  return (
    Array.isArray(skills) &&
    skills.every(
      (skill) =>
        typeof skill === "object" &&
        skill !== null &&
        Array.isArray((skill as { casos?: unknown }).casos),
    )
  );
}

/** ¿El JSON es una Ejecución persistida? */
function tieneFormaDeEjecucion(raw: Record<string, unknown>): boolean {
  return (
    typeof raw["skill"] === "string" &&
    typeof raw["caso"] === "string" &&
    typeof raw["grade"] === "string"
  );
}

/**
 * El folio se decide por la **forma**, no por el nombre: un `scorecard.json`
 * renombrado sigue siendo un Scorecard, y un `resumen.json` que no es un array
 * no es un resumen.
 */
function folioDe(raw: unknown, fichero: string): FolioDeLegado {
  if (raw === null) return "texto";
  if (Array.isArray(raw)) return "resumen";
  if (typeof raw !== "object") return /\.(txt|md)$/.test(fichero) ? "texto" : "otro";
  const objeto = raw as Record<string, unknown>;
  if (tieneFormaDeScorecard(objeto)) return "scorecard";
  if (tieneFormaDeEjecucion(objeto)) return "ejecucion";
  return /\.(txt|md)$/.test(fichero) ? "texto" : "otro";
}

/** El Pin que declara el fichero: su objeto `pin`, su cadena, o nada. */
export function pinDe(raw: unknown): Pick<PinDeLegado, "ref" | "commit" | "fecha"> {
  if (typeof raw !== "object" || raw === null) return {};
  const pin = (raw as Record<string, unknown>)["pin"];
  if (typeof pin === "string") return { commit: pin };
  if (typeof pin !== "object" || pin === null) return {};
  const p = pin as { ref?: unknown; commit?: unknown; fecha?: unknown };
  return {
    ...(typeof p.ref === "string" ? { ref: p.ref } : {}),
    ...(typeof p.commit === "string" ? { commit: p.commit } : {}),
    ...(typeof p.fecha === "string" ? { fecha: p.fecha } : {}),
  };
}

/**
 * ¿Prueba el fichero que se midió ese contenido? Es lo que separa «comprobado»
 * de «declarado»: el `arbolHash` (ticket 04) o la forma `entregas`/`intentos`
 * del scorecard (ticket 03) son marcas de una corrida que ya medía.
 */
function mideSuContenido(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null) return false;
  const objeto = raw as Record<string, unknown>;
  if (typeof objeto["arbolHash"] === "string") return true;
  const skills = objeto["skills"];
  if (!Array.isArray(skills)) return false;
  return skills.some(
    (skill) =>
      typeof skill === "object" &&
      skill !== null &&
      Array.isArray((skill as { casos?: unknown }).casos) &&
      (skill as { casos: unknown[] }).casos.some(
        (caso) =>
          typeof caso === "object" &&
          caso !== null &&
          "entregas" in caso &&
          "intentos" in caso,
      ),
  );
}

/**
 * La cabecera de un fichero archivado. `raw` es su JSON ya parseado, o `null`
 * para una captura en prosa.
 *
 * **El Pin del fichero manda**, y el de la corrida sólo cubre el hueco de los
 * folios que no lo llevan: una captura en prosa y el resumen de un experimento
 * se midieron con el Pin de su corrida, aunque no lo repitan. Un fichero que
 * declara uno distinto del de la corrida es un dato del propio fichero, y se
 * respeta: la cabecera dice el que el fichero sabía.
 *
 * Una cabecera sin regla **no** es una cabecera de legado: quien la escriba no
 * sabe con qué se midió, y el archivo perdería lo único que le da valor. La
 * comprobación vive en `esLegado`, para que el archivador se niegue a copiar lo
 * que no la tendría.
 */
export function cabeceraDeLegado(raw: unknown, contexto: ContextoDeArchivo): CabeceraDeLegado {
  const declarado = pinDe(raw);
  const delFichero = Object.keys(declarado).length > 0;
  const pin = delFichero ? declarado : (contexto.pinDeLaCorrida ?? {});
  const estado: EstadoDelPin =
    Object.keys(pin).length === 0
      ? "desconocido"
      : mideSuContenido(raw)
        ? "comprobado"
        : "declarado";
  return {
    origen: contexto.origen,
    folio: folioDe(raw, contexto.fichero),
    fecha: contexto.fecha,
    pin: estado === "desconocido" ? { estado } : { estado, ...pin },
    ...(contexto.regla === undefined ? {} : { regla: contexto.regla }),
  };
}

/**
 * ¿Es legado **completo**? Sólo lo es un folio conocido, con un Pin y una regla
 * declarados por **alguien**. El Pin puede venir del propio fichero o de la
 * corrida —una captura en prosa no lleva Pin, pero la corrida que la produjo sí—:
 * lo que no se admite es un Pin **desconocido**, porque entonces el fichero no
 * sabe de qué versión habla. Lo que no lo sea no se archiva: se queda donde está,
 * en vez de entrar por la puerta de atrás en algo que nadie dirá con qué se midió.
 */
export function esLegado(cabecera: CabeceraDeLegado): boolean {
  return (
    cabecera.folio !== "otro" &&
    cabecera.pin.estado !== "desconocido" &&
    cabecera.regla !== undefined
  );
}

/** La medida de un Caso tal como el fichero la guardó. */
export interface Medida {
  caso: string;
  veredicto: string;
  /** Entregas que costó el veredicto, si el fichero las guardó. */
  entregas?: number;
  /** Intentos que costó llegar a las entregas. */
  intentos: number;
  correctas: number;
  entregoMal: number;
  sinArtefacto: number;
}

/** Lo que una **Ejecución** persistida dice de sí misma. */
export interface HechosDeLaEjecucion {
  skill: string;
  caso: string;
  grade: string;
  /** `con-artefacto` / `sin-artefacto`, si el fichero lo guarda. */
  entrega?: string;
  /** Si alcanzó el skill, si el fichero lo guarda. */
  alcanzoElSkill?: boolean;
}

/**
 * La cuenta de las entregas de una corrida, por Ejecución. Nace del bucle de
 * refinamiento: la spec mide «una tasa de entrega de 0 de 3 en `reports/suite` y
 * 1 de 3 en `estabilidad-v2`» (`spec.md:9`), y el fichero que lo guarda es el
 * **resumen por Ejecución**, no el Scorecard. Sin él, la cabecera del legado
 * presentaría un SUSPENDE sin el dato que lo explica.
 */
export interface TasaDeEntrega {
  /** Ejecuciones que hay en el resumen. */
  ejecuciones: number;
  /** Las que llevan `con-artefacto`. */
  conArtefacto: number;
  /** Las que alcanzaron el skill (si el resumen lo guarda). */
  alcanzaronSkill: number;
}

/**
 * La tasa de entrega de un resumen por Ejecución (`[{ejecucion, entrega, …}]`),
 * o `undefined` si el fichero no es un resumen. No se deduce de los Grades ni de
 * los veredictos: cada Ejecución dice si entregó, y es lo que se cuenta.
 */
export function tasaDeEntrega(raw: unknown): TasaDeEntrega | undefined {
  if (!Array.isArray(raw)) return undefined;
  const ejecuciones = raw.filter(
    (e): e is Record<string, unknown> => typeof e === "object" && e !== null,
  );
  return {
    ejecuciones: ejecuciones.length,
    conArtefacto: ejecuciones.filter((e) => e["entrega"] === "con-artefacto").length,
    alcanzaronSkill: ejecuciones.filter((e) => e["flujoAlcanzoSkill"] === true).length,
  };
}

function casosDe(raw: unknown): Record<string, unknown>[] {
  if (typeof raw !== "object" || raw === null) return [];
  const skills = (raw as { skills?: unknown }).skills;
  if (!Array.isArray(skills)) return [];
  return skills.flatMap((skill) => {
    const casos = (skill as { casos?: unknown })?.casos;
    return Array.isArray(casos)
      ? casos.filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
      : [];
  });
}

const numero = (raw: Record<string, unknown>, llave: string): number =>
  typeof raw[llave] === "number" ? raw[llave] : 0;

/**
 * Los hechos de una Ejecución persistida, o `undefined` si el fichero no es una.
 * Se lee lo que el fichero guarda y nada más: una Ejecución del 22/10 no tiene
 * `exitCode` y no se le inventa.
 */
export function hechosDeLaEjecucion(raw: unknown): HechosDeLaEjecucion | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const e = raw as Record<string, unknown>;
  if (typeof e["skill"] !== "string" || typeof e["caso"] !== "string" || typeof e["grade"] !== "string") {
    return undefined;
  }
  return {
    skill: e["skill"],
    caso: e["caso"],
    grade: e["grade"],
    ...(typeof e["entrega"] === "string" ? { entrega: e["entrega"] } : {}),
    ...(typeof e["flujoAlcanzoSkill"] === "boolean" ? { alcanzoElSkill: e["flujoAlcanzoSkill"] } : {}),
  };
}

/**
 * La medida de cada Caso tal como el fichero la guardó, **sin completar con
 * ceros lo que no está**: un fichero anterior al ticket 03 no guardó las
 * Entregas —sólo `sinArtefacto`—, y escribirlas como 0, o como `ejecuciones`
 * (que son **intentos**), sería inventar justo el dato que el ticket 01 quiso
 * tener. Esa asimetría es a propósito: `correctas`/`entregoMal`/`sinArtefacto`
 * sí llegaron a 0 como un cero de verdad (no había ninguna), `entregas` no
 * llegó a existir como campo, y por eso se queda sin él en vez de en 0.
 *
 * Un fichero que no es de Casos (un resumen, una Ejecución) no tiene medida:
 * devuelve la lista vacía en vez de una fila falsa.
 */
export function medidaDeLegado(raw: unknown): Medida[] {
  return casosDe(raw).map((caso) => {
    const esNueva = "entregas" in caso && "intentos" in caso;
    return {
      caso: String(caso["caso"] ?? "?"),
      veredicto: String(caso["veredicto"] ?? "?"),
      ...(esNueva ? { entregas: numero(caso, "entregas") } : {}),
      intentos: esNueva ? numero(caso, "intentos") : numero(caso, "ejecuciones"),
      correctas: numero(caso, "correctas"),
      entregoMal: numero(caso, "entregoMal"),
      sinArtefacto: numero(caso, "sinArtefacto"),
    };
  });
}
