import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Ancho canónico de la Captura de Gold. El Gold es una página de escritorio del
 * sitio real; 1900px reproduce el viewport en que se maquetó. Es parte de la
 * clave: cambiar el ancho invalida la captura (ver el ticket 06).
 */
export const ANCHO_CAPTURA = 1900;

/**
 * Ancho canónico de la Captura del mockup de un Caso-decisión (ver ADR-0011):
 * 1280px reproduce un escritorio típico. El mockup no lleva manifiesto de
 * caché (a diferencia de la Captura de Gold): es una fixture estática del Caso.
 */
export const ANCHO_MOCKUP = 1280;

export interface EntradaCaptura {
  /** Contenido del Gold-HTML descargado de desy.aragon.es. */
  html: string;
  /** Ancho de viewport, en píxeles. */
  ancho: number;
}

/**
 * Clave de caché de la Captura de Gold: una huella del Gold-HTML **y** el ancho.
 * Dos capturas con la misma clave son la misma imagen, así que la cacheada
 * sirve; si el HTML o el viewport cambian, la clave cambia y la captura caduca.
 *
 * Es pura: dado el mismo par `{html, ancho}` siempre da la misma clave, así que
 * la invalidación es comprobable sin abrir un navegador.
 */
export function claveDeCaptura({ html, ancho }: EntradaCaptura): string {
  return createHash("sha256").update(`${ancho}\n${html}`).digest("hex");
}

/**
 * Metadatos versionables que acompañan al PNG cacheado (el fichero
 * `gold.captura.json`). El formato es estable y se commitea: quien clona el
 * repo sabe con qué ancho y qué Gold-HTML se generó la imagen.
 */
export interface ManifiestoCaptura {
  ancho: number;
  clave: string;
  fichero: string;
  /**
   * URL viva de la que se capturó la imagen (ticket 22). Cuando está, la
   * captura canónica se hace contra esa URL —con su CSS aplicado— y el
   * `gold.html` es la copia exacta que se descargó en ese momento. Si falta, la
   * captura es local y exige que sus hojas de estilo existan junto al HTML.
   */
  url?: string;
}

/**
 * ¿Sirve la captura cacheada para el Gold-HTML actual? La regla es una sola: la
 * clave guardada tiene que coincidir con la esperada. Si el Gold-HTML o el
 * viewport cambiaron, la clave ya no cuadra y hay que recapturar.
 */
export function capturaVigente(
  manifiesto: ManifiestoCaptura,
  claveEsperada: string,
): boolean {
  return manifiesto.clave === claveEsperada;
}

/** Nombre del PNG cacheado y del manifiesto, dentro de la carpeta del Caso. */
export const FICHERO_CAPTURA = "gold.png";
export const FICHERO_MANIFIESTO = "gold.captura.json";

/**
 * Lee el manifiesto de la captura, o `undefined` si aún no hay captura (no
 * existe el manifiesto o está corrupto). En esos casos hay que recapturar.
 *
 * `dir` es el directorio que contiene el `gold.html` (en un Caso, su `input/`).
 */
export function leerManifiestoCaptura(dir: string): ManifiestoCaptura | undefined {
  const path = join(dir, FICHERO_MANIFIESTO);
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ManifiestoCaptura;
  } catch {
    return undefined;
  }
}

/**
 * ¿La captura del Gold sigue correspondiendo a su `gold.html`? (ticket 40).
 *
 * El manifiesto guarda la clave, pero nadie la contrastaba: cambiar el HTML y
 * olvidar recapturar dejaba un PNG viejo y la suite medía contra una referencia
 * que ya no era la del Caso. La regla es pura y dice **qué hacer**.
 *
 * `dirInput` es el `input/` del Caso, el directorio que contiene `gold.html`.
 */
export function problemaDeCapturaDesactualizada(dirInput: string): string | undefined {
  const gold = join(dirInput, "gold.html");
  const png = join(dirInput, FICHERO_CAPTURA);
  const manifiesto = leerManifiestoCaptura(dirInput);
  if (!existsSync(png)) {
    return manifiesto === undefined
      ? undefined
      : "hay gold.captura.json pero falta gold.png";
  }
  if (manifiesto === undefined) {
    return "gold.png sin gold.captura.json: no se sabe con qué Gold se capturó";
  }
  if (!existsSync(gold)) return "gold.png sin gold.html";
  const clave = claveDeCaptura({ html: readFileSync(gold, "utf8"), ancho: ANCHO_CAPTURA });
  if (!capturaVigente(manifiesto, clave)) {
    return (
      "la captura no corresponde al gold.html actual; recaptura con " +
      "`npm run capturar-gold -- --skill <skill> --case <caso>`"
    );
  }
  return undefined;
}

