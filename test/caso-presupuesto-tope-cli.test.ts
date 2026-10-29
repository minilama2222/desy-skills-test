import { describe, expect, it } from "vitest";
import { correrCaso, presupuestoDe } from "../src/cli.js";
import type { Caso } from "../src/caso.js";
import type { Pin } from "../src/pin.js";

/**
 * Ticket 03 (bucle-de-refinamiento) / ADR-0014: `--tope` declarado en la línea
 * de órdenes llega al bucle. El bucle en sí se prueba en
 * `caso-presupuesto-correr-caso.test.ts`; aquí se fija la frontera que aquel no
 * ve: que el argumento del usuario no se pierda (ni se invente) por el camino.
 */

const pin: Pin = { ref: "", commit: "c", fecha: "2026-10-29", repo: "https://x" };

const caso: Caso = {
  skill: "implement-component",
  id: "boton-primario",
  tipo: "caso-componente",
  prompt: "Genera un botón primario",
  checks: [],
};

describe("el --tope de la línea de órdenes llega al bucle", () => {
  it("con --n 2 y --tope 3, el bucle intenta como mucho 3 veces", async () => {
    let intentos = 0;
    const presupuesto = presupuestoDe(["--n", "2", "--tope", "3"], 1);

    expect(presupuesto).toEqual({ n: 2, tope: 3 });
    await correrCaso(caso, pin, {
      ...presupuesto,
      deps: {
        sandbox: {
          create: () => ({
            workDir: ".",
            home: ".",
            configDir: ".",
            skillsDir: ".",
            copySkills: () => {},
            configurar: () => {},
            listArtefactos: () => [],
            cleanup: () => {},
          }),
        },
        command: {
          run: () => {
            intentos += 1;
            return {
              stdout: "",
              stderr: '\u2192 Skill "desy-implement-component"\n',
              code: 0,
            };
          },
        },
      },
    });
    // Sin --tope habrían sido 4 (el doble de 2): el 3 declarado manda.
    expect(intentos).toBe(3);
  });

  it("sin --tope, el presupuesto no declara tope: el defecto lo pone la regla (n * 2)", () => {
    expect(presupuestoDe(["--n", "3"], 1)).toEqual({ n: 3 });
  });

  it("un --tope menor que --n es un error de uso, no un presupuesto imposible", () => {
    expect(() => presupuestoDe(["--n", "3", "--tope", "2"], 1)).toThrow(/--tope inválido/);
  });
});
