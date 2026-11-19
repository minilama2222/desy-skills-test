export type TipoCaso = "caso-componente" | "caso-pagina" | "caso-decision";

export interface AssertMacroPresente {
  kind: "macro_presente";
  macro: string;
}

export interface AssertUnSoloH1 {
  kind: "un_solo_h1";
}

export interface AssertSkipLink {
  kind: "skip_link";
}

export interface AssertFieldsetConLegend {
  kind: "fieldset_con_legend";
}

export interface AssertLabelsVisibles {
  kind: "labels_visibles";
}

export interface AssertFlujoCanonico {
  kind: "flujo_canonico";
  pasos: string[];
}

export interface AssertSinUtilityPorDefecto {
  kind: "sin_utility_por_defecto";
}

export interface AssertEspaciadoDelSistema {
  kind: "espaciado_del_sistema";
}

export interface AssertColorDelSistema {
  kind: "color_del_sistema";
}

export interface AssertUsaClaseTipografica {
  kind: "usa_clase_tipografica";
  clase: string;
}

export interface AssertMacroConClase {
  kind: "macro_con_clase";
  macro: string;
  clase: string;
}

export interface AssertSinPropsInventados {
  kind: "sin_props_inventados";
  macro: string;
}

export interface AssertMacroSinClase {
  kind: "macro_sin_clase";
  macro: string;
  clase: string;
}

/**
 * Hechos estructurales del Gold-HTML que el artefacto debe reproducir (ver
 * `src/fidelidad.ts`): el ancho del container, la escala tipográfica del h1 y el
 * gap de la rejilla principal. La fuente de verdad es el Gold del Caso, no una
 * clase escrita a mano en el check. La lista es la fuente única del tipo y de la
 * validación del `kind`.
 */
export const HECHOS_ESTRUCTURALES = ["container", "escala_h1", "gap"] as const;

export type HechoEstructural = (typeof HECHOS_ESTRUCTURALES)[number];

export interface AssertFidelidadEstructural {
  kind: "fidelidad_estructural";
  hecho: HechoEstructural;
}

/**
 * Hecho estructural de la **rejilla**: el artefacto declara una rejilla
 * responsive con el número de columnas que fija el patrón de layout de DESY
 * (`grid lg:grid-cols-<columnas>`). El hecho se mira sobre el **mismo elemento**
 * que es rejilla (`grid`), no sobre un `lg:grid-cols-N` suelto en otro sitio: un
 * `lg:grid-cols-4` en un `div` que no es rejilla no layouta nada. Ver
 * `desy-implement-layout-patterns` → «Grid responsivo del formulario».
 */
export interface AssertEstructuraGrid {
  kind: "estructura_grid";
  columnas: number;
}

/**
 * Hecho estructural de contenido: el HTML generado contiene un texto. Para un
 * Caso-página el artefacto es el compilado, donde el macro ya se expandió, así
 * que la forma de comprobar que la página tiene un campo o una acción concreta
 * es su texto (las etiquetas y los rótulos que fija el Gold).
 */
export interface AssertContieneTexto {
  kind: "contiene_texto";
  texto: string;
}

/**
 * Un hecho de **decisión**: el SUT eligió/identificó un valor de dominio (un
 * componente del catálogo, una plantilla, una librería). No hay HTML que mirar:
 * la decisión vive en el texto que el SUT emitió (ver `caso-decision`). El valor
 * es un identificador de dominio (`input-group`, `logged-selector`, `desy-html`)
 * que se busca como hecho estructural, no como prosa literal.
 */
export interface AssertDeclaraDecision {
  kind: "declara_decision";
  valor: string;
}

/** Un hecho de decisión **prohibido**: si aparece, la decisión es errónea. */
export interface AssertNoDeclaraDecision {
  kind: "no_declara_decision";
  valor: string;
}

