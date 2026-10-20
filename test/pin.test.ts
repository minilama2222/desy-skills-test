import { describe, expect, it } from "vitest";
import { normalizeRef, parsePin } from "../src/pin.js";

describe("parsePin", () => {
  it("acepta un pin completo y devuelve el commit como hash testeado", () => {
    const pin = parsePin({
      ref: "main",
      commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
      fecha: "2026-10-20",
      repo: "https://github.com/minilama2222/desy-skills",
    });

    expect(pin.commit).toBe("b523ca7df8594532f5fd47376894c16bc8f1b5df");
    expect(pin.ref).toBe("main");
    expect(pin.fecha).toBe("2026-10-20");
  });

  it("acepta un pin con la forma mínima { ref, commit, fecha }", () => {
    const pin = parsePin({
      ref: "main",
      commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
      fecha: "2026-10-20",
    });

    expect(pin.repo).toBeUndefined();
  });

  it("rechaza un commit que no parece un SHA de git", () => {
    expect(() =>
      parsePin({
        ref: "main",
        commit: "no-es-un-sha",
        fecha: "2026-10-20",
        repo: "https://github.com/minilama2222/desy-skills",
      }),
    ).toThrow(/commit/i);
  });

  it("rechaza un pin al que le falta la fecha", () => {
    expect(() =>
      parsePin({
        ref: "main",
        commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
        repo: "https://github.com/minilama2222/desy-skills",
      }),
    ).toThrow(/fecha/i);
  });
});

describe("normalizeRef", () => {
  it("quita el prefijo refs/heads/", () => {
    expect(normalizeRef("refs/heads/main")).toBe("main");
  });

  it("deja intacto un ref que ya es corto", () => {
    expect(normalizeRef("main")).toBe("main");
  });
});
