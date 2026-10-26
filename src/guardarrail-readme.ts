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
 * Es **pura**: recibe el texto del README y el conteo real, y devuelve un
 * hallazgo por problema. El recolector del FS vive en `scripts/verificar-readme.ts`.
 */

/** La forma canónica en que el README declara el número de Casos. */
const DECLARACION_RE = /\*\*(\d+)\*\*\s+Casos?\b/;

/**
 * El número de Casos que el README declara, o `undefined` si no lo declara.
 */
export function casosDeclaradosEnReadme(readme: string): number | undefined {
  const match = DECLARACION_RE.exec(readme);
  if (!match) return undefined;
  return Number(match[1]);
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
