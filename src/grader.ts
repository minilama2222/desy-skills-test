import type { AnclaDeSkill, Assert, Check, HechoEstructural, TipoCaso } from "./caso.js";
import { parseChecks } from "./caso.js";
import { propsValidasDeMacro, componenteEnCatalogo, varianteEnCatalogo } from "./catalogo.js";
import {
  ambitoDeTokens,
  clasesPorElemento,
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
  /**
   * La aserción que se evaluó (ticket 06). El informe por Caso cita el **texto**
   * del Check que falla, y una Ejecución persistida se lee sin el Caso —que además
   * pudo cambiar desde que se midió—: por eso viaja aquí, no se busca en `casos/`
   * al reportar. Es opcional porque una Ejecución anterior al ticket 06 no la
   * trae; entonces el informe cita el id, la línea del artefacto si la encuentra,
   * y dice que no hay aserción que leer.
   */
  assert?: Assert;
  /** La sección del skill de la que el Caso hace depender este Check, si la declara. */
  ancla?: AnclaDeSkill;
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
  // Un Caso-decisión no produce HTML: no hay guards comunes de a11y ni de
  // tokens que aplicar. Su Framework es vacío; todo lo que se juzga son los
  // checks de decisión propios del Caso.
  "caso-decision": [],
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

/**
 * Quita los comentarios Nunjucks `{# … #}` antes de leer un artefacto.
 *
 * Un Caso-componente gradúa el **fuente** que el SUT escribió (ADR-0006), y en
 * un fuente Nunjucks lo comentado es material **que no se renderiza**: el
 * fichero de ejemplo del starter trae un componente de prueba entero comentado
 * (`p-2`, `border-gray-200`…). Leerlo hacía que un SUT que ampliaba ese fichero
 * suspendiera por utilidades que nadie iba a ver (hallazgo
 * `HALLAZGO-tokens-fichero-de-ejemplo.md`).
 *
 * Se aplica sólo donde se leen **clases**, no a los guards de estructura
 * (`h1`, `fieldset`, `label`), que trabajan sobre HTML ya renderizado.
 */
export function sinComentariosNunjucks(html: string): string {
  return html.replace(/\{#[\s\S]*?#\}/g, "");
}

function clasesDe(html: string): string[] {
  const clases: string[] = [];
  for (const match of sinComentariosNunjucks(html).matchAll(/class="([^"]*)"/gi)) {
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
    case "estructura_grid":
      return estructuraGrid(htmlText, assert.columnas);
    case "contiene_texto":
      return normalizarEspacios(htmlText).includes(normalizarEspacios(assert.texto));
    case "declara_decision":
      return textoDeclara(htmlText, assert.valor);
    case "no_declara_decision":
      return !textoDeclara(htmlText, assert.valor);
    case "no_declara_ejecucion":
      return !textoReclamaEjecucion(htmlText, assert.accion);
    case "declara_fallo":
      return lineaDeclaraFallo(htmlText, assert.hecho, assert.veredicto);
    case "reconoce_componente":
      return reconoceComponente(htmlText, assert.componente, assert.variante);
  }
}

/**
 * ¿El SUT identificó este componente (que ha de existir en el catálogo) y, si se
 * pide, le asignó una variante documentada? Se leen las filas de la tabla de
 * identificación: la fila del componente es la que tiene una celda que resuelve
 * a él; la variante ha de estar en **esa misma fila** (así `primario` vale para
 * `button` pero no para `input-group`).
 */
function reconoceComponente(
  texto: string,
  componente: string,
  variante: string | undefined,
): boolean {
  if (!componenteEnCatalogo(componente)) return false;
  const filas = texto
    .split("\n")
    .filter((linea) => linea.trim().startsWith("|"))
    .map((linea) =>
      linea
        .split("|")
        .map((celda) => celda.trim())
        .filter((celda) => celda.length > 0),
    );

  const filaDelComponente = filas.filter((celdas) =>
    celdas.some((celda) => celdaNombraComponente(celda, componente)),
  );
  if (filaDelComponente.length === 0) return false;
  if (variante === undefined) return true;

  return filaDelComponente.some((celdas) =>
    celdas.some(
      (celda) =>
        !esCeldaPlaceholder(celda) &&
        !celdaNombraComponente(celda, componente) &&
        varianteEnCatalogo(componente, celda),
    ),
  );
}

/**
 * Celdas de relleno de la tabla de identificación (`-`, `—`): marcan «este
 * componente no lleva ese dato» (p. ej. el Tamaño de un input-group). No son
 * variantes, así que no se contrastan contra el catálogo.
 */
function esCeldaPlaceholder(celda: string): boolean {
  return /^[-–—]+$/.test(celda.trim());
}

/** ¿La celda nombra ese componente? (misma normalización que el resto del grader). */
function celdaNombraComponente(celda: string, componente: string): boolean {
  return normalizarTexto(celda) === normalizarTexto(componente);
}

/**
 * ¿El texto que emitió el SUT declara esta decisión de dominio? La búsqueda es
 * insensible a mayúsculas y a los espacios de la prosa (`LOGGED-SELECTOR`,
 * `logged-selector` y `logged selector` son el mismo hecho), pero anclada por
 * límites de palabra para que `alert` no case dentro de `alerting`. El valor es
 * un identificador de dominio, no una frase: se busca como hecho, no como texto
 * literal.
 */
function textoDeclara(texto: string, valor: string): boolean {
  const aguja = normalizarTexto(valor);
  if (aguja.length === 0) return false;
  const patron = aguja
    .split(" ")
    .map((palabra) => palabra.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s\\-_]+");
  return new RegExp(`(^|[^\\w-])${patron}([^\\w-]|$)`, "i").test(
    normalizarTexto(texto),
  );
}

/** Minúsculas, sin tildes, y espacios/guiones/guiones_bajos unificados a un espacio. */
function normalizarTexto(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s\-_]+/g, " ")
    .trim();
}