/**
 * Un hecho de decisión **de no-acción**: el SUT no declara haber **ejecutado**
 * una acción (clonar el starter, instalar dependencias, scaffoldear). Es el
 * Guard positivo de un Caso cuyo skill prohíbe actuar sin permiso del usuario
 * (`desy-scaffold-project`): la respuesta correcta puede **mostrar el comando**
 * como plantilla que el usuario corre, pero no puede reclamar haberlo corrido.
 * Falla sólo ante una reclamación en pasado (`he clonado`, `ya cloné`, `I ran`);
 * mencionar el comando no basta para suspender.
 */
export interface AssertNoDeclaraEjecucion {
  kind: "no_declara_ejecucion";
  /** La acción cuya ejecución reclamada suspende (`git clone`, `clonar`, `instalar`). */
  accion: string;
}

/**
 * Un hecho de **decisión** sobre un informe: el SUT declara el veredicto de un
 * hecho en la misma línea/fila/bullet que lo nombra. Es el Guard positivo de un
 * Caso cuyo output es un informe (`desy-validate-accessibility`) o una tabla de
 * medición (`desy-design-match`): nombrar el hecho diciendo que está OK no lo
 * satisface. Forma parte de los **asserts de decisión** del glosario.
 *
 * - Sin `veredicto`, el hecho se satisface con **cualquier marcador de fallo**
 *   (el uso del informe de a11y: «skip-link: ausente → FALLA»).
 * - Con `veredicto`, exige **ese** veredicto concreto en la línea (la categoría
 *   de una discrepancia: «h1.mb … bloqueante»), tolerando el formato (el emoji
 *   documentado del skill vale por su palabra).
 */
export interface AssertDeclaraFallo {
  kind: "declara_fallo";
  /** El hecho/check/fila que el informe declara (`skip-link`, `h1.mb`). */
  hecho: string;
  /** El veredicto exacto exigido (`bloqueante`); si falta, basta un fallo. */
  veredicto?: string;
}

/**
 * Un hecho de reconocimiento **contra el catálogo**: el SUT identifica un
 * componente que existe en `catalog.json` y, si se da `variante`, le asigna una
 * variante documentada para ese componente (con la normalización español↔inglés
 * del linter del skill). Es la validación del `component-recognizer` contra el
 * catálogo, no a ojo.
 */
export interface AssertReconoceComponente {
  kind: "reconoce_componente";
  componente: string;
  variante?: string;
}

export type Assert =
  | AssertMacroPresente
  | AssertUnSoloH1
  | AssertSkipLink
  | AssertFieldsetConLegend
  | AssertLabelsVisibles
  | AssertFlujoCanonico
  | AssertSinUtilityPorDefecto
  | AssertEspaciadoDelSistema
  | AssertColorDelSistema
  | AssertUsaClaseTipografica
  | AssertMacroConClase
  | AssertSinPropsInventados
  | AssertMacroSinClase
  | AssertFidelidadEstructural
  | AssertEstructuraGrid
  | AssertContieneTexto
  | AssertDeclaraDecision
  | AssertNoDeclaraDecision
  | AssertNoDeclaraEjecucion
  | AssertDeclaraFallo
  | AssertReconoceComponente;

export type Severity = "guard" | "quality";

export interface Check {
  id: string;
  severity: Severity;
  weight: number;
  assert: Assert;
  /**
   * La sección del skill de la que el Caso hace depender este Check (ticket 06),
   * leída de la `rubric.md` por el loader. Sin ella —un guard del Framework, o un
   * Caso que no la declara— el informe dice que no hay sección que citar.
   */
  ancla?: AnclaDeSkill;
}

/**
 * La **sección del skill** de la que depende un Check (ticket 06 del bucle de
 * refinamiento): el skill y el título de la sección de su `SKILL.md` que el Caso
 * nombra como fuente de la regla. El informe la cita por **texto**, no por número
 * de línea: un skill se edita y las líneas se mueven, pero el título de la
 * sección es el nombre con el que el autor del skill la reconoce.
 *
 * Un Caso declara esto en su `rubric.md` con la línea
 * `- <id-del-check>: <skill> → «<título de la sección>»`, bajo el epígrafe
 * `## Anclaje en desy-skills`. Un Check sin ancla —un guard del Framework, que
 * el Caso no declara— no tiene sección que citar, y el informe lo dice.
 */
