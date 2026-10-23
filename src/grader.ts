import type { Assert, Check, HechoEstructural, TipoCaso } from "./caso.js";
import { parseChecks } from "./caso.js";
import { propsValidasDeMacro } from "./catalogo.js";
import {
  ambitoDeTokens,
  reproduceContainer,
  reproduceEscalaH1,
  reproduceGap,
  utilidadesDelGold,
} from "./fidelidad.js";
import {
  esClaseTipografica,
  esColorDelSistema,
  esUtilityArbitraria,
  esUtilityColor,
  esUtilitySpacing,
  esUtilityTailwindPorDefecto,
  esUtilityTokenValido,
} from "./tokens.js";

export interface Artefactos {
  files: Record<string, string>;
}

export interface Transcript {
  invocaciones: string[];
}

export type { Assert, Check, TipoCaso };

export type Grade = "INACEPTABLE" | "ACEPTABLE" | "BUENO" | "EXCELENTE";

export interface DetalleCheck {
  id: string;
  severity: Check["severity"];
  passed: boolean;
}

export interface GradeResult {
  grade: Grade;
  detalle: DetalleCheck[];
}

export interface Evidencia {
  artefactos: Artefactos;
  transcript: Transcript;
}

const TOKENS_GUARD: Check = {
  id: "tokens-del-sistema",
  severity: "guard",
  weight: 0,
  assert: { kind: "sin_utility_por_defecto" },
};

const FRAMEWORK: Record<TipoCaso, Check[]> = {
  "caso-componente": [TOKENS_GUARD],
  "caso-pagina": [
    {
      id: "un-solo-h1",
      severity: "guard",
      weight: 0,
      assert: { kind: "un_solo_h1" },
    },
    {
      id: "skip-link",
      severity: "guard",
      weight: 0,
      assert: { kind: "skip_link" },
    },
    {
      id: "fieldset-con-legend",
      severity: "guard",
      weight: 0,
      assert: { kind: "fieldset_con_legend" },
    },
    {
      id: "labels-visibles",
      severity: "guard",
      weight: 0,
      assert: { kind: "labels_visibles" },
    },
    {
      id: "fidelidad-container",
      severity: "guard",
      weight: 0,
      assert: { kind: "fidelidad_estructural", hecho: "container" },
    },
    {
      id: "fidelidad-escala-h1",
      severity: "guard",
      weight: 0,
      assert: { kind: "fidelidad_estructural", hecho: "escala_h1" },
    },
    {
      id: "fidelidad-gap",
      severity: "guard",
      weight: 0,
      assert: { kind: "fidelidad_estructural", hecho: "gap" },
    },
    TOKENS_GUARD,
  ],
};

export function frameworkDeChecks(tipo: TipoCaso): Check[] {
  return FRAMEWORK[tipo].map((check) => ({ ...check }));
}

function html(artefactos: Artefactos): string {
  return Object.values(artefactos.files).join("\n");
}

function contar(html: string, re: RegExp): number {
  return (html.match(re) ?? []).length;
}

function clasesDe(html: string): string[] {
  const clases: string[] = [];
  for (const match of html.matchAll(/class="([^"]*)"/gi)) {
    for (const clase of match[1]!.split(/\s+/)) {
      if (clase.length > 0) clases.push(clase);
    }
  }
  return clases;
}

/**
 * Regla del skill `desy-validate-accessibility` (checklist de grep, paso 4):
 * «Cada input, select y textarea con su label». Se saca el `id` de cada
 * control (ignorando `type="hidden"`, que no necesita label) y se exige un
 * `<label for="<id>">`. Un control sin `id` no es asociable y falla.
 */
function labelsVisibles(html: string): boolean {
  const idsConLabel = new Set<string>();
  for (const match of html.matchAll(/<label[\s>][^>]*\bfor="([^"]+)"/gi)) {
    idsConLabel.add(match[1]!);
  }

  const etiquetados = new Set<string>();
  for (const match of html.matchAll(/<(input|select|textarea)\b([^>]*)>/gi)) {
    const atributos = match[2]!;
    if (/\btype\s*=\s*"hidden"/i.test(atributos)) continue;
    const id = /\bid="([^"]+)"/i.exec(atributos);
    if (!id) return false;
    etiquetados.add(id[1]!);
  }

  return [...etiquetados].every((id) => idsConLabel.has(id));
}