/**
 * Formas en pasado con las que un SUT **reclama haber ejecutado** una acción.
 * Es el vocabulario del propio skill (`desy-scaffold-project`: «no ejecutes
 * estos bloques»): una respuesta que sólo **muestra** un comando como plantilla
 * no reclama nada; una que dice «he clonado» sí.
 *
 * Matices que evitan falsos positivos: la primera persona del pretérito de estos
 * verbos lleva tilde (`cloné`, `instalé`), y el imperativo/infinitivo no
 * (`clone`, `clone`); por eso las formas españolas sin tilde no se aceptan (el
 * texto normalizado perdería la distinción). Se buscan sobre el texto **crudo**.
 */
const RECLAMACIONES_EJECUCION = [
  /\bhe\s+\w+(ado|ido|to)\b/i, // "he clonado", "he ejecutado"
  /\bya\s+(lo\s+)?\S*(é|í|ó)(?![a-záéíóúñ])/i, // "ya cloné", "ya lo instalé"
  /\b(ejecuté|cloné|instalé|scaffoldeé|corrí|creé|añadí)(?![a-záéíóúñ])/i,
  /\b(i\s+(ran|cloned|installed|executed|scaffolded|created)|done|completed|finished)\b/i,
];

/**
 * ¿El artefacto declara haber **ejecutado** la acción? Sólo cuenta una
 * reclamación en pasado sobre esa acción (y su sustantivo: `git clone` →
 * `clonar`), no la mera mención del comando como plantilla. Es el hecho del
 * Guard `no_declara_ejecucion`.
 */
function textoReclamaEjecucion(texto: string, accion: string): boolean {
  const objetivo = normalizarTexto(accion);
  if (objetivo.length === 0) return false;
  const raices = raicesDeAccion(objetivo);
  return texto
    .split("\n")
    .some(
      (linea) =>
        raices.some((raiz) => normalizarTexto(linea).includes(raiz)) &&
        RECLAMACIONES_EJECUCION.some((re) => re.test(linea)),
    );
}

/**
 * Raíces con las que la acción puede aparecer conjugada: `git clone` → `clone`,
 * `clonar` → `clon`, `npm install` → `install`/`instal`. Se buscan como
 * subcadenas para cubrir la flexión verbal sin enumerarla.
 */