export interface AnclaDeSkill {
  /** El Skill al que pertenece la sección (`desy-implement-component`). */
  skill: string;
  /** El título de la sección de su `SKILL.md`, sin los `#`. */
  seccion: string;
  /**
   * Por qué esta sección es la que cubre el Check, cuando el título no basta
   * (retro de la sesión del ticket 12). Opcional y en **prosa escrita a mano**:
   * el caso que lo motivó es un ancla al título del propio skill, porque la regla
   * vive en un aviso sin epígrafe. Se escribe tras la sección, separada por un
   * apartado: `- <id>: <skill> → «<sección>» — <motivo>`.
   */
  motivo?: string;
}

/** El epígrafe de `rubric.md` bajo el que el Caso ancla sus Checks al skill. */
export const EPIGRAFE_ANCLAJE = "Anclaje en desy-skills";

/**
 * El epígrafe de `rubric.md` bajo el que el Caso **declara** que una sección de un
 * skill dice lo contrario de lo que exige uno de sus Checks (ticket 13). Es el
 * hallazgo que antes vivía en prosa libre («Tensión conocida con el skill») y que
 * sólo leía quien ya trabajaba en ese Caso.
 */
export const EPIGRAFE_CONTRADICCIONES = "El skill contradice este Check";

/**
 * Una contradicción **declarada** entre un Check y una sección de un skill: el
 * Check mide una cosa y el skill, en esa sección, recomienda la contraria.
 *
 * No es un ancla y no ocupa su sitio: el ancla nombra al skill que **manda** (la
 * fuente de la regla que el Check mide), y esto nombra al skill que **choca**. En
 * `fieldset-grid-acciones` son distintos —manda `desy-styles-reference`, choca
 * `desy-implement-layout-patterns`— y el informe cita la sección del ancla como su
 * fuente, mientras presenta la contradicción en la cabecera.
 *
 * El hallazgo es un hecho que se **presenta**, no un juicio: no mueve el veredicto
 * ni decide si se cambia el skill o el Check (ver el glosario).
 */
export interface ContradiccionDeSkill {
  /** El Skill cuya sección **contradice** lo que el Check exige. */
  skill: string;
  /** El título de su sección, sin los `#`. */
  seccion: string;
  /**
   * Lo que dice esa sección que choca, copiado por el autor. No se extrae del
   * `SKILL.md`: el sistema no sabe cuál de las menciones del skill es la que
   * contradice, y extraerla sería inferir lo que la declaración declara.
   */
  texto: string;
}

/**
 * El título de un epígrafe, comparado sin la decoración de markdown: la rúbrica
 * del repo escribe `## Anclaje en \`desy-skills\`` con backticks, y el epígrafe
 * canónico no los lleva. Que un backtick cambie el sentido de un título sería
 * un detalle de formato decidiendo una regla.
 */
