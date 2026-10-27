/**
 * Guardarraíl de codificación: los ficheros de texto del repo van en **UTF-8 sin
 * BOM** y con los acentos **sin mojibake**.
 *
 * Nace de la review del ticket 13. Al verificar a mano el guardarraíl de tests
 * (`scripts/verificar-tests.ts`) se reescribió el fichero con un round-trip de
 * `Get-Content -Raw` / `Set-Content -Encoding utf8`: se le coló un BOM y se
 * corrompió todo acento (la `i` acentuada quedó como `0xC3 0xAD`, y así el
 * resto). El fichero siguió pasando `tsc`, los guardarraíles y `git commit`,
 * porque el daño estaba en **comentarios**: ningún check miraba los bytes. Lo
 * cazó un humano en una review.
 *
 * Es el género de fallo del ticket 13 al revés —una verdad declarada que nadie
 * valida— y la codificación es **mecánica**, así que le toca un check, no una
 * regla de juicio en `CODING_STANDARDS.md`.
 *
 * La regla es **pura**: recibe `{path, bytes}` y devuelve un hallazgo por
 * problema. El recolector del FS vive en `scripts/verificar-codificacion.ts`.
 */

export interface FicheroDeTexto {
  /** Ruta relativa del fichero, para el mensaje. */
  path: string;
  /** Sus bytes tal cual están en disco. */
  bytes: Uint8Array;
}

/** La marca de orden de bytes UTF-8. */
const BOM = [0xef, 0xbb, 0xbf];

/**
 * Secuencias que delatan un texto UTF-8 **leído como Latin-1 y re-guardado como
 * UTF-8** (mojibake). La firma es una **pareja**: el byte inicial de la vocal
 * (`0xC3` o `0xC2`) seguido de un carácter de continuación, que es como queda
 * `í`, `ó`, `ñ` o el guion largo tras la doble codificación.
 *
 * Tres decisiones que importan:
 *
 * - Se buscan como **parejas**, no como el carácter inicial suelto: ése aparece
 *   en prosa legítima y dispararía en falso.
 * - Se construyen con `String.fromCodePoint`, **nunca como literales**: un
 *   fichero que contiene la secuencia corrupta se marca a sí mismo. Por eso este
 *   comentario describe el patrón por sus bytes (`0xC3 0xAD`) en vez de
 *   escribirlo: una regla que busca un patrón no puede documentarlo en su propio
 *   fuente sin morder el anzuelo.
 */
const MOJIBAKE = [
  [0xc3, 0xad], // í
  [0xc3, 0xb3], // ó
  [0xc3, 0xb1], // ñ
  [0xc3, 0xa9], // é
  [0xc3, 0xa1], // á
  [0xc3, 0xba], // ú
  [0xc3, 0xbc], // ü
  // El guion largo se corrompe a **tres** caracteres (su UTF-8 `E2 80 94`
  // re-codificado byte a byte), no a dos: por eso necesita su propia tupla.
  [0xe2, 0x80, 0x94],
].map((puntos) => String.fromCodePoint(...puntos));

function tieneBom(bytes: Uint8Array): boolean {
  return BOM.every((byte, i) => bytes[i] === byte);
}

/**
 * Devuelve una descripción por fichero con BOM o con mojibake, o vacío si la
 * codificación está limpia.
 *
 * El BOM se comprueba sobre los **bytes** (no sobre el texto ya decodificado): un
 * `readFileSync(…, "utf8")` de Node ya se lo come, así que mirarlo en el string
 * nunca lo vería. Es justo el error por el que el BOM pasó desapercibido.
 */
export function problemasDeCodificacion(ficheros: FicheroDeTexto[]): string[] {
  const hallazgos: string[] = [];
  for (const fichero of ficheros) {
    if (tieneBom(fichero.bytes)) {
      hallazgos.push(
        `${fichero.path}: empieza con BOM UTF-8. Guárdalo en UTF-8 sin BOM ` +
          "(el resto del repo no lo lleva, y el BOM rompe comparaciones por bytes).",
      );
    }
    const texto = Buffer.from(fichero.bytes).toString("utf8");
    const marca = MOJIBAKE.find((m) => texto.includes(m));
    if (marca !== undefined) {
      hallazgos.push(
        `${fichero.path}: contiene "${marca}" (mojibake): el fichero se decodificó ` +
          "mal y se re-guardó. Reescríbelo desde el original o arregla los acentos " +
          "a mano; no lo dejes pasar, que ningún otro check lo mira.",
      );
    }
  }
  return hallazgos;
}