function evaluar(
  assert: Assert,
  artefactos: Artefactos,
  transcript: Transcript,
  gold: string | undefined,
  utilidadesGold: Set<string>,
): boolean {
  const htmlText = html(artefactos);
  switch (assert.kind) {
    case "macro_presente":
      return Object.values(artefactos.files).some((archivo) =>
        archivo.includes(assert.macro),
      );
    case "un_solo_h1":
      return contar(htmlText, /<h1[\s>]/gi) === 1;
    case "skip_link":
      return /class\s*=\s*(["'])[^"']*skip-link[^"']*\1/i.test(htmlText);
    case "fieldset_con_legend": {
      const fieldsets = htmlText.match(/<fieldset[\s>][\s\S]*?<\/fieldset>/gi) ?? [];
      return fieldsets.every((f) => /<legend[\s>]/i.test(f));
    }
    case "labels_visibles":
      return labelsVisibles(htmlText);
    case "flujo_canonico": {
      let i = 0;
      for (const paso of transcript.invocaciones) {
        if (pasoCoincide(paso, assert.pasos[i])) i++;
        if (i === assert.pasos.length) break;
      }
      return i === assert.pasos.length;
    }
    case "sin_utility_por_defecto":
      return clasesDe(ambitoDeTokens(htmlText)).every(
        (clase) =>
          utilidadesGold.has(clase) ||
          (!esUtilityArbitraria(clase) && !esUtilityTailwindPorDefecto(clase)),
      );
    case "espaciado_del_sistema":
      return clasesDe(ambitoDeTokens(htmlText)).every(
        (clase) =>
          utilidadesGold.has(clase) || !esUtilitySpacing(clase) || esUtilityTokenValido(clase),
      );
    case "color_del_sistema":
      return clasesDe(ambitoDeTokens(htmlText)).every(
        (clase) =>
          utilidadesGold.has(clase) || !esUtilityColor(clase) || esColorDelSistema(clase),
      );
    case "usa_clase_tipografica":
      return (
        esClaseTipografica(assert.clase) &&
        clasesDe(ambitoDeTokens(htmlText)).includes(assert.clase)
      );
    case "macro_con_clase":
      return llamadasAMacro(htmlText, assert.macro).some((props) =>
        clasesDeString(props.classes).includes(assert.clase),
      );
    case "sin_props_inventados": {
      const validas = propsValidasDeMacro(assert.macro);
      if (!validas) return false;
      const validasSet = new Set(validas);
      return llamadasAMacro(htmlText, assert.macro).every((props) =>
        Object.keys(props).every((nombre) => validasSet.has(nombre)),
      );
    }
    case "macro_sin_clase":
      return llamadasAMacro(htmlText, assert.macro).every(
        (props) => !clasesDeString(props.classes).includes(assert.clase),
      );
    case "fidelidad_estructural":
      return fidelidadEstructural(assert.hecho, htmlText, gold);
    case "contiene_texto":
      return normalizarEspacios(htmlText).includes(normalizarEspacios(assert.texto));
  }
}

/**
 * Normaliza espacios en blanco para que el texto buscado case aunque el HTML
 * venga con saltos de línea o indentación entre palabras (el compilado se
 * reflowea). No es comparación literal del documento: es «el texto está», que es
 * el hecho estructural que se mide.
 */
function normalizarEspacios(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

/**
 * ¿El artefacto reproduce el hecho estructural que fija el Gold-HTML? Cada hecho
 * se contrasta sobre el **mismo elemento** que fija el Gold (el `<main>` para el
 * container, el `h1` para la escala, la rejilla para el gap); ver `src/fidelidad.ts`.
 */
function fidelidadEstructural(
  hecho: HechoEstructural,
  htmlText: string,
  gold: string | undefined,
): boolean {
  switch (hecho) {
    case "container":
      return reproduceContainer(htmlText, gold);
    case "escala_h1":
      return reproduceEscalaH1(htmlText, gold);
    case "gap":
      return reproduceGap(htmlText, gold);
  }
}

function clasesDeString(clases: string | undefined): string[] {
  if (!clases) return [];
  return clases.split(/\s+/).filter((c) => c.length > 0);
}

/**
 * ¿La Invocación observada satisface el paso esperado del Flujo canónico?
 * Un paso puede terminar en `-*` para admitir una familia de skills, como el
 * `implement-*` del glosario (que cubre `implement-component`,
 * `implement-pattern`, `implement-layout-patterns`…).
 *
 * Es la definición única de «esta Invocación es ese paso»: la usan el guard
 * `flujo_canonico` y el cálculo de si el skill bajo test llegó a correr
 * (`flujoAlcanzoSkill`), para que no puedan discrepar.
 */
export function pasoCoincide(
  observado: string | undefined,
  esperado: string | undefined,
): boolean {
  if (observado === undefined || esperado === undefined) return false;
  if (esperado.endsWith("-*")) return observado.startsWith(esperado.slice(0, -1));
  return observado === esperado;
}

/**
 * Extrae las props de nivel superior de cada llamada al macro en el HTML.
 * Reconoce la forma canónica de Nunjucks `{{ macro({ "clave": valor, ... }) }}`
 * y lee sólo las claves del objeto de primer nivel (ignora las anidadas).
 */
function llamadasAMacro(html: string, macro: string): Record<string, string>[] {
  const llamadas: Record<string, string>[] = [];
  const invocacion = new RegExp(`\\b${macro}\\s*\\(`, "g");
  let match: RegExpExecArray | null;
  while ((match = invocacion.exec(html)) !== null) {
    const desde = html.indexOf("{", match.index + match[0].length);
    if (desde === -1) continue;
    const objeto = extraerObjetoBalanceado(html, desde);
    if (objeto === undefined) continue;
    llamadas.push(propsDeNivelSuperior(objeto));
  }
  return llamadas;
}

/** Devuelve el contenido entre las llaves que abren en `desde`, respetando el anidamiento y los strings. */
function extraerObjetoBalanceado(texto: string, desde: number): string | undefined {
  let profundidad = 0;
  let enString: string | undefined;
  for (let i = desde; i < texto.length; i++) {
    const c = texto[i]!;
    if (enString) {
      if (c === "\\") i++;
      else if (c === enString) enString = undefined;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      enString = c;
    } else if (c === "{") {
      profundidad++;
    } else if (c === "}") {
      profundidad--;
      if (profundidad === 0) return texto.slice(desde + 1, i);
    }
  }
  return undefined;
}

/** Lee las claves de primer nivel de un literal de objeto JS/JSON (las claves anidadas no cuentan). */
function propsDeNivelSuperior(objeto: string): Record<string, string> {
  const normalizado = objeto.replace(
    /([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g,
    '$1"$2"$3',
  );
  try {
    const parsed = JSON.parse(`{${normalizado}}`) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).map(([clave, valor]) => [clave, stringificarValor(valor)]),
    );
  } catch {
    return {};
  }
}

function stringificarValor(valor: unknown): string {
  if (typeof valor === "string") return valor;
  if (valor === null || valor === undefined) return "";
  return JSON.stringify(valor);
}

export function grado(
  evidencia: Evidencia,
  caso: { tipo: TipoCaso; checks: Check[]; gold?: string },
): GradeResult {
  const checks = [...frameworkDeChecks(caso.tipo), ...caso.checks];

  // Las utilidades que usa el Gold del Caso: el guard de tokens las exime (un SUT
  // que reproduce el Gold hereda sus clases legadas; es fidelidad, no invención).
  const utilidadesGold = utilidadesDelGold(caso.gold);

  const detalle: DetalleCheck[] = checks.map((check) => ({
    id: check.id,
    severity: check.severity,
    passed: evaluar(
      check.assert,
      evidencia.artefactos,
      evidencia.transcript,
      caso.gold,
      utilidadesGold,
    ),
  }));

  const guardFalla = detalle.some((d) => d.severity === "guard" && !d.passed);
  if (guardFalla) return { grade: "INACEPTABLE", detalle };

  let pesoTotal = 0;
  let pesoCumplido = 0;
  for (let i = 0; i < checks.length; i++) {
    const check = checks[i]!;
    if (check.severity !== "quality") continue;
    pesoTotal += check.weight;
    if (detalle[i]!.passed) pesoCumplido += check.weight;
  }

  const ratio = pesoTotal === 0 ? 1 : pesoCumplido / pesoTotal;
  const grade: Grade =
    ratio === 1 ? "EXCELENTE" : ratio >= 0.66 ? "BUENO" : "ACEPTABLE";

  return { grade, detalle };
}

export function gradoDeEvidencia(
  evidencia: Evidencia,
  caso: { tipo: TipoCaso; checksJson: string; gold?: string },
): GradeResult {
  return grado(evidencia, {
    tipo: caso.tipo,
    checks: parseChecks(caso.checksJson),
    gold: caso.gold,
  });
}
