import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import { grado } from "../src/grader.js";
import type { ResultadoEjecucion } from "../src/ejecutar.js";
import type { AnclaDeSkill } from "../src/caso.js";
import {
  esHallazgoDeTrigger,
  lineasQueMencionan,
  renderInformeCaso,
  type ContextoDelCaso,
} from "../src/informe.js";
import { lectorDeSecciones, seccionDeSkill, titulosDeSkill } from "../src/seccion-skill.js";
import { VENDOR_SKILLS_DIR } from "../src/runner.js";

/**
 * Ticket 06 (bucle de refinamiento): el informe por Caso pone lado a lado la
 * aserción del Check fallido, la línea del artefacto que la tumba y la sección del
 * skill que el Caso nombra. Estos tests fijan las cuatro casillas del ticket:
 * el bloque por Check, la cita por texto de la sección, que **no** haya veredicto
 * automático, y que sin invocación el bloque lo diga.
 */

const CASO_DIR = join(CASOS_DIR, "implement-component", "componente", "boton-primario");

/** El fuente correcto que produjo el SUT real (el de la Evidencia del 27/10). */
const ARTEFACTO_BUENO = [
  '{# boton-enviar.njk — referencia: botón primario estándar "Enviar" (desy-html) #}',
  '{% from "components/button/_macro.button.njk" import componentButton %}',
  "",
  "{{ componentButton({",
  '  "text": "Enviar",',
  '  "type": "submit",',
  '  "classes": "c-button--primary"',
  "}) }}",
].join("\n");

/** El mismo fichero sin la variante: el Guard `variante-primaria` lo tumba. */
const ARTEFACTO_SIN_VARIANTE = ARTEFACTO_BUENO.replace('"classes": "c-button--primary"', '"classes": ""');

const FLUJO = ["preflight-check", "implement-component"];

/**
 * Una Ejecución graduada con el **Caso real** (`boton-primario`), no con un Caso
 * de juguete: así el informe se prueba contra los Checks que el ticket nombra y
 * contra la rúbrica que ancla sus secciones.
 */
function ejecucionReal(
  artefacto: string,
  over: Partial<ResultadoEjecucion> = {},
): ResultadoEjecucion {
  const caso = cargarCaso(CASO_DIR);
  const { grade, detalle } = grado(
    { artefactos: { files: { "src/boton-enviar.njk": artefacto } }, transcript: { invocaciones: FLUJO } },
    { tipo: caso.tipo, checks: caso.checks },
  );
  return {
    skill: caso.skill,
    caso: caso.id,
    tipo: caso.tipo,
    pin: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
    fecha: "2026-10-28",
    grade,
    detalle,
    flujoObservado: FLUJO,
    artefactos: { "src/boton-enviar.njk": artefacto },
    entrega: "con-artefacto",
    flujoAlcanzoSkill: true,
    exitCode: 0,
    ultimoPasoDelFlujo: "implement-component",
    arbolHash: "hash-de-fixture",
    salida: { stdout: "", stderr: "" },
    ...over,
  };
}

/** El contexto real del Caso: prompt, anclas de la rúbrica y lector de vendor/. */
function contextoReal(): ContextoDelCaso {
  const caso = cargarCaso(CASO_DIR);
  return {
    caso: caso.id,
    prompt: caso.prompt,
    anclas: new Map(
      caso.checks.flatMap((c) => (c.ancla === undefined ? [] : [[c.id, c.ancla] as const])),
    ),
    leerSeccion: lectorDeSecciones(VENDOR_SKILLS_DIR),
  };
}

/** El número de línea (1-based) de la primera línea del artefacto que contiene `aguja`. */
function lineaDe(artefacto: string, aguja: string): number {
  const i = artefacto.split("\n").findIndex((l) => l.includes(aguja));
  if (i === -1) throw new Error(`el artefacto de prueba no contiene "${aguja}"`);
  return i + 1;
}

