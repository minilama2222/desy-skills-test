import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ANCHO_CAPTURA,
  asegurarCaptura,
  capturaVigente,
  claveDeCaptura,
  leerManifiestoCaptura,
  type ManifiestoCaptura,
} from "../src/captura-gold.js";

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