export interface OpcionesCaptura {
  /** Ancho de viewport de la captura. Por defecto, `ANCHO_CAPTURA`. */
  ancho?: number;
  /**
   * URL viva de la que se captura (ticket 22). Se guarda en el manifiesto para
   * que la próxima recaptura sepa de dónde salió el Gold-imagen.
   */
  url?: string;
  /**
   * Cómo se genera el PNG. Se inyecta para que el test de invalidación no abra
   * un navegador (ver el ticket 06): recibe la ruta destino y escribe el PNG.
   */
  capturar: (destino: string) => void;
}

/**
 * Devuelve la Captura de Gold de un Caso, **regenerándola sólo si la caché
 * caducó**: si el Gold-HTML o el viewport que produjeron la imagen cambian, la
 * clave cambia y se recaptura; si no, se reutiliza la fixture ya versionada.
 *
 * `dir` es el directorio que contiene el `gold.html` (en un Caso, su `input/`);
 * el PNG y su manifiesto se escriben ahí, para que viajen como una fixture.
 */
export function asegurarCaptura(dir: string, opciones: OpcionesCaptura): string {
  const ancho = opciones.ancho ?? ANCHO_CAPTURA;
  const html = readFileSync(join(dir, "gold.html"), "utf8");
  const clave = claveDeCaptura({ html, ancho });
  const destino = join(dir, FICHERO_CAPTURA);

  const manifiesto = leerManifiestoCaptura(dir);
  if (manifiesto && capturaVigente(manifiesto, clave) && existsSync(destino)) {
    return destino;
  }

  opciones.capturar(destino);
  const manifiestoNuevo: ManifiestoCaptura = {
    ancho,
    clave,
    fichero: FICHERO_CAPTURA,
    ...(opciones.url === undefined ? {} : { url: opciones.url }),
  };
  writeFileSync(
    join(dir, FICHERO_MANIFIESTO),
    `${JSON.stringify(manifiestoNuevo, null, 2)}\n`,
  );
  return destino;
}

/**
 * Las hojas de estilo **locales** que enlaza un documento (ticket 22): las que
 * un navegador resolvería contra el fichero. Se ignoran las absolutas
 * (`https:`, `//host`) y las `data:`, que no dependen del disco.
 */
