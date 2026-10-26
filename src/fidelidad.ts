/**
 * Fidelidad estructural contra el Gold-HTML.
 *
 * El Caso-página no compara píxeles (eso queda fuera de v1): contrasta hechos
 * estructurales que el skill `desy-design-match` declara como los que se miden
 * primero — el **ancho del container**, la **escala tipográfica** y los **gaps**
 * de la rejilla. La fuente de verdad es el Gold-HTML del Caso, no una lista de
 * clases escrita a mano: así un Gold nuevo trae sus propias clases esperadas.
 *
 * Cada hecho se contrasta **sobre el mismo elemento** que fija el Gold, no «en
 * cualquier parte del documento»: el gap de la rejilla se mira en la rejilla, y
 * la escala tipográfica, en el `h1`. Buscar la clase en cualquier sitio dejaría
 * pasar un artefacto con un `gap-lg` suelto en un div que no es la rejilla.
 *
 * Todo aquí es puro (texto → texto), así que el grader sigue offline y
 * determinista. Las funciones extraen la «firma» del Gold y comprueban que el
 * artefacto la reproduce.
 */

/** Extrae la lista de clases del primer elemento cuyo tag cumple `filtro`. */
function clasesDelPrimer(
  html: string,
  tag: string,
  filtro?: (clases: string[]) => boolean,
): string[] | undefined {
  const re = new RegExp(`<${tag}\\b([^>]*)>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const clases = atributoClase(match[1]!);
    if (clases.length === 0) continue;
    if (!filtro || filtro(clases)) return clases;
  }
  return undefined;
}

/** Lee el valor de un atributo `class="..."` (o `class='...'`) de un bloque de atributos. */
function atributoClase(atributos: string): string[] {
  const match = /\bclass\s*=\s*(["'])([^"']*)\1/i.exec(atributos);
  if (!match) return [];
  return match[2]!.split(/\s+/).filter((c) => c.length > 0);
}

/** Clases de todos los elementos de un tag dado. */
function clasesDeTodos(html: string, tag: string): string[][] {
  const resultado: string[][] = [];
  const re = new RegExp(`<${tag}\\b([^>]*)>`, "gi");
  for (const match of html.matchAll(re)) {
    const clases = atributoClase(match[1]!);
    if (clases.length > 0) resultado.push(clases);
  }
  return resultado;
}

/**
 * Las clases de **cada elemento** del HTML que lleva `class`, en orden de
 * aparición. Es la lectura por elemento que necesitan los hechos estructurales
 * que se miran «sobre su elemento» (la rejilla…), no la lista plana de `clasesDe`
 * del grader (esa mezcla todos los elementos en una sola).
 */
export function clasesPorElemento(html: string): string[][] {
  const resultado: string[][] = [];
  for (const match of html.matchAll(/<[a-z][a-z0-9]*\b([^>]*)>/gi)) {
    const clases = atributoClase(match[1]!);
    if (clases.length > 0) resultado.push(clases);
  }
  return resultado;
}

/** ¿`clases` contiene todas las `esperadas`? */
function contiene(clases: string[], esperadas: string[]): boolean {
  if (esperadas.length === 0) return true;
  const presentes = new Set(clases);
  return esperadas.every((c) => presentes.has(c));
}

/** Elemento `<main>`: el wrapper del contenido de la página. */
export function clasesDeMain(html: string): string[] {
  return clasesDelPrimer(html, "main") ?? [];
}

/**
 * Clases que fijan el **ancho del container** del contenido: `container` y su
 * centrado `mx-auto`, tal como los declara el `<main>` del Gold. Si el Gold no
 * los pone en el `<main>`, no hay hecho que exigir (no se busca en cualquier
 * parte: el header y el footer traen su propio `container` y colarían).
 */
export function containerDeGold(goldHtml: string): string[] {
  return clasesDeMain(goldHtml).filter((c) => c === "container" || c === "mx-auto");
}

/**
 * Clases del **h1** del Gold que fijan su **escala tipográfica**. Reproducir el
 * tamaño es lo que el gold fija (`c-h1`, `lg:c-h0`), no el nivel del DOM — y no
 * cualquier clase de layout que el h1 lleve además (`w-full`), que no es escala.
 */
export function escalaH1DeGold(goldHtml: string): string[] {
  const clases = clasesDelPrimer(goldHtml, "h1") ?? [];
  return clases.filter((c) => /^(?:lg:|sm:|md:)?(?:c-h[0-4]|c-paragraph-|text-)/.test(c));
}

/**
 * Clases de **gap y columnas** de la rejilla principal del contenido: el `<div>`
 * del Gold que lleva `gap-*` y `grid-cols-*`. Fija el ritmo entre columnas y su
 * reparto (3 de 4 en los formularios DESY). Se queda sólo con esas dos familias.
 */
export function gapDeGold(goldHtml: string): string[] {
  const rejilla = clasesDeTodos(goldHtml, "div").find(
    (clases) => clases.some((c) => /^gap-/.test(c)) && clases.some((c) => /grid-cols-/.test(c)),
  );
  if (!rejilla) return [];
  return rejilla.filter((c) => /^gap-/.test(c) || /grid-cols-/.test(c));
}

/**
 * ¿El artefacto reproduce el hecho estructural que fija el Gold, **sobre el
 * mismo tipo de elemento**? Sin Gold no hay contra qué comparar y devuelve
 * `false` (un Caso-página sin Gold no es válido; ver `cargarCaso`).
 */
export function reproduceContainer(html: string, gold: string | undefined): boolean {
  if (gold === undefined) return false;
  return contiene(clasesDeMain(html), containerDeGold(gold));
}

export function reproduceEscalaH1(html: string, gold: string | undefined): boolean {
  if (gold === undefined) return false;
  const h1 = clasesDelPrimer(html, "h1") ?? [];
  return contiene(h1, escalaH1DeGold(gold));
}

export function reproduceGap(html: string, gold: string | undefined): boolean {
  if (gold === undefined) return false;
  const esperadas = gapDeGold(gold);
  // La rejilla del artefacto es **su** div con gap y columnas (el primero): el
  // hecho se mira ahí, no en cualquier div con un `gap-lg` suelto.
  const rejilla = clasesDeTodos(html, "div").find(
    (clases) => clases.some((c) => /^gap-/.test(c)) && clases.some((c) => /grid-cols-/.test(c)),
  );
  if (!rejilla) return esperadas.length === 0;
  return contiene(rejilla, esperadas);
}

/**
 * El ámbito en que se miden los tokens que escribió el SUT. En una página
 * compilada, el `<main>` es el contenido del SUT; el header y el footer son
 * boilerplate de la plantilla, con sus propias utilities (`text-6xl`, `w-8`,
 * `p-2`…) que no son output del Caso. Por eso los guards de tokens miran sólo el
 * `<main>`; si el documento no lo tiene (un snippet de componente), miran todo.
 */
export function ambitoDeTokens(html: string): string {
  const inicio = /<main\b/i.exec(html);
  if (!inicio) return html;
  const fin = /<\/main\s*>/i.exec(html.slice(inicio.index));
  if (!fin) return html.slice(inicio.index);
  return html.slice(inicio.index, inicio.index + fin.index + fin[0].length);
}

/**
 * Las utilidades que **usa el Gold** del Caso, como conjunto. Un SUT que
 * reproduce el Gold hereda sus clases, incluidas las que el propio Gold oficial
 * usa y el skill `desy-styles-reference` prohibiría (`mr-2`, `pt-0.5`…): el Gold
 * es la referencia y esas clases son legado suyo, no un valor que inventó el
 * SUT. Reproducirlas es fidelidad, no un error.
 *
 * Es lo que el guard de tokens exime en un Caso-página: **sólo lo que el Gold
 * trae**, no la escala numérica en general (un `p-4` que el Gold no use sigue
 * suspendiendo).
 */
export function utilidadesDelGold(goldHtml: string | undefined): Set<string> {
  if (goldHtml === undefined) return new Set();
  const clases = new Set<string>();
  for (const match of goldHtml.matchAll(/\bclass\s*=\s*(["'])([^"']*)\1/gi)) {
    for (const clase of match[2]!.split(/\s+/)) if (clase.length > 0) clases.add(clase);
  }
  return clases;
}
