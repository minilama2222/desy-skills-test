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
 * Un hecho de **informe**: el SUT declara el veredicto de un check en la misma
 * línea/fila/bullet que lo nombra. Es el Guard positivo de un Caso cuyo output
 * es un informe (`desy-validate-accessibility`) o una tabla de medición
 * (`desy-design-match`): nombrar el hecho diciendo que está OK no lo satisface.
 *
 * - Sin `veredicto`, el hecho se satisface con **cualquier marcador de fallo**
 *   (el uso del informe de a11y: «skip-link: ausente → FALLA»).
 * - Con `veredicto`, exige **ese** veredicto concreto en la línea (la categoría
 *   de una discrepancia: «h1.mb … bloqueante»).
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
}

export interface CasoComponente {
  tipo: "caso-componente";
  skill: string;
  id: string;
  prompt: string;
  checks: Check[];
}

export interface CasoPagina {
  tipo: "caso-pagina";
  skill: string;
  id: string;
  prompt: string;
  checks: Check[];
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
export interface CasoDecision {
  tipo: "caso-decision";
  skill: string;
  id: string;
  prompt: string;
  checks: Check[];
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
