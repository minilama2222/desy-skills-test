import { describe, expect, it } from "vitest";
import { componenteDeMacro, propsValidasDeMacro } from "../src/catalogo.js";

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
