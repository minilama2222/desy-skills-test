import { describe, expect, it } from "vitest";
import {
  ESCALA_ESPACIADO,
  FAMILIAS_COLOR,
  esClaseTipografica,
  esColorDelSistema,
  esTokenEspaciado,
  esUtilityArbitraria,
  esUtilityColor,
  esUtilityTailwindPorDefecto,
  esUtilityTokenValido,
  familiaColor,
  tiposDeClaseTipografica,
} from "../src/tokens.js";

describe("escala de espaciado", () => {
  it("es la escala canónica del sistema (8/16/28/32 px y familia)", () => {
    expect(Object.keys(ESCALA_ESPACIADO)).toEqual([
      "xs",
      "sm",
      "base",
      "lg",
      "xl",
      "2xl",
      "3xl",
    ]);
    expect(ESCALA_ESPACIADO.base).toBe("1rem");
  });

  it("reconoce los tokens de espaciado del proyecto", () => {
    for (const token of ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"]) {
      expect(esTokenEspaciado(token)).toBe(true);
    }
  });

  it("no reconoce la escala numérica ni tokens inventados", () => {
    for (const token of ["4", "7", "0", "huge"]) {
      expect(esTokenEspaciado(token)).toBe(false);
    }
  });
});

describe("familias de color", () => {
  it("cubre primary, neutral, warning, success, info y alert", () => {
    expect(FAMILIAS_COLOR).toEqual([
      "primary",
      "neutral",
      "warning",
      "success",
      "info",
      "alert",
    ]);
  });

  it("deriva la familia de una utility de color del sistema", () => {
    expect(familiaColor("bg-primary-base")).toBe("primary");
    expect(familiaColor("text-alert-base")).toBe("alert");
    expect(familiaColor("border-neutral-light")).toBe("neutral");
  });

  it("no deriva familia de una utility de Tailwind por defecto", () => {
    expect(familiaColor("text-blue-700")).toBeUndefined();
    expect(familiaColor("bg-gray-100")).toBeUndefined();
  });
});

describe("clases tipográficas", () => {
  it("acepta las clases c-h* y c-paragraph-* del sistema", () => {
    for (const clase of ["c-h1", "c-h2", "c-h3", "c-h4", "c-paragraph-base", "c-paragraph-lg", "c-paragraph-sm"]) {
      expect(esClaseTipografica(clase)).toBe(true);
    }
  });

  it("rechaza utility Tailwind de tipografía y clases inventadas", () => {
    for (const clase of ["text-3xl", "font-semibold", "leading-normal", "c-paragraph-lead", "c-h5"]) {
      expect(esClaseTipografica(clase)).toBe(false);
    }
  });

  it("enumera los tipos de clase tipográfica disponibles", () => {
    expect(tiposDeClaseTipografica()).toEqual([
      "c-h1",
      "c-h2",
      "c-h3",
      "c-h4",
      "c-paragraph-base",
      "c-paragraph-lg",
      "c-paragraph-sm",
    ]);
  });
});

describe("detección de utility válida/arbitraria/por defecto", () => {
  it("acepta una utility construida con un token del sistema", () => {
    expect(esUtilityTokenValido("bg-primary-base")).toBe(true);
    expect(esUtilityTokenValido("p-base")).toBe(true);
    expect(esUtilityTokenValido("gap-lg")).toBe(true);
    expect(esUtilityTokenValido("text-neutral-dark")).toBe(true);
  });

  it("rechaza utility con valores arbitrarios entre corchetes", () => {
    expect(esUtilityArbitraria("w-[205px]")).toBe(true);
    expect(esUtilityArbitraria("gap-[21px]")).toBe(true);
    expect(esUtilityTokenValido("w-[205px]")).toBe(false);
  });

  it("rechaza la escala numérica de Tailwind en spacing", () => {
    expect(esUtilityTailwindPorDefecto("p-4")).toBe(true);
    expect(esUtilityTailwindPorDefecto("gap-3")).toBe(true);
    expect(esUtilityTailwindPorDefecto("mb-3")).toBe(true);
    expect(esUtilityTailwindPorDefecto("p-base")).toBe(false);
  });

  it("rechaza las familias de color de Tailwind por defecto", () => {
    expect(esUtilityTailwindPorDefecto("text-blue-700")).toBe(true);
    expect(esUtilityTailwindPorDefecto("bg-gray-100")).toBe(true);
    expect(esUtilityTailwindPorDefecto("bg-primary-base")).toBe(false);
  });

  it("no marca los resets a cero: `mb-0` no es un valor de escala inventado", () => {
    // El Gold oficial usa `mb-0` para quitar el margen que puso el sistema.
    expect(esUtilityTailwindPorDefecto("mb-0")).toBe(false);
    expect(esUtilityTailwindPorDefecto("p-0")).toBe(false);
    expect(esUtilityTokenValido("mb-0")).toBe(true);
  });

  it("no marca black/white: son neutros del sistema, no familias de Tailwind", () => {
    // El Gold oficial usa `border-black` en los inputs y `text-black` en botones.
    expect(esUtilityTailwindPorDefecto("border-black")).toBe(false);
    expect(esUtilityTailwindPorDefecto("text-white")).toBe(false);
  });

  it("sí marca la escala numérica real, aunque el Gold la use en el markup", () => {
    // `mr-2`/`pt-0.5` son escala numérica de Tailwind: el detector las marca. La
    // tolerancia es aparte (el guard las exime cuando el Gold las usa; ver el
    // Caso-página). Aquí se comprueba sólo la detección.
    expect(esUtilityTailwindPorDefecto("mr-2")).toBe(true);
    expect(esUtilityTailwindPorDefecto("pt-0.5")).toBe(true);
  });

  it("no confunde modificadores con colores: text-center, border-b, text-sm no son color", () => {
    // Bug arreglado: `esUtilityColor` trataba `text-center`, `border-b` o
    // `text-sm` como colores fuera del sistema. Son modificadores (alineación,
    // lado del borde, tamaño), no paletas.
    for (const clase of [
      "text-center",
      "text-right",
      "text-sm",
      "text-base",
      "border-b",
      "border-t",
      "border-r",
      "border-l",
    ]) {
      expect(esUtilityColor(clase)).toBe(false);
      expect(esUtilityTailwindPorDefecto(clase)).toBe(false);
    }
  });

  it("sigue viendo color real donde lo hay", () => {
    expect(esUtilityColor("text-blue-700")).toBe(true);
    expect(esUtilityColor("bg-primary-base")).toBe(true);
    expect(esUtilityColor("border-neutral-dark")).toBe(true);
  });

  it("detecta si una utility de color pertenece a una familia del sistema", () => {
    expect(esColorDelSistema("bg-primary-base")).toBe(true);
    expect(esColorDelSistema("text-alert-dark")).toBe(true);
    expect(esColorDelSistema("bg-blue-600")).toBe(false);
  });
});
