/**
 * Guardarraíl del conteo de Casos declarado en el README.
 *
 * Nace del retro del ticket 10 (Bloque B): el `README.md` decía «Hay cinco
 * Casos» y listaba cinco, cuando en disco ya había siete. Es el **mismo género
 * de fallo** que el guardarraíl del árbol de Casos del ticket 09 —un hecho
 * declarado que no se valida—, pero del lado de la prosa: `CODING_STANDARDS.md`
 * ya advierte que el conteo del README es una *claim* que ningún guardarraíl lee,
 * y esa claim se quedó atrás en cuanto se añadió un Caso sin tocar el README.
 *
 * La parte **mecánica** de la regla es ésta: el README declara el número de Casos
 * en la forma canónica `**N** Caso(s)` y ese número ha de coincidir con los Casos
 * que hay en disco. El resto (¿la lista de Casos del README describe bien cada
 * uno?) es juicio, y vive en `CODING_STANDARDS.md`, no aquí.
 *
 * El ticket 11 le sumó una segunda claim del mismo género: los **enlaces
 * relativos** del README. Al documentar el bucle, el README pasó a enlazar el
 * mapa de `refinar-skill`, la plantilla de Petición y la spec; una ruta que se
 * mueve dejaba un enlace muerto en la puerta de entrada y ningún guardarraíl lo
 * veía. `problemasDeEnlaces` comprueba que la ruta existe —el ancla `#…` no,
 * porque eso es juicio— y el adaptador resuelve el FS. Desde la revisión cubre
 * los tres documentos de la raíz, no sólo el README: el término `Petición` del
 * glosario recién estrenado podía enlazar una plantilla que ya no está.
 *
 * Es **pura**: recibe el texto del documento —y, en el conteo, el total en disco—
 * y devuelve un hallazgo por problema. El recolector del FS vive en
 * `scripts/verificar-readme.ts`.
 */

/** La forma canónica en que el README declara el número de Casos. */
const DECLARACION_RE = /\*\*(\d+)\*\*\s+Casos?\b/;

/** Un enlace relativo de markdown: `[texto](./ruta.md)`, nunca `https://…`. */
const ENLACE_RE = /\]\((\.{1,2}\/[^)\s#]+)\)/g;

/** Una coincidencia de la regla, o `undefined` si no se leyó la ruta. */
function sinRuta(ruta: string | undefined): string | undefined {
  return ruta;
}

/**
 * Las rutas que el README enlaza, ya decodificadas (un `%20` es un espacio: la
 * regla habla de la ruta del repo, y la codificación es de la URL). Un `%` mal
 * formado se deja tal cual en vez de lanzar: la regla devuelve hallazgos, no
 * excepciones. Exportada para que el script no re-invente la regla.
 */
export function rutasEnlazadas(readme: string): string[] {
  const rutas: string[] = [];
  for (const match of readme.matchAll(ENLACE_RE)) {
    const ruta = sinRuta(match[1]);
    if (ruta === undefined) continue;
    try {
      rutas.push(decodeURIComponent(ruta));
    } catch {
      rutas.push(ruta);
    }
  }
  return rutas;
}

/**
 * El número de Casos que el README declara, o `undefined` si no lo declara.
 */
export function casosDeclaradosEnReadme(readme: string): number | undefined {
  const match = DECLARACION_RE.exec(readme);
  if (!match) return undefined;
  return Number(match[1]);
}

/**
 * Devuelve un hallazgo por cada enlace relativo del documento cuya ruta no existe.
 * `existe` lo resuelve el adaptador contra el disco; aquí sólo se enumeran las
 * rutas, para que la regla sea pura y probarla no toque el FS.
 *
 * Nace con el ticket 11: el README pasó a enlazar el mapa del bucle, la plantilla
 * de Petición y `refinar-skill`, y un enlace roto en la puerta de entrada del repo
 * no rompía nada. Se mira el **fichero**, no su ancla `#…`: una sección se renombra
 * sin que la ruta deje de existir, y avisar de eso es juicio, no mecánica.
 */
export function problemasDeEnlaces(
  documento: string,
  texto: string,
  existe: (ruta: string) => boolean,
): string[] {
  return rutasEnlazadas(texto)
    .filter((ruta) => !existe(ruta))
    .map(
      (ruta) =>
        `${documento}: el enlace \`${ruta}\` no lleva a ninguna ruta del repo. ` +
        "Un enlace relativo que no se comprueba se rompe al mover un fichero.",
    );
}

/**
 * Devuelve un hallazgo si el README no declara el conteo o si el declarado no
 * coincide con el que hay en disco, o vacío si está al día.
 */
export function problemasDelReadme(readme: string, enDisco: number): string[] {
  const declarado = casosDeclaradosEnReadme(readme);
  if (declarado === undefined) {
    return [
      "README.md: no declara el número de Casos (se esperaba la forma " +
        `\`**${enDisco}** Casos\`). Un conteo sin declarar no se puede validar.`,
    ];
  }
  if (declarado !== enDisco) {
    return [
      `README.md: declara ${declarado} Caso/s pero en disco hay ${enDisco}. ` +
        "Actualiza el conteo (y la lista) al añadir o quitar un Caso.",
    ];
  }
  return [];
}
