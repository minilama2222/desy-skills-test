import { describe, expect, it } from "vitest";
import { ejecutarCaso } from "../src/ejecutar.js";
import type { Caso } from "../src/caso.js";
import type { Pin } from "../src/pin.js";
import type { CommandRunner } from "../src/runner.js";

/**
 * Ticket 02 (bucle-de-refinamiento): una Ejecución registra el exit code del SUT
 * y el último paso del Flujo alcanzado, para que el informe distinga «crasheó» de
 * «se quedó sin entregar». Hoy el exit code se calcula en `realCommand` y se
 * descarta en `runCaso`.
 */

const pin: Pin = {
  ref: "main",
  commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-28",
  repo: "https://github.com/minilama2222/desy-skills",
};

const caso: Caso = {
  skill: "implement-component",
  id: "boton-primario",
  tipo: "caso-componente",
  prompt: "Genera un botón",
  checks: [],
};

const ejercutarCon = (stdout: string, stderr: string, code: number) =>
  ejecutarCaso(caso, pin, {
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
    command: { run: () => ({ stdout, stderr, code }) } satisfies CommandRunner,
  });

const FLUJO_COMPLETO =
  '\u001b[0m→ \u001b[0mSkill "desy-preflight-check" \n' +
  '\u001b[0m→ \u001b[0mSkill "desy-implement-component" \n';

describe("exitCode: ¿el SUT terminó bien o crasheó?", () => {
  it("registra el exit code que devuelve el command runner", async () => {
    const resultado = await ejercutarCon("", FLUJO_COMPLETO, 0);

    expect(resultado.exitCode).toBe(0);
  });

  it("distingue un crash (exit ≠ 0) de una salida limpia", async () => {
    const resultado = await ejercutarCon("", FLUJO_COMPLETO, 1);

    expect(resultado.exitCode).toBe(1);
  });
});

describe("ultimoPasoDelFlujo: ¿dónde se paró?", () => {
  it("es el último paso invocado cuando hay varios", async () => {
    const resultado = await ejercutarCon("", FLUJO_COMPLETO, 0);

    expect(resultado.ultimoPasoDelFlujo).toBe("implement-component");
  });

  it("es null cuando el SUT no invocó ningún skill", async () => {
    const resultado = await ejercutarCon("", "", 0);

    expect(resultado.ultimoPasoDelFlujo).toBeNull();
  });

  it("es el único paso cuando el SUT se paró tras preflight", async () => {
    const resultado = await ejercutarCon(
      "",
      '\u001b[0m→ \u001b[0mSkill "desy-preflight-check" \n',
      0,
    );

    expect(resultado.ultimoPasoDelFlujo).toBe("preflight-check");
  });
});
