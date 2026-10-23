export type TipoCaso = "caso-componente" | "caso-pagina";

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
 * Hecho estructural de contenido: el HTML generado contiene un texto. Para un
 * Caso-página el artefacto es el compilado, donde el macro ya se expandió, así
 * que la forma de comprobar que la página tiene un campo o una acción concreta
 * es su texto (las etiquetas y los rótulos que fija el Gold).
 */
export interface AssertContieneTexto {
  kind: "contiene_texto";
  texto: string;
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
  | AssertContieneTexto;

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

export type Caso = CasoComponente | CasoPagina;

/** ¿El Caso es un Caso-página? (el único tipo que lleva Gold). */
export function esCasoPagina(caso: Caso): caso is CasoPagina {
  return caso.tipo === "caso-pagina";
}

const CARPETAS: Record<string, TipoCaso> = {
  componente: "caso-componente",
  pagina: "caso-pagina",
};

export function tipoDeCarpeta(carpeta: string): TipoCaso {
  const tipo = CARPETAS[carpeta];
  if (!tipo) {
    throw new Error(`Tipo de Caso desconocido: "${carpeta}" (esperado: componente o pagina)`);
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
  "contiene_texto",
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
