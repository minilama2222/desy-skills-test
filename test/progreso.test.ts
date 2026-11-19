import { describe, expect, it } from "vitest";
import { duracionLegible, restoEstimadoMs } from "../src/progreso.js";

/**
 * Ticket 20: la suite decía una línea por intento y nada más. Estas dos reglas
 * convierten milisegundos en algo que se lee de un vistazo, y estiman lo que
 * falta con lo que ya se ha medido. Puras: sin reloj, sin consola.
 */

describe("duracionLegible", () => {
  it("por debajo del segundo, en milisegundos", () => {
    expect(duracionLegible(0)).toBe("0ms");
    expect(duracionLegible(900)).toBe("900ms");
  });

  it("hasta un minuto, en segundos sin decimales", () => {
    expect(duracionLegible(12_000)).toBe("12s");
    // 59,6 s redondea a 60 s, y 60 s ya es el tramo de minutos: no debe salir "60s".
    expect(duracionLegible(59_600)).toBe("1m 00s");
  });

  it("en minutos y segundos, con dos dígitos de segundos", () => {
    expect(duracionLegible(60_000)).toBe("1m 00s");
    expect(duracionLegible(184_000)).toBe("3m 04s");
  });

  it("en horas y minutos cuando pasa de la hora", () => {
    expect(duracionLegible(3_600_000)).toBe("1h 00m");
    expect(duracionLegible(3_725_000)).toBe("1h 02m");
  });

  it("un valor imposible no finge una duración", () => {
    expect(duracionLegible(-1)).toBe("—");
    expect(duracionLegible(Number.NaN)).toBe("—");
  });
});

describe("restoEstimadoMs", () => {
  it("sin ningún Caso completado no hay con qué estimar", () => {
    expect(restoEstimadoMs(10_000, 0, 14)).toBeUndefined();
  });

  it("estima con el promedio de los Casos ya hechos", () => {
    // 2 Casos en 10 s ⇒ 5 s por Caso; faltan 12 ⇒ 60 s.
    expect(restoEstimadoMs(10_000, 2, 14)).toBe(60_000);
  });

  it("cuando no falta ninguno, no da una estimación", () => {
    expect(restoEstimadoMs(10_000, 14, 14)).toBeUndefined();
  });

  it("una estimación vacía no se inventa", () => {
    expect(restoEstimadoMs(10_000, 0, 0)).toBeUndefined();
  });
});
