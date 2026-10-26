import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ANCHO_CAPTURA,
  asegurarCaptura,
  capturaVigente,
  claveDeCaptura,
  dimensionesDePng,
  leerManifiestoCaptura,
  problemaDePng,
  type ManifiestoCaptura,
} from "../src/captura-gold.js";

/** PNG mínimo: firma + IHDR con las dimensiones dadas (basta para leerlas). */
function pngConDimensiones(ancho: number, alto: number): Buffer {
  const firma = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(25); // longitud + "IHDR" + 13 bytes de datos + crc
  ihdr.writeUInt32BE(13, 0);
  ihdr.write("IHDR", 4, "ascii");
  ihdr.writeUInt32BE(ancho, 8);
  ihdr.writeUInt32BE(alto, 12);
  return Buffer.concat([firma, ihdr]);
}

describe("dimensionesDePng", () => {
  it("lee ancho y alto de un PNG por su cabecera IHDR", () => {
    const dims = dimensionesDePng(pngConDimensiones(1280, 900));
    expect(dims).toEqual({ firma: "PNG", ancho: 1280, alto: 900 });
  });

  it("rechaza un fichero que no es PNG", () => {
    const noPng = Buffer.from("no soy un png, soy texto plano y bastante largo");
    expect(dimensionesDePng(noPng)).toBeUndefined();
  });

  it("rechaza un buffer demasiado corto para llevar cabecera", () => {
    expect(dimensionesDePng(Buffer.from([137, 80, 78]))).toBeUndefined();
  });
});

describe("problemaDePng", () => {
  it("no hay problema si es un PNG con el ancho esperado", () => {
    expect(problemaDePng(pngConDimensiones(1280, 900), 1280)).toBeUndefined();
  });

  it("señala un fichero que no es PNG", () => {
    const problema = problemaDePng(Buffer.from("texto plano largo largo largo"), 1280);
    expect(problema).toMatch(/PNG/i);
  });

  it("señala un ancho distinto del esperado", () => {
    const problema = problemaDePng(pngConDimensiones(800, 900), 1280);
    expect(problema).toMatch(/ancho/i);
    expect(problema).toContain("800");
    expect(problema).toContain("1280");
  });

  it("sin ancho esperado, sólo exige que sea un PNG", () => {
    expect(problemaDePng(pngConDimensiones(640, 480))).toBeUndefined();
  });
});



describe("claveDeCaptura", () => {
  it("es estable: el mismo Gold-HTML y el mismo ancho dan la misma clave", () => {
    const a = claveDeCaptura({ html: "<h1>Hola</h1>", ancho: 1900 });
    const b = claveDeCaptura({ html: "<h1>Hola</h1>", ancho: 1900 });

    expect(a).toBe(b);
  });

  it("cambia al cambiar el Gold-HTML", () => {
    const a = claveDeCaptura({ html: "<h1>Hola</h1>", ancho: 1900 });
    const b = claveDeCaptura({ html: "<h1>Adiós</h1>", ancho: 1900 });

    expect(a).not.toBe(b);
  });

  it("cambia al cambiar el viewport, aunque el Gold-HTML sea el mismo", () => {
    const a = claveDeCaptura({ html: "<h1>Hola</h1>", ancho: 1900 });
    const b = claveDeCaptura({ html: "<h1>Hola</h1>", ancho: 1200 });

    expect(a).not.toBe(b);
  });

  it("el ancho por defecto de la Captura de Gold es 1900px", () => {
    expect(ANCHO_CAPTURA).toBe(1900);
  });
});

describe("capturaVigente", () => {
  const manifiesto = (clave: string): ManifiestoCaptura => ({
    ancho: 1900,
    clave,
    fichero: "gold.png",
  });

  it("una captura con la clave esperada está vigente", () => {
    const clave = claveDeCaptura({ html: "<h1>Hola</h1>", ancho: 1900 });

    expect(capturaVigente(manifiesto(clave), clave)).toBe(true);
  });

  it("caduca si el Gold-HTML cambió (la clave ya no cuadra)", () => {
    const claveVieja = claveDeCaptura({ html: "<h1>Hola</h1>", ancho: 1900 });
    const claveNueva = claveDeCaptura({ html: "<h1>Adiós</h1>", ancho: 1900 });

    expect(capturaVigente(manifiesto(claveVieja), claveNueva)).toBe(false);
  });

  it("caduca si el viewport cambió (la clave ya no cuadra)", () => {
    const claveVieja = claveDeCaptura({ html: "<h1>Hola</h1>", ancho: 1900 });
    const claveNueva = claveDeCaptura({ html: "<h1>Hola</h1>", ancho: 1200 });

    expect(capturaVigente(manifiesto(claveVieja), claveNueva)).toBe(false);
  });
});