function tituloPlano(titulo: string): string {
  return titulo.replace(/`/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Una línea de anclaje en `rubric.md`:
 * `- usa-macro-boton: desy-implement-component → «Ejemplo 1: Botón "Enviar" en desy-angular»`
 *
 * El id va antes de los dos puntos; el skill es la primera palabra; la sección va
 * entre comillas angulares (`«…»`) —o dobles, que un editor también produce— y
 * puede llevar comillas simples dentro, porque los títulos de los skills las
 * usan. Un skill en backticks (`` `desy-implement-component` ``) también vale:
 * es como la prosa del repo lo escribe.
 *
 * Tras el cierre puede venir un **motivo** separado por un apartado (`—`, `–` o
 * `-`), como en la contradicción: la línea sigue siendo un ancla —termina en
 * texto libre, no en la sección— y el motivo dice por qué esa sección cubre el
 * Check cuando el título no basta. El apartado es **obligatorio**: sin él, el
 * ancla se confundiría con una línea malformada.
 */
const LINEA_ANCLAJE =
  /^\s*[-*]\s+`?([a-z][a-z0-9-]+)`?\s*:\s*`?([a-z][a-z0-9-]+)`?\s*→\s*[«"“](.+?)[»"”]\s*(?:[—–-]\s*(.+?))?\s*$/;

/**
 * Lee los anclajes de skill que declara una `rubric.md` bajo el epígrafe
 * `## Anclaje en desy-skills`. Sólo cuentan las líneas de **ese** epígrafe (hasta
 * el siguiente título del mismo o menor nivel): la rúbrica de un Caso tiene más
 * prosa con flechas, y una de ellas no es un ancla.
 *
 * Devuelve un `Map` id → ancla, con la **primera** declaración de cada id: dos
 * anclas para el mismo Check son una contradicción, y la primera es la que el
 * autor escribió. Un id con anclas contradictorias lo caza
 * `problemasDelArbolDeCasos`, no esta función.
 */
export function anclajesDeRubric(texto: string): Map<string, AnclaDeSkill> {
  const anclajes = new Map<string, AnclaDeSkill>();
  let dentro = false;
  let nivelDelEpigrafe = 0;

  for (const linea of texto.split(/\r?\n/)) {
    const titulo = /^(#{1,6})\s+(.*?)\s*$/.exec(linea);
    if (titulo) {
      const nivel = titulo[1]!.length;
      if (dentro && nivel <= nivelDelEpigrafe) dentro = false;
      if (tituloPlano(titulo[2]!) === EPIGRAFE_ANCLAJE) {
        dentro = true;
        nivelDelEpigrafe = nivel;
      }
      continue;
    }
    if (!dentro) continue;
    const match = LINEA_ANCLAJE.exec(linea);
    if (!match) continue;
    const [, id, skill, seccion, motivo] = match;
    if (!anclajes.has(id!)) {
      anclajes.set(id!, {
        skill: skill!,
        seccion: seccion!,
        ...(motivo === undefined || motivo.trim() === "" ? {} : { motivo: motivo.trim() }),
      });
    }
  }
  return anclajes;
}

/**
 * Una línea de contradicción en `rubric.md`:
 * `- <id>: <skill> → «<sección>» — <lo que dice el skill>`
 *
 * La forma es la del ancla **hasta la sección** y luego sigue: el texto copiado
 * viene tras la flecha, separado por un apartado (`—`, `–` o `-`). El apartado es
 * **obligatorio**, y no por formalismo: sin él, la línea se confundiría con un
 * ancla —o con un ancla malformada con texto detrás—, y una ancla que se escribe
 * movida no puede aparecer como una contradicción que nadie declaró. El ancla, por
 * su lado, exige que la línea **termine** en el cierre de la sección, así que
 * tampoco confunde una contradicción con un ancla: las dos formas se reconocen por
 * su epígrafe y por lo que sigue a la sección, nunca por la ida y vuelta.
 */
const LINEA_CONTRADICCION =
  /^\s*[-*]\s+`?([a-z][a-z0-9-]+)`?\s*:\s*`?([a-z][a-z0-9-]+)`?\s*→\s*[«"“](.+?)[»"”]\s*[—–-]\s*(.+?)\s*$/;

/**
 * Lee las contradicciones skill-vs-Check que declara una `rubric.md` bajo el
 * epígrafe `## El skill contradice este Check` (ticket 13). Sólo cuentan las
 * líneas de **ese** epígrafe, igual que el ancla: la rúbrica tiene más prosa con
 * flechas.
 *
 * Devuelve un `Map` id → contradicción, con la **primera** declaración de cada
 * id, como `anclajesDeRubric`: dos contradicciones para el mismo Check son una
 * contradicción de la rúbrica, y la que el autor escribió primero es la que vale.
 * Una línea sin el texto copiado no se lee: le falta el «qué».
 */
export function contradiccionesDeRubric(
  texto: string,
): Map<string, ContradiccionDeSkill> {
  const contradicciones = new Map<string, ContradiccionDeSkill>();
  let dentro = false;
  let nivelDelEpigrafe = 0;

  for (const linea of texto.split(/\r?\n/)) {
    const titulo = /^(#{1,6})\s+(.*?)\s*$/.exec(linea);
    if (titulo) {
      const nivel = titulo[1]!.length;
      if (dentro && nivel <= nivelDelEpigrafe) dentro = false;
      if (tituloPlano(titulo[2]!) === EPIGRAFE_CONTRADICCIONES) {
        dentro = true;
        nivelDelEpigrafe = nivel;
      }
      continue;
    }
    if (!dentro) continue;
    const match = LINEA_CONTRADICCION.exec(linea);
    if (!match) continue;
    const [, id, skill, seccion, copiado] = match;
    if (!seccion || !copiado || copiado.trim().length === 0) continue;
    if (id && skill && !contradicciones.has(id)) {
      contradicciones.set(id, { skill, seccion, texto: copiado.trim() });
    }
  }
  return contradicciones;
}

/**
 * Las secciones de skill que una `rubric.md` **nombra**, en orden de aparición y
 * sin repetir: primero las líneas de ancla (`- <id>: <skill> → «<sección>»`), y
 * después cualquier cita «<skill> → «<sección>»» de la prosa de apoyo.
 *
 * Sirve a `verificar-casos` para comparar una rúbrica con su versión anterior en
 * git: el ancla **se suma** a la prosa, no la sustituye, y una reescritura que se
 * lleva por delante una sección citada es un hallazgo (retro de la sesión del
 * ticket 12). Se compara por **título**, no por número de línea: las líneas se
 * mueven con cada edición y el título es lo que el autor del skill reconoce.
 */
export function seccionesCitadasEnRubric(texto: string): string[] {
  const citas: string[] = [];
  const anadir = (cita: string): void => {
    if (!citas.includes(cita)) citas.push(cita);
  };

  for (const ancla of anclajesDeRubric(texto).values()) {
    anadir(`${ancla.skill} → «${ancla.seccion}»`);
  }
  // La prosa puede partir la cita de línea («… → «Fieldset+legend sr-only para
  // grupos\n  semánticos»»), así que se busca sobre el texto con los saltos
  // convertidos en espacios; el título se colapsa igual que en `tituloPlano`.
  //
  // El skill es la última palabra con forma de skill **antes** de la flecha, y
  // esa ventana no cruza una flecha ni una comilla: la prosa tiene flechas que no
  // son citas («macro → selector») y, sin la ventana, la segunda cita de un
  // párrafo se quedaba sin skill. Una cita sin skill a la vista no se lee.
  const plano = texto.replace(/\s+/g, " ");
  for (const match of plano.matchAll(/[«"“](.+?)[»"”]/g)) {
    const antes = plano.slice(0, match.index);
    const flecha = antes.search(/→\s*$/);
    if (flecha === -1) continue;
    const previo = antes.slice(0, flecha).replace(/\s+$/, "");
    const ultimo = [...previo.matchAll(/`?([a-z][a-z0-9-]+)`?/g)].pop();
    if (ultimo === undefined) continue;
    anadir(`${ultimo[1]} → «${match[1]!.trim()}»`);
  }
  return citas;
}

/**
 * Lo que todo Caso declara, sea del tipo que sea. `contradicciones` es aparte de
 * los `checks` a propósito (ticket 13): una contradicción no es una propiedad del
 * Check —no llena `Check.ancla` ni cambia lo que el informe cita como fuente—,
 * es una declaración del Caso sobre el desacuerdo con su skill.
 */
interface CasoBase {
  skill: string;
  id: string;
  prompt: string;
  checks: Check[];
  /** Las contradicciones declaradas en `rubric.md`, por id de Check. */
  contradicciones?: Map<string, ContradiccionDeSkill>;
}

export interface CasoComponente extends CasoBase {
  tipo: "caso-componente";
}

export interface CasoPagina extends CasoBase {
  tipo: "caso-pagina";
  goldPath: string;
  /** Captura de Gold (Gold-imagen) como fixture: `input/gold.png`. */
  goldImagenPath: string;
}

/**
 * Un Caso cuyo SUT **decide**, no maqueta: identifica componentes, elige
 * plantilla o recomienda librería. El Artefacto es el texto que el SUT emitió
 * (su tabla/decisión), y los checks son de decisión (`declara_decision` /
 * `no_declara_decision`). No lleva Gold ni HTML.
 */
export interface CasoDecision extends CasoBase {
  tipo: "caso-decision";
  /**
   * Mockup de entrada (input/mockup.png), si el Caso decide a partir de una
   * imagen (p. ej. `component-recognizer`). Se adjunta al prompt del SUT.
   */
  mockupImagenPath?: string;
}

export type Caso = CasoComponente | CasoPagina | CasoDecision;

/** ¿El Caso es un Caso-página? (el único tipo que lleva Gold). */
export function esCasoPagina(caso: Caso): caso is CasoPagina {
  return caso.tipo === "caso-pagina";
}

/** ¿El Caso es un Caso-decisión? (el único tipo cuyo artefacto es texto, no HTML). */
export function esCasoDecision(caso: Caso): caso is CasoDecision {
  return caso.tipo === "caso-decision";
}

const CARPETAS: Record<string, TipoCaso> = {
  componente: "caso-componente",
  pagina: "caso-pagina",
  decision: "caso-decision",
};

export function tipoDeCarpeta(carpeta: string): TipoCaso {
  const tipo = CARPETAS[carpeta];
  if (!tipo) {
    throw new Error(
      `Tipo de Caso desconocido: "${carpeta}" (esperado: componente, pagina o decision)`,
    );
  }
  return tipo;
}

const ASSERT_KINDS = new Set([
  "macro_presente",
  "un_solo_h1",
  "skip_link",
  "fieldset_con_legend",
  "labels_visibles",
  "flujo_canonico",
  "sin_utility_por_defecto",
  "espaciado_del_sistema",
  "color_del_sistema",
  "usa_clase_tipografica",
  "macro_con_clase",
  "sin_props_inventados",
  "macro_sin_clase",
  "fidelidad_estructural",
  "estructura_grid",
  "contiene_texto",
  "declara_decision",
  "no_declara_decision",
  "no_declara_ejecucion",
  "declara_fallo",
  "reconoce_componente",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exigirString(raw: Record<string, unknown>, campo: string, contexto: string): string {
  const value = raw[campo];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${contexto}: el campo "${campo}" debe ser un string no vacío`);
  }
  return value;
}

function exigirNumero(raw: Record<string, unknown>, campo: string, contexto: string): number {
  const value = raw[campo];
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${contexto}: el campo "${campo}" debe ser un número`);
  }
  return value;
}

function parseAssert(raw: unknown, contexto: string): Assert {
  if (!isRecord(raw)) throw new Error(`${contexto}: "assert" debe ser un objeto`);
  const kind = raw.kind;
  if (typeof kind !== "string" || !ASSERT_KINDS.has(kind)) {
    throw new Error(`${contexto}: "kind" desconocido (${String(kind)})`);
  }
  const tipoKind = kind as Assert["kind"];
  switch (tipoKind) {
    case "macro_presente":
      return { kind: "macro_presente", macro: exigirString(raw, "macro", contexto) };
    case "flujo_canonico": {
      const pasos = raw.pasos;
      if (!Array.isArray(pasos) || !pasos.every((p) => typeof p === "string")) {
        throw new Error(`${contexto}: "pasos" debe ser una lista de strings`);
      }
      return { kind: "flujo_canonico", pasos };
    }
    case "usa_clase_tipografica":
      return {
        kind: "usa_clase_tipografica",
        clase: exigirString(raw, "clase", contexto),
      };
    case "macro_con_clase":
      return {
        kind: "macro_con_clase",
        macro: exigirString(raw, "macro", contexto),
        clase: exigirString(raw, "clase", contexto),
      };
    case "sin_props_inventados":
      return {
        kind: "sin_props_inventados",
        macro: exigirString(raw, "macro", contexto),
      };
    case "macro_sin_clase":
      return {
        kind: "macro_sin_clase",
        macro: exigirString(raw, "macro", contexto),
        clase: exigirString(raw, "clase", contexto),
      };
    case "fidelidad_estructural": {
      const hecho = exigirString(raw, "hecho", contexto);
      if (!(HECHOS_ESTRUCTURALES as readonly string[]).includes(hecho)) {
        throw new Error(
          `${contexto}: "hecho" desconocido (${hecho}); esperado: ${HECHOS_ESTRUCTURALES.join(", ")}`,
        );
      }
      return { kind: "fidelidad_estructural", hecho: hecho as HechoEstructural };
    }
    case "contiene_texto":
      return { kind: "contiene_texto", texto: exigirString(raw, "texto", contexto) };
    case "estructura_grid": {
      const columnas = exigirNumero(raw, "columnas", contexto);
      if (!Number.isInteger(columnas) || columnas < 2) {
        throw new Error(
          `${contexto}: "columnas" debe ser un entero ≥ 2 (recibido ${columnas})`,
        );
      }
      return { kind: "estructura_grid", columnas };
    }
    case "declara_decision":
      return { kind: "declara_decision", valor: exigirString(raw, "valor", contexto) };
    case "no_declara_decision":
      return { kind: "no_declara_decision", valor: exigirString(raw, "valor", contexto) };
    case "no_declara_ejecucion":
      return { kind: "no_declara_ejecucion", accion: exigirString(raw, "accion", contexto) };
    case "declara_fallo": {
      const hecho = exigirString(raw, "hecho", contexto);
      const veredicto = raw.veredicto;
      if (veredicto !== undefined && typeof veredicto !== "string") {
        throw new Error(`${contexto}: "veredicto" debe ser un string si se da`);
      }
      return {
        kind: "declara_fallo",
        hecho,
        ...(typeof veredicto === "string" ? { veredicto } : {}),
      };
    }
    case "reconoce_componente": {
      const componente = exigirString(raw, "componente", contexto);
      const variante = raw.variante;
      if (variante !== undefined && typeof variante !== "string") {
        throw new Error(`${contexto}: "variante" debe ser un string si se da`);
      }
      return {
        kind: "reconoce_componente",
        componente,
        ...(typeof variante === "string" ? { variante } : {}),
      };
    }
    case "sin_utility_por_defecto":
      return { kind: "sin_utility_por_defecto" };
    case "espaciado_del_sistema":
      return { kind: "espaciado_del_sistema" };
    case "color_del_sistema":
      return { kind: "color_del_sistema" };
    default:
      return { kind: tipoKind };
  }
}

function parseCheck(raw: unknown, indice: number): Check {
  const contexto = `checks[${indice}]`;
  if (!isRecord(raw)) throw new Error(`${contexto}: debe ser un objeto`);
  const severity = exigirString(raw, "severity", contexto);
  if (severity !== "guard" && severity !== "quality") {
    throw new Error(`${contexto}: "severity" debe ser "guard" o "quality" (${severity})`);
  }
  return {
    id: exigirString(raw, "id", contexto),
    severity,
    weight: exigirNumero(raw, "weight", contexto),
    assert: parseAssert(raw.assert, contexto),
  };
}

export function parseChecks(texto: string): Check[] {
  let raw: unknown;
  try {
    raw = JSON.parse(texto);
  } catch {
    throw new Error("checks.json inválido: no es JSON parseable");
  }
  if (!isRecord(raw)) {
    throw new Error("checks.json inválido: se esperaba un objeto");
  }
  const checks = raw.checks;
  if (!Array.isArray(checks)) {
    throw new Error('checks.json inválido: falta la lista "checks"');
  }
  return checks.map(parseCheck);
}
