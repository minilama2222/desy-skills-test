/**
 * Guardarraíl ortográfico: las palabras españolas que **nunca** son correctas sin
 * tilde no pueden aparecer en la prosa del repo.
 *
 * Nace de la retro del ticket 06, por la **segunda** vez del mismo fallo: al
 * reescribir un fichero con PowerShell se aplanaron los acentos (`guardarrail`,
 * `arbol canonico`, `arreglalo`), pasó typecheck, pasó `verificar-codificacion`
 * —éste mira BOM y mojibake, no corrección— y lo cazó una review a mano. Es
 * mecánico, así que le toca un check, no una regla de juicio.
 *
 * **La lista es el contrato, y sólo admite formas inexistentes.** La trampa de un
 * guardarraíl así son los pares que sin tilde son otra palabra válida
 * (`esta`/`está`, `termino`/`término`, `solo`/`sólo`, `mas`/`más`): marcarlos
 * daría rojos falsos en prosa correcta, y un check que da falsos positivos se
 * acaba ignorando. Por eso sólo entran palabras que sin su tilde no existen.
 *
 * **Lo que no se mira**: el código (identificadores como `linea`, rutas de módulo
 * como `./guardarrail-pin.js`, importaciones), sólo la **prosa**. Por eso cada
 * línea se clasifica antes de buscarla; ver `esProsa`.
 *
 * La regla es **pura**: recibe `{path, lineas}` y devuelve un hallazgo por
 * problema. El recolector del FS vive en `scripts/verificar-acentos.ts`.
 */

export interface FicheroDeTexto {
  /** Ruta relativa, para el mensaje. */
  path: string;
  /** El texto ya troceado en líneas. */
  lineas: string[];
  /**
   * Si el fichero es **código** (`.ts`) sólo se mira su comentario; si es prosa
   * (`.md`), sus líneas salvo el bloque de código. Por defecto, prosa: el caso
   * raro es el código.
   */
  contexto?: "codigo" | "prosa";
}

/**
 * Las palabras que sin tilde no existen, con su forma correcta. Ampliar cuando
 * aparezca un caso real —nunca por precaución—. Una entrada cuyo valor sea igual
 * a la clave no tiene sentido y el guardarraíl la ignora.
 */
export const FORMAS_SIN_TILDE: ReadonlyArray<readonly [incorrecta: string, correcta: string]> = [
  ["guardarrail", "guardarraíl"],
  ["guardarrailes", "guardarraíles"],
  ["arbol", "árbol"],
  ["arboles", "árboles"],
  ["canonico", "canónico"],
  ["canonica", "canónica"],
  ["canonicos", "canónicos"],
  ["canonicas", "canónicas"],
  ["ademas", "además"],
  ["tambien", "también"],
  ["seccion", "sección"],
  ["funcion", "función"],
  ["configuracion", "configuración"],
  ["parametro", "parámetro"],
  ["parametros", "parámetros"],
  ["numero", "número"],
  ["numeros", "números"],
  ["codificacion", "codificación"],
  ["verificacion", "verificación"],
  ["ejecucion", "ejecución"],
  ["edicion", "edición"],
  ["medicion", "medición"],
  ["descripcion", "descripción"],
  ["instalacion", "instalación"],
  ["informacion", "información"],
  ["validacion", "validación"],
  ["aplicacion", "aplicación"],
  ["correccion", "corrección"],
  ["codigo", "código"],
  ["logica", "lógica"],
  ["publico", "público"],
  ["rapido", "rápido"],
  ["tipografico", "tipográfico"],
  ["tipografica", "tipográfica"],
  ["semantico", "semántico"],
  ["semantica", "semántica"],
  ["basico", "básico"],
  ["unico", "único"],
  ["unica", "única"],
  ["indice", "índice"],
  ["patron", "patrón"],
];

/**
 * El patrón de una palabra como palabra **en prosa**: aislada por espacios o
 * puntuación, y **no** parte de un nombre compuesto. `patron-pagina`, `encadenado-
 * canonico` y `404-portal-publico` son identificadores y slugs del repo; la palabra
 * sólo es castellano cuando no está pegada a un guion.
 *
 * No se usa `\b`: `\w` es `[A-Za-z0-9_]`, así que un límite de palabra cortaría
 * entre «funcion» y «ó» y denunciaría como sin tilde una forma que sí la lleva
 * (ticket 24). Los dos lados se anclan con clases **Unicode**: una letra acentuada
 * o una marca de combinación son parte de la palabra, no su final.
 */