describe("asegurarCaptura (caché de la Captura de Gold como fixture)", () => {
  let dir: string | undefined;

  function carpetaDeCaso(goldHtml: string): string {
    const base = mkdtempSync(join(tmpdir(), "captura-gold-"));
    dir = base;
    writeFileSync(join(base, "gold.html"), goldHtml);
    return base;
  }

  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("captura y deja la fixture + manifiesto cuando no hay caché", () => {
    const caso = carpetaDeCaso("<h1>Hola</h1>");
    let capturadoEn = "";

    const ruta = asegurarCaptura(caso, {
      ancho: ANCHO_CAPTURA,
      capturar: (destino) => {
        capturadoEn = destino;
        writeFileSync(destino, "PNG-FALSO");
      },
    });

    expect(capturadoEn).toBe(ruta);
    expect(ruta).toBe(join(caso, "gold.png"));
    expect(existsSync(ruta)).toBe(true);
    expect(leerManifiestoCaptura(caso)).toEqual({
      ancho: ANCHO_CAPTURA,
      clave: claveDeCaptura({ html: "<h1>Hola</h1>", ancho: ANCHO_CAPTURA }),
      fichero: "gold.png",
    });
  });

  it("no regenera si el Gold-HTML y el viewport no cambiaron", () => {
    const caso = carpetaDeCaso("<h1>Hola</h1>");
    const capturar = (destino: string): void => writeFileSync(destino, "PNG-FALSO");

    asegurarCaptura(caso, { ancho: ANCHO_CAPTURA, capturar });
    let regenerado = false;
    asegurarCaptura(caso, {
      ancho: ANCHO_CAPTURA,
      capturar: (destino) => {
        regenerado = true;
        writeFileSync(destino, "PNG-NUEVO");
      },
    });

    expect(regenerado).toBe(false);
    expect(readFileSync(join(caso, "gold.png"), "utf8")).toBe("PNG-FALSO");
  });

  it("invalida y regenera si cambia el Gold-HTML", () => {
    const caso = carpetaDeCaso("<h1>Hola</h1>");
    asegurarCaptura(caso, {
      ancho: ANCHO_CAPTURA,
      capturar: (destino) => writeFileSync(destino, "PNG-FALSO"),
    });

    writeFileSync(join(caso, "gold.html"), "<h1>Adiós</h1>");
    let regenerado = false;
    asegurarCaptura(caso, {
      ancho: ANCHO_CAPTURA,
      capturar: (destino) => {
        regenerado = true;
        writeFileSync(destino, "PNG-NUEVO");
      },
    });

    expect(regenerado).toBe(true);
    expect(readFileSync(join(caso, "gold.png"), "utf8")).toBe("PNG-NUEVO");
    expect(leerManifiestoCaptura(caso)?.clave).toBe(
      claveDeCaptura({ html: "<h1>Adiós</h1>", ancho: ANCHO_CAPTURA }),
    );
  });

  it("invalida y regenera si cambia el viewport", () => {
    const caso = carpetaDeCaso("<h1>Hola</h1>");
    asegurarCaptura(caso, {
      ancho: ANCHO_CAPTURA,
      capturar: (destino) => writeFileSync(destino, "PNG-FALSO"),
    });

    let regenerado = false;
    asegurarCaptura(caso, {
      ancho: 1200,
      capturar: (destino) => {
        regenerado = true;
        writeFileSync(destino, "PNG-NUEVO");
      },
    });

    expect(regenerado).toBe(true);
    expect(leerManifiestoCaptura(caso)?.ancho).toBe(1200);
  });
});