describe("renderInformeCaso: el bloque de cada Check", () => {
  it("cada Check sale con ✓/✗ y el fallido con su aserción y la línea que lo tumba", () => {
    const texto = renderInformeCaso([ejecucionReal(ARTEFACTO_SIN_VARIANTE)], contextoReal());

    // Un ✓/✗ por Check, y el que pasa no arrastra el aparato del fallo.
    expect(texto).toContain("✗ **variante-primaria** (guard)");
    expect(texto).toContain("✓ **usa-macro-boton** (guard)");
    // La aserción, en texto: qué exige y qué lo tumba.
    expect(texto).toContain("Exige: La llamada a `componentButton` lleva `c-button--primary` en `classes`.");
    expect(texto).toContain("Tumba: ninguna llamada a `componentButton` pone `c-button--primary` en `classes`");
  });

  it("cita la línea del artefacto con su número, tomada de lo que el SUT entregó", () => {
    // Si sobra `c-button--lg`, la línea que lo pone es la que tumba el Quality.
    const conGrande = ARTEFACTO_BUENO.replace(
      '"classes": "c-button--primary"',
      '"classes": "c-button--primary c-button--lg"',
    );
    const texto = renderInformeCaso([ejecucionReal(conGrande)], contextoReal());

    const numero = lineaDe(conGrande, "c-button--lg");
    expect(texto).toMatch(new RegExp(`${numero} \\| "classes": "c-button--primary c-button--lg"`));
    expect(texto).toContain("src/boton-enviar.njk");
  });

  it("si el Check falla por ausencia, dice en qué línea debería estar y no inventa culpables", () => {
    // Sin la variante: no hay línea con `c-button--primary` que citar como culpable.
    const texto = renderInformeCaso([ejecucionReal(ARTEFACTO_SIN_VARIANTE)], contextoReal());

    expect(texto).toContain("el Check falla por **ausencia**");
    expect(texto).toContain("Donde debería estar:");
    // La llamada al macro, no el `{% from … import %}`: es la línea que hay que editar.
    const numero = lineaDe(ARTEFACTO_SIN_VARIANTE, "componentButton({");
    expect(texto).toMatch(new RegExp(`${numero} \\| \\{\\{ componentButton\\(\\{`));
  });

  it("declara el prompt, los artefactos, el Flujo y el exit code del Caso", () => {
    const texto = renderInformeCaso([ejecucionReal(ARTEFACTO_BUENO)], contextoReal());

    expect(texto).toContain("Genera un botón primario de tamaño estándar con el texto \"Enviar\".");
    expect(texto).toContain("`src/boton-enviar.njk`");
    expect(texto).toContain("`preflight-check` → `implement-component`");
    expect(texto).toContain("Exit code:** `0`");
  });

  it("cuando el Check falla por ausencia del macro, no hay línea que citar y lo dice", () => {
    // Sin el macro: `usa-macro-boton` falla porque no está, no por un texto.
    const sinMacro = '<button type="submit" class="c-button c-button--primary">Enviar</button>';
    const texto = renderInformeCaso([ejecucionReal(sinMacro)], contextoReal());

    expect(texto).toContain("el Check falla por **ausencia**");
    // HTML suelto no tiene macro donde anclar: no se rellena con la línea del fichero.
    expect(texto).not.toContain("Donde debería estar:");
  });

  it("una Ejecución que no invocó ningún skill no cita ninguna sección, y lo dice", () => {
    // Sin invocación no hay árbol del que leerla: el ticket lo pide explícito.
    const sinInvocacion = ejecucionReal(ARTEFACTO_SIN_VARIANTE, {
      flujoObservado: [],
      flujoAlcanzoSkill: false,
    });
    // **Sin** injertar un lector vacío: el árbol real de `vendor/` sí tiene la
    // sección del ancla. Éste es el caso que la primera versión del test tapaba —
    // consultaba `leerSeccion` antes de mirar la invocación y citaba la sección
    // de una corrida que no leyó nada.
    const texto = renderInformeCaso([sinInvocacion], contextoReal());

    expect(texto).toContain("no se invocó ningún skill, así que no hay sección que leer");
    expect(texto).not.toContain("```markdown");
    // Y no aparece el cuerpo de la sección, que sí existe en el árbol.
    expect(texto).not.toContain("- `c-button`, `c-button--primary`, `c-button--secondary`");
  });

  it("sin invocación no cita la sección ni siquiera cuando el skill existe en el árbol", () => {
    // La variante del mismo fallo, explícita: el lector devuelve texto de verdad.
    const sinInvocacion = ejecucionReal(ARTEFACTO_SIN_VARIANTE, {
      flujoObservado: [],
      flujoAlcanzoSkill: false,
    });
    const conArbol = lectorDeSecciones(VENDOR_SKILLS_DIR);
    // Control: el mismo ancla SÍ se lee cuando hay invocación, así que el caso de
    // arriba mide la regla y no un lector que no encuentra nada.
    expect(
      conArbol({ skill: "desy-styles-reference", seccion: "Componentes con `c-*` (bloques UI completos)" }),
    ).toBeTypeOf("string");

    const texto = renderInformeCaso([sinInvocacion], {
      ...contextoReal(),
      leerSeccion: conArbol,
    });

    expect(texto).toContain("no se invocó ningún skill, así que no hay sección que leer");
    expect(texto).not.toContain("```markdown");
  });
});