function raicesDeAccion(accion: string): string[] {
  const palabras = accion.split(" ").filter((p) => p.length > 0);
  const ultima = palabras[palabras.length - 1]!;
  const raices = new Set<string>([ultima]);
  // `clone`/`clonar` → `clon`; `install`/`instalar` → `instal`; `ejecutar` → `ejecut`.
  for (const sufijo of ["ar", "er", "ir", "e", "ed"]) {
    if (ultima.endsWith(sufijo) && ultima.length > sufijo.length) {
      raices.add(ultima.slice(0, -sufijo.length));
    }
  }
  return [...raices];
}

/**
 * Marcadores de fallo de un informe: el veredicto NO conforme de un check. No
 * son las palabras del skill, son los signos con que cualquier informe declara
 * que algo incumple.
 */
const MARCADORES_FALLO = [
  /\bfalla\b/i,
  /\bfalla(s|do|ron)?\b/i,
  /\bno\s+cumple\b/i,
  /\bincumple\b/i,
  /\berror\b/i,
  /\bausente\b/i,
  /\bfalta\b/i,
  /\bko\b/i,
  /\bno\s+conform/i,
  /\bfail(ed|s)?\b/i,
  /[✗✘❌]/,
  // Un cero como **conteo** del hallazgo ("2 fieldset / 0 legend", ": 0"): un
  // informe puede declarar el fallo con el número, sin palabra.
  /[/:]\s*0\b/,
];

/**
 * Categorías del skill `desy-design-match` con su emoji canónico (`🔴
 * bloqueante`, `🟡 afinable`, `🟢 trivial`). Un SUT puede declarar la categoría
 * sólo con el icono; normalizar el icono a su palabra hace que el veredicto del
 * informe sea tolerante al **formato** sin aflojar el hecho (la categoría sigue
 * siendo la exigida). No es una lista de sinónimos: es el mismo valor en su otra
 * forma documentada.
 */
const EMOJI_CATEGORIA: Record<string, string> = {
  "🔴": "bloqueante",
  "🟡": "afinable",
  "🟢": "trivial",
};

function normalizarVeredicto(linea: string): string {
  let out = linea;
  for (const [emoji, palabra] of Object.entries(EMOJI_CATEGORIA)) {
    out = out.split(emoji).join(` ${palabra} `);
  }
  return normalizarTexto(out);
}

/**
 * ¿El informe declara el **veredicto** del hecho? El hecho y el veredicto han de
 * convivir en la **misma línea** (la fila de tabla o el bullet del checklist):
 * así un «skip-link: OK» no satisface el hecho por culpa de otro check que sí
 * falla en otra línea.
 *
 * Sin `veredicto` (el informe de a11y), basta con un **marcador de fallo**
 * cualquiera. Con `veredicto` (la tabla de discrepancias de `design-match`), se
 * exige **ese** veredicto concreto en la línea, tolerando el formato (el emoji
 * del skill vale por su palabra).
 */
function lineaDeclaraFallo(
  texto: string,
  hecho: string,
  veredicto: string | undefined,
): boolean {
  const aguja = normalizarTexto(hecho);
  if (aguja.length === 0) return false;
  const esperado =
    veredicto === undefined ? undefined : normalizarTexto(veredicto);
  return texto.split("\n").some((linea) => {
    const normalizada = normalizarTexto(linea);
    if (!normalizada.includes(aguja)) return false;
    if (esperado !== undefined) return normalizarVeredicto(linea).includes(esperado);
    return MARCADORES_FALLO.some((re) => re.test(linea));
  });
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

/**
 * ¿El artefacto declara una rejilla responsive con el número de columnas
 * esperado? El hecho se mira sobre el elemento que **es** rejilla (lleva `grid`),
 * no sobre un `lg:grid-cols-N` suelto: se exige que ambas clases vivan en el
 * mismo elemento. Ver `desy-implement-layout-patterns` → «Grid responsivo del
 * formulario» (sólo `lg:grid-cols-N`, no columnas fijas en mobile).
 */
function estructuraGrid(htmlText: string, columnas: number): boolean {
  const objetivo = `lg:grid-cols-${columnas}`;
  return clasesPorElemento(htmlText).some(
    (clases) => clases.includes("grid") && clases.includes(objetivo),
  );
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
    assert: check.assert,
    ...(check.ancla === undefined ? {} : { ancla: check.ancla }),
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
