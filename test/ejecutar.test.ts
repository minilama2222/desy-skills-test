import { describe, expect, it, vi } from "vitest";
import { alcanzoSkill, entregaDeArtefactos, ejecutarCaso } from "../src/ejecutar.js";
import type { CasoComponente } from "../src/caso.js";
import type { Pin } from "../src/pin.js";
import type { Sandbox } from "../src/runner.js";

const pin: Pin = {
  ref: "main",
  commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-20",
  repo: "https://bitbucket.org/sdaragon/desy-skills",
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

  it("declara entrega cuando la Ejecución produjo un Artefacto", async () => {
    const resultado = await ejecutarCaso(caso, pin, {
      sandbox: {
        create: () =>
          sandbox([
            {
              path: "src/boton.html",
              contenido: '{{ componentButton({ "classes": "c-button--primary" }) }}',
            },
          ]),
      },
      command: { run: () => ({ stdout: "", stderr: "", code: 0 }) },
    });

    expect(resultado.entrega).toBe("con-artefacto");
  });

  it("declara entrega vacía cuando la Ejecución no produjo ningún Artefacto", async () => {
    // El SUT llegó a correr pero no escribió nada (patrón de las Ejecuciones #2
    // y #3 del experimento v2). Sin Artefacto no hay nada que graduar: es una
    // causa distinta de "produjo un Artefacto y no cumple los Checks".
    const resultado = await ejecutarCaso(caso, pin, {
      sandbox: { create: () => sandbox([]) },
      command: { run: () => ({ stdout: "", stderr: "", code: 0 }) },
    });

    expect(resultado.entrega).toBe("sin-artefacto");
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

describe("entregaDeArtefactos", () => {
  it("sin ningún fichero, la entrega está vacía", () => {
    expect(entregaDeArtefactos({})).toBe("sin-artefacto");
  });

  it("con al menos un fichero, hay entrega", () => {
    expect(entregaDeArtefactos({ "src/boton.html": "{{ componentButton() }}" })).toBe(
      "con-artefacto",
    );
  });

  it("un fichero vacío sigue contando como entrega: el contenido lo juzgan los Checks", () => {
    // Frontera deliberada: no produjo nada (sin-artefacto) vs produjo algo malo
    // (con-artefacto + checks en rojo). Confundirlos es justo el bug del ticket.
    expect(entregaDeArtefactos({ "src/boton.html": "" })).toBe("con-artefacto");
  });

  it("varios ficheros cuentan como una sola entrega", () => {
    expect(
      entregaDeArtefactos({ "src/a.html": "x", "src/b.html": "y" }),
    ).toBe("con-artefacto");
  });
});

describe("el reporte separa «no entregó» de «entregó mal»", () => {
  // Lo que el scorecard (ticket 12) necesita para no contar como fallos del
  // skill unas Ejecuciones en las que el skill ni entró.
  const ejecutar = (files: { path: string; contenido: string }[]) =>
    ejecutarCaso(caso, pin, {
      sandbox: { create: () => sandbox(files) },
      command: { run: () => ({ stdout: "", stderr: "", code: 0 }) },
    });

  it("una Ejecución sin Artefacto se distingue aunque el detalle salga en rojo", async () => {
    const sinEntrega = await ejecutar([]);

    // El detalle sigue listando los Checks (no se cambia su forma), pero el
    // resultado deja claro que la causa es la ausencia de entrega, no el juicio
    // de los Checks.
    expect(sinEntrega.entrega).toBe("sin-artefacto");
    expect(sinEntrega.detalle.length).toBeGreaterThan(0);
  });

  it("una Ejecución con Artefacto incorrecto sí es un juicio de los Checks", async () => {
    const entregaMal = await ejecutar([
      { path: "src/boton.html", contenido: "<button>Enviar</button>" }, // sin macro
    ]);

    expect(entregaMal.entrega).toBe("con-artefacto");
    expect(entregaMal.grade).toBe("INACEPTABLE");
  });

  it("dos Ejecuciones con el mismo Grade pero distinta entrega no son el mismo caso", async () => {
    // El bug del ticket: estos dos resultados se veían idénticos (INACEPTABLE).
    const sinEntrega = await ejecutar([]);
    const entregaMal = await ejecutar([
      { path: "src/boton.html", contenido: "<button>Enviar</button>" },
    ]);

    expect(sinEntrega.grade).toBe(entregaMal.grade); // mismo Grade...
    expect(sinEntrega.entrega).not.toBe(entregaMal.entrega); // ...pero distinta causa
  });
});

describe("flujoAlcanzoSkill: ¿llegó a ejecutarse el skill bajo test?", () => {
  // Segundo eje, ortogonal a la Entrega: puedes llegar al skill y no entregar
  // (#2 del experimento v2) o no llegar siquiera (#3). Distinguirlos es la
  // motivación del ticket: un INACEPTABLE de #3 no evalúa el skill.
  const ejecutarConFlujo = (stderr: string) =>
    ejecutarCaso(caso, pin, {
      sandbox: { create: () => sandbox([]) },
      command: { run: () => ({ stdout: "", stderr, code: 0 }) },
    });

  it("true si el Flujo observado invoca el skill del Caso", async () => {
    const resultado = await ejecutarConFlujo(
      '\u001b[0m→ \u001b[0mSkill "desy-preflight-check" \n' +
        '\u001b[0m→ \u001b[0mSkill "desy-implement-component" \n',
    );

    expect(resultado.flujoAlcanzoSkill).toBe(true);
  });

  it("false si el SUT se paró antes de invocar el skill del Caso", async () => {
    const resultado = await ejecutarConFlujo(
      '\u001b[0m→ \u001b[0mSkill "desy-preflight-check" \n',
    );

    expect(resultado.flujoAlcanzoSkill).toBe(false);
  });

  it("false si no hubo ninguna Invocación", async () => {
    const resultado = await ejecutarConFlujo("");

    expect(resultado.flujoAlcanzoSkill).toBe(false);
  });

  it("no confunde invocar otro skill con invocar el skill del Caso", async () => {
    const resultado = await ejecutarConFlujo(
      '\u001b[0m→ \u001b[0mSkill "desy-styles-reference" \n',
    );

    expect(resultado.flujoAlcanzoSkill).toBe(false);
  });

  it("los dos ejes son independientes: llegar al skill no implica entregar", async () => {
    const llegoSinEntregar = await ejecutarConFlujo(
      '\u001b[0m→ \u001b[0mSkill "desy-implement-component" \n',
    );

    expect(llegoSinEntregar.flujoAlcanzoSkill).toBe(true);
    expect(llegoSinEntregar.entrega).toBe("sin-artefacto");
  });
});

describe("alcanzoSkill", () => {
  it("true si el flujo contiene el skill exacto", () => {
    expect(alcanzoSkill(["preflight-check", "implement-component"], "implement-component")).toBe(
      true,
    );
  });

  it("false si el flujo no lo contiene", () => {
    expect(alcanzoSkill(["preflight-check"], "implement-component")).toBe(false);
  });

  it("false con el flujo vacío", () => {
    expect(alcanzoSkill([], "implement-component")).toBe(false);
  });

  it("no casa por prefijo: styles-reference no es implement-component", () => {
    expect(alcanzoSkill(["styles-reference"], "implement-component")).toBe(false);
  });

  it("admite la familia del skill con el comodín del Flujo canónico (implement-*)", () => {
    // El Caso puede pedir la familia `implement-*` y satisfacerla con cualquiera
    // de sus miembros; el comodín va en el paso esperado, no en el observado.
    expect(alcanzoSkill(["preflight-check", "implement-pattern"], "implement-*")).toBe(true);
  });
});