describe("renderInformeCaso: la sección del skill, por texto", () => {
  it("cita la sección del skill que el Caso nombra, por su título", () => {
    const texto = renderInformeCaso([ejecucionReal(ARTEFACTO_SIN_VARIANTE)], contextoReal());

    expect(texto).toContain("**Sección del skill:** `desy-styles-reference` → «Componentes con `c-*` (bloques UI completos)»");
  });

  it("el texto citado es el de la sección, no el de todo el SKILL.md", () => {
    const texto = renderInformeCaso([ejecucionReal(ARTEFACTO_SIN_VARIANTE)], contextoReal());
    const seccion = seccionDeSkill(
      readFileSync(join(VENDOR_SKILLS_DIR, "desy-styles-reference", "SKILL.md"), "utf8"),
      "Componentes con `c-*` (bloques UI completos)",
    ) as string;

    const primera = seccion.split("\n").find((l) => l.trim().length > 0)!;
    expect(texto).toContain(primera);
    // Y no cita otra sección del mismo skill como si fuera ésta.
    expect(texto).not.toContain("## Espaciado (escala de tokens del proyecto)");
  });

  it("un Check sin ancla dice que no declara sección, en vez de rellenarla", () => {
    // `tokens-del-sistema` lo aporta el Framework: el Caso no lo ancla.
    const texto = renderInformeCaso(
      [
        ejecucionReal('<div class="p-2 w-full">x</div>', {
          artefactos: { "src/boton-enviar.njk": '<div class="p-2 w-full">x</div>' },
        }),
      ],
      contextoReal(),
    );

    expect(texto).toContain("✗ **tokens-del-sistema** (guard)");
    expect(texto).toContain("el Check no declara de qué sección depende");
  });

  it("cita la sección por título aunque el número de línea cambie entre versiones", () => {
    // El ancla es una frase, no un `L37`: un skill que crezca arriba sigue
    // casando, y eso es lo que el ticket pide al decir «por texto».
    const skillMd = ["# Skill", "", "## Introducción", "...", "", "## Componentes con `c-*` (bloques UI completos)", "", "- `c-button`"].join("\n");
    expect(seccionDeSkill(skillMd, "Componentes con `c-*` (bloques UI completos)")).toBe(
      "## Componentes con `c-*` (bloques UI completos)\n\n- `c-button`",
    );
    expect(seccionDeSkill("## Otra cosa", "Componentes con `c-*` (bloques UI completos)")).toBeUndefined();
  });
});

