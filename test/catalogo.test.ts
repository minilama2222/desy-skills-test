import { describe, expect, it } from "vitest";
import {
  componenteDeMacro,
  componenteEnCatalogo,
  propsValidasDeMacro,
  varianteEnCatalogo,
} from "../src/catalogo.js";

describe("componenteDeMacro", () => {
  it("deriva el nombre del componente del catálogo a partir del macro", () => {
    expect(componenteDeMacro("componentButton")).toBe("button");
    expect(componenteDeMacro("componentInput")).toBe("input");
    expect(componenteDeMacro("componentSelect")).toBe("select");
  });

  it("convierte CamelCase a la clave kebab del catálogo", () => {
    expect(componenteDeMacro("componentDateInput")).toBe("date-input");
    expect(componenteDeMacro("componentErrorSummary")).toBe("error-summary");
    expect(componenteDeMacro("componentCharacterCount")).toBe("character-count");
  });

  it("devuelve undefined si el macro no sigue la convención componentXxx", () => {
    expect(componenteDeMacro("algoRaro")).toBeUndefined();
  });
});

describe("propsValidasDeMacro", () => {
  it("devuelve los params del catálogo para el macro (componentButton)", () => {
    const props = propsValidasDeMacro("componentButton");
    expect(props).toBeDefined();
    expect(props).toContain("text");
    expect(props).toContain("classes");
    expect(props).toContain("href");
    expect(props).toContain("disabled");
  });

  it("no incluye un nombre de prop inventado", () => {
    const props = propsValidasDeMacro("componentButton");
    expect(props).not.toContain("variante");
    expect(props).not.toContain("color");
  });

  it("devuelve undefined para un macro que no existe en el catálogo", () => {
    expect(propsValidasDeMacro("componentInexistente")).toBeUndefined();
  });

  it("lee los params reales de otro componente del catálogo", () => {
    const props = propsValidasDeMacro("componentSelect");
    expect(props).toContain("items");
  });

  it("funciona con un componente cuyo macro lleva varias palabras (dateInput)", () => {
    const props = propsValidasDeMacro("componentDateInput");
    expect(props).toBeDefined();
    expect(props!.length).toBeGreaterThan(0);
  });
});

describe("componenteEnCatalogo", () => {
  it("reconoce un componente que existe en el catálogo", () => {
    expect(componenteEnCatalogo("button")).toBe(true);
    expect(componenteEnCatalogo("input-group")).toBe(true);
    expect(componenteEnCatalogo("header-mini")).toBe(true);
  });

  it("rechaza un componente inventado", () => {
    expect(componenteEnCatalogo("header-advanced-2")).toBe(false);
    expect(componenteEnCatalogo("boton-magico")).toBe(false);
  });

  it("normaliza mayúsculas y espacios", () => {
    expect(componenteEnCatalogo("Input-Group")).toBe(true);
    expect(componenteEnCatalogo("  button  ")).toBe(true);
  });

  it("resuelve sinónimos de componente como el linter (link → links-list)", () => {
    expect(componenteEnCatalogo("link")).toBe(true);
  });
});

describe("varianteEnCatalogo", () => {
  it("reconoce una variante documentada (normalizada)", () => {
    expect(varianteEnCatalogo("button", "primario")).toBe(true);
    expect(varianteEnCatalogo("button", "por defecto")).toBe(true);
  });

  it("traduce español↔inglés como el linter (primario ≡ primary)", () => {
    expect(varianteEnCatalogo("button", "primary")).toBe(true);
    expect(varianteEnCatalogo("button", "alerta")).toBe(true);
    expect(varianteEnCatalogo("button", "alert")).toBe(true);
  });

  it("rechaza una variante que no está documentada para ese componente", () => {
    expect(varianteEnCatalogo("button", "inventada")).toBe(false);
    expect(varianteEnCatalogo("button", "ceo")).toBe(false);
  });

  it("rechaza una clase CSS usada como variante (c-button--primary)", () => {
    expect(varianteEnCatalogo("button", "c-button--primary")).toBe(false);
  });

  it("devuelve falso para un componente que no existe", () => {
    expect(varianteEnCatalogo("boton-magico", "primario")).toBe(false);
  });
});
