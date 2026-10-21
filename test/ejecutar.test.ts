import { describe, expect, it, vi } from "vitest";
import { ejecutarCaso } from "../src/ejecutar.js";
import type { CasoComponente } from "../src/caso.js";
import type { Pin } from "../src/pin.js";
import type { Sandbox } from "../src/runner.js";

const pin: Pin = {
  ref: "main",
  commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-20",
  repo: "https://github.com/minilama2222/desy-skills",
};

const caso: CasoComponente = {
  tipo: "caso-componente",
  skill: "implement-component",
  id: "boton-primario",
  prompt: "Genera un botón primario tamaño estándar con texto 'Enviar'",
  checks: [
    {
      id: "usa-macro-boton",
      severity: "guard",
      weight: 0,
      assert: { kind: "macro_presente", macro: "componentButton" },
    },
    {
      id: "variante-primaria",
      severity: "guard",
      weight: 0,
      assert: {
        kind: "macro_con_clase",
        macro: "componentButton",
        clase: "c-button--primary",
      },
    },
  ],
};

const sandbox = (files: { path: string; contenido: string }[]): Sandbox => ({
  workDir: "C:/sandbox/work",
  home: "C:/sandbox/home",
  configDir: "C:/sandbox/home/.config/opencode",
  skillsDir: "C:/sandbox/home/.config/opencode/skills",
  copySkills: vi.fn(),
  listArtefactos: () => files,
  cleanup: vi.fn(),
});

describe("ejecutarCaso", () => {
  it("devuelve el resultado con la Evidencia, el Grade y el detalle por Check", async () => {
    const output =
      '{{ componentButton({ "text": "Enviar", "classes": "c-button--primary" }) }}';
    const resultado = await ejecutarCaso(caso, pin, {
      sandbox: { create: () => sandbox([{ path: "index.njk", contenido: output }]) },
      command: {
        run: () => ({
          stdout: "» skill: preflight-check\n» skill: implement-component\n",
          stderr: "",
          code: 0,
        }),
      },
    });

    expect(resultado.grade).toBe("EXCELENTE");
    expect(resultado.detalle.map((d) => d.id)).toEqual(
      expect.arrayContaining(["usa-macro-boton", "variante-primaria"]),
    );
  });

  it("reporta el Flujo observado y el Pin testeado junto al Grade", async () => {
    const resultado = await ejecutarCaso(caso, pin, {
      sandbox: {
        create: () =>
          sandbox([
            {
              path: "index.njk",
              contenido: '{{ componentButton({ "classes": "c-button--primary" }) }}',
            },
          ]),
      },
      command: {
        run: () => ({
          stdout: "» skill: preflight-check\n» skill: implement-component\n",
          stderr: "",
          code: 0,
        }),
      },
    });

    expect(resultado.flujoObservado).toEqual(["preflight-check", "implement-component"]);
    expect(resultado.pin).toBe(pin.commit);
  });

  it("hunde el Grade a INACEPTABLE si falta la variante primaria", async () => {
    const resultado = await ejecutarCaso(caso, pin, {
      sandbox: {
        create: () =>
          sandbox([
            {
              path: "index.njk",
              contenido: '{{ componentButton({ "text": "Enviar" }) }}',
            },
          ]),
      },
      command: { run: () => ({ stdout: "", stderr: "", code: 0 }) },
    });

    expect(resultado.grade).toBe("INACEPTABLE");
  });

  it("es estable: dos Ejecuciones con la misma Evidencia dan el mismo Grade y Flujo", async () => {
    const deps = {
      sandbox: {
        create: () =>
          sandbox([
            {
              path: "index.njk",
              contenido: '{{ componentButton({ "classes": "c-button--primary" }) }}',
            },
          ]),
      },
      command: {
        run: () => ({
          stdout: "» skill: preflight-check\n» skill: implement-component\n",
          stderr: "",
          code: 0,
        }),
      },
    };

    const a = await ejecutarCaso(caso, pin, deps);
    const b = await ejecutarCaso(caso, pin, deps);

    expect(a.grade).toBe(b.grade);
    expect(a.flujoObservado).toEqual(b.flujoObservado);
    expect(a.detalle).toEqual(b.detalle);
  });

  it("siempre limpia el sandbox", async () => {
    const sb = sandbox([{ path: "index.njk", contenido: "" }]);
    await ejecutarCaso(caso, pin, {
      sandbox: { create: () => sb },
      command: { run: () => ({ stdout: "", stderr: "", code: 0 }) },
    });
    expect(sb.cleanup).toHaveBeenCalledOnce();
  });
});