function patronDe(palabra: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_-])${palabra}(?![\\p{L}\\p{M}\\p{N}_-])`, "iu");
}

/**
 * Devuelve un hallazgo por cada aparición, en prosa, de una palabra sin tilde.
 *
 * Se informa **una vez por palabra y fichero** (con la primera línea donde
 * aparece): un `guardarrail` aplanado suele venir en manada, y quince hallazgos
 * iguales esconden los otros.
 */
export function problemasDeAcentos(ficheros: FicheroDeTexto[]): string[] {
  const hallazgos: string[] = [];
  for (const fichero of ficheros) {
    for (const [incorrecta, correcta] of FORMAS_SIN_TILDE) {
      if (incorrecta === correcta) continue;
      const patron = patronDe(incorrecta);
      const i = fichero.lineas.findIndex((linea) => {
        if (!esProsa(linea, fichero.contexto ?? "prosa")) return false;
        // La prosa sin backticks es lo que un lector lee como castellano.
        return patron.test(linea.replace(/`[^`]*`/g, " "));
      });
      if (i === -1) continue;
      hallazgos.push(
        `${fichero.path}:${i + 1}: "${incorrecta}" sin tilde (¿querías "${correcta}"?). ` +
          "La prosa se aplanó: reescribe la línea con sus acentos.",
      );
    }
  }
  return hallazgos;
}

/**
 * ¿Esta línea es prosa que un lector vería, o código? Se clasifica **línea a
 * línea**, no fichero a fichero: en un `.ts` conviven comentarios en prosa (que
 * es lo que se aplanó) con código que usa `ejecucion` o `seccion` como
 * identificador, y renombrar variables no es asunto de este guardarraíl.
 *
 * En un fichero de **código** (`.ts`), sólo el **comentario** es prosa: la línea
 * de `/** … *\/` o `// …`. En un fichero de **prosa** (`.md`), lo es cualquier
 * línea con texto, salvo el interior de un bloque de código.
 */
export function esProsa(linea: string, contexto: "codigo" | "prosa" = "prosa"): boolean {
  const comentario = linea.match(/^\s*(?:\/\*\*?|\/\/|\*)\s?(.*)$/);
  if (contexto === "codigo") {
    if (comentario === null) return false;
    return esFrase(quitarDecoracion(comentario[1]!));
  }
  // En prosa, la línea que abre o cierra un bloque de código no es prosa.
  if (/^\s*(```|~~~)/.test(linea)) return false;
  // Un id de `checks.json` («encadenado-canonico»): un valor entre comillas.
  if (/^\s*"[A-Za-z0-9_-]+"\s*:\s*"[A-Za-z0-9_-]+"\s*,?\s*$/.test(linea)) return false;
  // Una línea de JSON: un objeto, en una sola línea o abierto.
  if (/^\s*\{/.test(linea)) return false;
  return esFrase(quitarDecoracion(linea));
}

/** ¿El texto, sin decoración, parece una frase en castellano? */
function esFrase(texto: string): boolean {
  // Lo que está entre backticks es código o un nombre, no prosa.
  const limpio = texto.replace(/`[^`]*`/g, " ").trim();
  if (limpio.length === 0) return false;
  if (limpio.startsWith("@")) return false;
  // Una referencia como `patron-pagina-paso-1`: un fichero o un slug de Caso.
  if (/[./]/.test(limpio) && !/\s\p{L}{4,}/u.test(limpio)) return false;
  return /\p{L}/u.test(limpio) && /\s/.test(limpio);
}

/** La decoración de comentario o la comilla de apertura/cierre, fuera. */
function quitarDecoracion(linea: string): string {
  return linea
    .replace(/^\s*\/\*\*?/, "")
    .replace(/^\s*\*\/?\s?/, "")
    .replace(/^\s*\/\//, "")
    .replace(/\s*\*\/\s*$/, "")
    .trim();
}
