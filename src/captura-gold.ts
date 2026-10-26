import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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

export interface OpcionesCaptura {
  /** Ancho de viewport de la captura. Por defecto, `ANCHO_CAPTURA`. */
  ancho?: number;
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
  writeFileSync(
    join(dir, FICHERO_MANIFIESTO),
    `${JSON.stringify({ ancho, clave, fichero: FICHERO_CAPTURA } satisfies ManifiestoCaptura, null, 2)}\n`,
  );
  return destino;
}

/**
 * Genera la Captura de Gold con `agent-browser`: abre el Gold-HTML a 1900px de
 * ancho y hace un screenshot de página completa. Es el adaptador real que
 * `asegurarCaptura` inyecta; el test de invalidación usa un capturador falso.
 */
export function capturarConAgentBrowser(
  goldHtml: string,
  ancho: number,
): (destino: string) => void {
  return (destino: string): void => {
    const url = pathToFileURL(goldHtml).href;
    correr("set", "viewport", String(ancho), "1080");
    correr("open", url);
    correr("screenshot", "--full", destino);
    correr("close");
  };
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