export function hojasDeEstiloLocales(html: string): string[] {
  const locales: string[] = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const etiqueta = match[0];
    if (!/\brel\s*=\s*["']stylesheet["']/i.test(etiqueta)) continue;
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(etiqueta)?.[1];
    if (href === undefined) continue;
    if (/^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("data:")) continue;
    locales.push(href);
  }
  return locales;
}

/**
 * Tolerancia del scrollbar vertical: el viewport declarado incluye la barra de
 * desplazamiento, así que una captura de página completa sale hasta ~20px más
 * estrecha (1900 → 1885 en el Gold de `implement-pattern`). Es una diferencia
 * esperada, no un error de captura.
 */
export const TOLERANCIA_SCROLLBAR = 20;

/**
 * ¿El `gold.png` commiteado mide lo que declara su manifiesto? (ticket 22). El
 * guardarraíl no miraba las dimensiones: un PNG capturado sin CSS pasaba porque
 * la clave del manifiesto coincidía con el `gold.html`. La regla es pura sobre
 * los bytes del PNG, y admite la franja del scrollbar.
 *
 * `dirInput` es el `input/` del Caso. Si falta el PNG o el manifiesto, no añade
 * un hallazgo: de esa ausencia ya habla `problemaDeCapturaDesactualizada`.
 */
export function problemaDeDimensionesDeLaCaptura(
  dirInput: string,
): string | undefined {
  const png = join(dirInput, FICHERO_CAPTURA);
  const manifiesto = leerManifiestoCaptura(dirInput);
  if (!existsSync(png) || manifiesto === undefined) return undefined;

  const dims = dimensionesDePng(readFileSync(png));
  if (dims === undefined) return "el gold.png commiteado no es un PNG válido";
  const ancho = dims.ancho;
  if (ancho > manifiesto.ancho || ancho < manifiesto.ancho - TOLERANCIA_SCROLLBAR) {
    return (
      `el gold.png mide ${ancho}px de ancho y el manifiesto declara ` +
      `${manifiesto.ancho}px (se admite hasta ${TOLERANCIA_SCROLLBAR}px menos ` +
      "por el scrollbar); recaptura con `npm run capturar-gold`"
    );
  }
  return undefined;
}

/**
 * Genera la Captura de Gold con `agent-browser`: abre el Gold a `ancho`px y
 * hace un screenshot de página completa. Es el adaptador real que
 * `asegurarCaptura` inyecta; el test de invalidación usa un capturador falso.
 *
 * Con `urlViva`, captura la URL tal cual la sirve el sitio (con su CSS y sus
 * fuentes): es el modo canónico desde el ticket 22. Sin ella, abre el `gold.html`
 * local y **falla** si enlaza una hoja de estilo local que no existe, en vez de
 * capturar silenciosamente una página sin estilos.
 */
export function capturarConAgentBrowser(
  goldHtml: string,
  ancho: number,
  urlViva?: string,
): (destino: string) => void {
  return (destino: string): void => {
    let url = urlViva;
    if (url === undefined) {
      const html = readFileSync(goldHtml, "utf8");
      const dir = dirname(goldHtml);
      const faltan = hojasDeEstiloLocales(html).filter(
        (href) => !existsSync(resolve(dir, href)),
      );
      if (faltan.length > 0) {
        throw new Error(
          `El Gold local ${goldHtml} enlaza hojas de estilo que no existen ` +
            `(${faltan.join(", ")}): capturarlo así daría una página sin CSS. ` +
            "Descarga el CSS junto al HTML o captura desde la URL viva con " +
            "`npm run capturar-gold -- --skill <skill> --case <caso> --url <url>`.",
        );
      }
      url = pathToFileURL(goldHtml).href;
    }
    correr("set", "viewport", String(ancho), "1080");
    correr("open", url);
    correr("screenshot", "--full", destino);
    correr("close");
  };
}

/**
 * Lee las dimensiones de un PNG por su cabecera IHDR (firma de 8 bytes + IHDR:
 * longitud en 4, "IHDR" en 4, ancho en 4, alto en 4). Devuelve `undefined` si el
 * buffer no es un PNG válido o es demasiado corto — así un verificador puede
 * rechazar la fixture sin lanzar. Es pura: comprobable sin navegador.
 */
export function dimensionesDePng(
  bytes: Buffer,
): { firma: string; ancho: number; alto: number } | undefined {
  if (bytes.length < 24) return undefined;
  const firma = bytes.subarray(1, 4).toString("ascii");
  if (firma !== "PNG") return undefined;
  return { firma, ancho: bytes.readUInt32BE(16), alto: bytes.readUInt32BE(20) };
}

/**
 * ¿Tiene esta fixture PNG algún problema? Devuelve `undefined` si es válida, o
 * una descripción si no lo es. Con `anchoEsperado`, además exige ese ancho (el
 * de la captura canónica). Es la regla que comparten los verificadores de la
 * Captura de Gold y del mockup, para no repetir el chequeo y testearlo aparte.
 */
export function problemaDePng(
  bytes: Buffer,
  anchoEsperado?: number,
  tolerancia = 0,
): string | undefined {
  const dims = dimensionesDePng(bytes);
  if (dims === undefined) {
    return "el fichero generado no es un PNG válido";
  }
  if (
    anchoEsperado !== undefined &&
    (dims.ancho > anchoEsperado || dims.ancho < anchoEsperado - tolerancia)
  ) {
    const margen = tolerancia === 0 ? "" : ` (se admite hasta ${tolerancia}px menos)`;
    return `ancho inesperado: ${dims.ancho} (esperado ${anchoEsperado}${margen})`;
  }
  return undefined;
}

function correr(...args: string[]): void {
  // En Windows `agent-browser` se instala como shim .cmd/.ps1, no como .exe, y
  // spawnSync no lo resuelve para subcomandos (da ENOENT o cuelga). Vía
  // `cmd.exe /c` sí. `opencode` sí es un .exe y no lo necesita; aquí sí.
  const esWindows = process.platform === "win32";
  const bin = esWindows ? "cmd.exe" : "agent-browser";
  const argv = esWindows ? ["/c", "agent-browser", ...args] : args;
  const r = spawnSync(bin, argv, { encoding: "utf8" });
  if (r.error && (r.error as NodeJS.ErrnoException).code === "ENOENT") {
    throw new Error(
      "No se encontró el binario `agent-browser`. Es necesario para generar la " +
        "Captura de Gold (ver el ticket 06).",
    );
  }
  if (r.status !== 0) {
    throw new Error(
      `agent-browser ${args.join(" ")} falló (código ${r.status}): ${r.stderr || r.stdout}`,
    );
  }
}

