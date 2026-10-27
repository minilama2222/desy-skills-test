import { describe, expect, it } from "vitest";
import { problemasDeCodificacion } from "../src/guardarrail-codificacion.js";

/**
 * El guardarraíl de codificación (review del ticket 13) se prueba sobre los
 * **bytes** reales, que es lo único que lo delata. Construir los casos con
 * `Buffer`/`TextEncoder` importa: escribir aquí el texto corrupto como literal
 * haría que este mismo fichero fuese el hallazgo.
 */

/** Los bytes UTF-8 de un texto, sin BOM. */
const utf8 = (texto: string): Uint8Array => new TextEncoder().encode(texto);

/**
 * El mojibake tal cual lo produce el round-trip: se toma el texto en UTF-8 y se
 * vuelve a codificar como si fuera Latin-1 (windows-1252).
 */
function mojibakeDe(texto: string): Uint8Array {
  const bytesOriginales = utf8(texto);
  const latin1 = Buffer.from(bytesOriginales).toString("latin1");
  return utf8(latin1);
}

const conBom = (bytes: Uint8Array): Uint8Array => {
  const salida = new Uint8Array(bytes.length + 3);
  salida.set([0xef, 0xbb, 0xbf], 0);
  salida.set(bytes, 3);
  return salida;
};

describe("problemasDeCodificacion", () => {
  it("un fichero UTF-8 limpio no tiene hallazgos", () => {
    const ficheros = [
      { path: "limpio.ts", bytes: utf8("const acento = 'corrompió';") },
    ];

    expect(problemasDeCodificacion(ficheros)).toEqual([]);
  });

  it("marca un fichero que empieza con BOM", () => {
    // El BOM se coló exactamente así en `scripts/verificar-tests.ts`.
    const ficheros = [{ path: "con-bom.ts", bytes: conBom(utf8("const x = 1;")) }];

    const hallazgos = problemasDeCodificacion(ficheros);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("BOM");
  });

  it("marca un fichero con un acento mal decodificado (mojibake)", () => {
    const ficheros = [
      { path: "con-moji.ts", bytes: mojibakeDe("corrompió la codificación") },
    ];

    const hallazgos = problemasDeCodificacion(ficheros);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("mojibake");
  });

  it("marca el guion largo mal decodificado, que es otro par", () => {
    const ficheros = [{ path: "guion.ts", bytes: mojibakeDe("uno — dos") }];

    expect(problemasDeCodificacion(ficheros)).toHaveLength(1);
  });

  it("no marca la letra inicial suelta que describe el propio patrón", () => {
    // El falso positivo real: el guardarraíl se marcaba a sí mismo por nombrar
    // el carácter inicial en su doc. La firma es la PAREJA, no la letra sola.
    const ficheros = [
      { path: "doc.ts", bytes: utf8("El byte inicial es 0xC3 y el de continuacion varia.") },
    ];

    expect(problemasDeCodificacion(ficheros)).toEqual([]);
  });

  it("acumula un hallazgo por problema, no uno por fichero", () => {
    const ficheros = [
      { path: "los-dos.ts", bytes: conBom(mojibakeDe("corrompió")) },
    ];

    const hallazgos = problemasDeCodificacion(ficheros);

    expect(hallazgos).toHaveLength(2);
    expect(hallazgos.map((h) => (h.includes("BOM") ? "BOM" : "mojibake")).sort()).toEqual([
      "BOM",
      "mojibake",
    ]);
  });
});