describe("renderInformeCaso: presenta, no adivina", () => {
  it("no emite veredicto de culpa del skill o del check", () => {
    const texto = renderInformeCaso(
      [
        ejecucionReal(ARTEFACTO_SIN_VARIANTE),
        ejecucionReal(ARTEFACTO_BUENO, { caso: "otro" }),
      ],
      contextoReal(),
    );

    expect(texto).not.toMatch(/culpa/i);
    expect(texto).not.toMatch(/culpable/i);
    expect(texto).not.toMatch(/\bfallo del skill\b/i);
    expect(texto).not.toMatch(/\bfallo del check\b/i);
    // Sí dice qué hace: presentar.
    expect(texto).toContain("presenta; no adivina");
  });

  it("presenta las Ejecuciones que no alcanzaron el skill, que el scorecard descarta", () => {
    const texto = renderInformeCaso(
      [
        ejecucionReal(ARTEFACTO_BUENO),
        ejecucionReal(ARTEFACTO_SIN_VARIANTE, { flujoObservado: [], flujoAlcanzoSkill: false }),
      ],
      contextoReal(),
    );

    expect(texto).toContain("### Ejecución 1");
    expect(texto).toContain("### Ejecución 2");
    expect(texto).toContain("no invocó ningún skill");
  });
});

describe("esHallazgoDeTrigger / lineasQueMencionan", () => {
  it("una entrega EXCELENTE sin invocar el skill se destaca", () => {
    const ejecucion = ejecucionReal(ARTEFACTO_BUENO, {
      flujoObservado: [],
      flujoAlcanzoSkill: false,
    });

    expect(esHallazgoDeTrigger(ejecucion)).toBe(true);
    expect(renderInformeCaso([ejecucion], contextoReal())).toContain("Hallazgo de trigger");
  });

  it("una entrega EXCELENTE que sí invocó el skill no es hallazgo de trigger", () => {
    expect(esHallazgoDeTrigger(ejecucionReal(ARTEFACTO_BUENO))).toBe(false);
  });

  it("una entrega no correcta sin invocación tampoco: no hay entrega buena que rescatar", () => {
    const ejecucion = ejecucionReal(ARTEFACTO_SIN_VARIANTE, {
      flujoObservado: [],
      flujoAlcanzoSkill: false,
    });

    expect(esHallazgoDeTrigger(ejecucion)).toBe(false);
  });

  it("busca la aguja sin distinguir mayúsculas y devuelve la línea con su número", () => {
    expect(lineasQueMencionan("uno\nC-BUTTON--PRIMARY\ntres", "c-button--primary")).toEqual([
      { numero: 2, texto: "C-BUTTON--PRIMARY" },
    ]);
  });

  it("no devuelve nada si la aguja no está, ni si es vacía", () => {
    expect(lineasQueMencionan("uno\ndos", "c-button--primary")).toEqual([]);
    expect(lineasQueMencionan("uno\ndos", "   ")).toEqual([]);
  });
});

describe("titulosDeSkill", () => {
  it("lista los títulos de todas las secciones", () => {
    const titulos = titulosDeSkill("# A\n\n## B\n\n### C ##\n");

    expect([...titulos]).toEqual(["A", "B", "C"]);
  });
});

describe("anclas del Caso real: apuntan a secciones que existen", () => {
  it("cada Check del Caso ancla en una sección real de su skill", () => {
    const caso = cargarCaso(CASO_DIR);
    const lector = lectorDeSecciones(VENDOR_SKILLS_DIR);
    const ancladas = caso.checks.filter((c) => c.ancla !== undefined);

    expect(ancladas.length).toBeGreaterThan(0);
    for (const check of ancladas) {
      const ancla = check.ancla as AnclaDeSkill;
      expect(lector(ancla), `${check.id} → ${ancla.skill} / ${ancla.seccion}`).toBeTypeOf("string");
    }
  });
});
