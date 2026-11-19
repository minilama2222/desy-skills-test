import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import type { Check } from "../src/caso.js";
import type { ResultadoEjecucion } from "../src/ejecutar.js";
import { VENDOR_SKILLS_DIR } from "../src/runner.js";
import { titulosDeSkill } from "../src/seccion-skill.js";
import {
  AFIRMACIONES_DEL_REPO,
  camposQueFaltan,
  checklist,
  derivas,
  evaluarAfirmacion,
  lectorDeSkillMd,
  renderLineaDeReplay,
  replayDeEjecucion,
  replayDeEjecuciones,
  type AfirmacionDelSkill,
} from "../src/tier-rapido.js";

/**
 * El tier rápido (ticket 08): (a) el replay del grader y (b) la checklist
 * Skill → Casos. Son dos preguntas distintas —¿derivó el grader? y ¿qué Casos
 * dependen del texto que acabo de editar?— y se prueban por separado.
 *
 * Ninguno abre un proceso ni un navegador: el replay recibe Ejecuciones ya
 * graduadas, y la checklist recibe el texto del `SKILL.md`.
 */

const SKILL_MD = [
  "# desy-ejemplo",
  "",
  "## Espaciado (escala de tokens del proyecto)",
  "",
  "**Unidad base: 1rem.** El sistema no tiene `p-4`; usa `p-base` y `gap-base`.",
  "| `--spacing-lg` | 1.75rem | ~28px |",
  "",
  "## Otra sección",
  "",
  "Texto que no toca a nadie.",
  "",
].join("\n");

const SECCION: AfirmacionDelSkill = {
  skill: "desy-ejemplo",
  resumen: "la sección nombra la utilidad `gap-base`",
  seccion: "Espaciado (escala de tokens del proyecto)",
  contiene: "`gap-base`",
  caso: "ejemplo/caso-uno",
};

const PAGINA_PRUEBA: AfirmacionDelSkill = {
  skill: "desy-ejemplo",
  resumen: "la sección no habla (todavía) de copiar la página de prueba",
  seccion: "Otra sección",
  ausente: "página de prueba",
  caso: "ejemplo/caso-dos",
};

describe("(b) checklist: ¿la sección dice lo que el Caso depende de que diga?", () => {
  it("vigente cuando el texto está en la sección", () => {
    expect(evaluarAfirmacion(SECCION.skill, SKILL_MD, SECCION).estado).toBe("vigente");
  });

  it("cambiada cuando la sección ya no lo tiene, y el motivo nombra el texto y la sección", () => {
    const r = evaluarAfirmacion(SECCION.skill, SKILL_MD, { ...SECCION, contiene: "gap-x-4" });
    expect(r.estado).toBe("cambiada");
    expect(r.motivo).toContain("`gap-x-4`");
    expect(r.motivo).toContain("Espaciado (escala de tokens del proyecto)");
  });

  it("se lee la SECCIÓN, no el fichero: el mismo texto fuera de ella no la hace vigente", () => {
    // Adverso y control positivo con el mismo fichero: el texto `gap-x-4` existe,
    // pero en «Otra sección». La única diferencia entre los dos casos es la
    // sección que se mira; una regla que mirara el fichero entero los aplanaría.
    const md = SKILL_MD.replace("Texto que no toca a nadie.", "Copia `gap-x-4` (legacy).");
    const enLaSuya = evaluarAfirmacion("desy-ejemplo", md, { ...SECCION, contiene: "gap-x-4" });
    const enLaOtra = evaluarAfirmacion("desy-ejemplo", md, {
      ...SECCION,
      contiene: "gap-x-4",
      seccion: "Otra sección",
    });
    expect(enLaSuya.estado).toBe("cambiada");
    expect(enLaOtra.estado).toBe("vigente");
  });

  it("ausente: vigente mientras no esté, cambiada en cuanto aparece", () => {
    expect(evaluarAfirmacion("desy-ejemplo", SKILL_MD, PAGINA_PRUEBA).estado).toBe("vigente");
    const aplicada = SKILL_MD.replace(
      "Texto que no toca a nadie.",
      "Copia la página de prueba antes de editar.",
    );
    const r = evaluarAfirmacion("desy-ejemplo", aplicada, PAGINA_PRUEBA);
    expect(r.estado).toBe("cambiada");
    expect(r.motivo).toContain("página de prueba");
  });

  it("sin-seccion: el título se renombró, o el skill no está en el árbol", () => {
    const renombrada = evaluarAfirmacion("desy-ejemplo", SKILL_MD, {
      ...SECCION,
      seccion: "Sección que se renombró",
    });
    expect(renombrada.estado).toBe("sin-seccion");
    expect(renombrada.motivo).toContain("no existe");

    const sinSkill = evaluarAfirmacion("desy-ausente", undefined, SECCION);
    expect(sinSkill.estado).toBe("sin-seccion");
    expect(sinSkill.motivo).toContain("SKILL.md");
  });

  it("dice qué Casos re-correr: los de los hechos cambiados, cada uno una vez y en orden", () => {
    const md = SKILL_MD.replace("Texto que no toca a nadie.", "Copia la página de prueba.");
    const conRepeticion = [
      { ...SECCION, contiene: "no está esto" },
      PAGINA_PRUEBA,
      { ...SECCION, resumen: "otro hecho del mismo Caso", contiene: "tampoco esto" },
    ];
    expect(checklist(conRepeticion, () => md).queReCorrer).toEqual([
      "ejemplo/caso-dos",
      "ejemplo/caso-uno",
    ]);
  });

  it("sin nada cambiado no propone re-correr nada (control positivo del anterior)", () => {
    const r = checklist([SECCION, PAGINA_PRUEBA], () => SKILL_MD);
    expect(r.queReCorrer).toEqual([]);
    expect(r.vigentes).toHaveLength(2);
    expect(r.cambiadas).toEqual([]);
  });

  it("el lector de SKILL.md devuelve el fichero entero, y undefined si el skill no está", () => {
    const dir = mkdtempSync(join(tmpdir(), "tier-rapido-"));
    try {
      mkdirSync(join(dir, "desy-ejemplo"));
      writeFileSync(join(dir, "desy-ejemplo", "SKILL.md"), SKILL_MD, "utf8");
      const leer = lectorDeSkillMd(dir);
      expect(leer("desy-ejemplo")).toContain("## Otra sección");
      expect(leer("desy-ausente")).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * La lista de hechos **en sí** es lo que protege el build: un hecho que cita una
 * sección que no existe, o un Caso que ya no está, haría que la checklist dijera
 * «re-corre X» sobre un Caso fantasma. Se contrasta contra el árbol canónico
 * (`vendor/` + `casos/`), como `verificar-casos` contrasta las anclas.
 */
describe("la lista de hechos del repo se contrasta con el árbol canónico", () => {
  it("cada hecho nombra un Skill, una sección y un Caso, y dice qué se comprueba", () => {
    expect(AFIRMACIONES_DEL_REPO.length).toBeGreaterThan(0);
    for (const a of AFIRMACIONES_DEL_REPO) {
      expect(a.skill).toMatch(/^desy-[a-z-]+$/);
      expect(a.seccion.trim().length).toBeGreaterThan(0);
      expect(a.caso).toMatch(/^[a-z-]+\/[a-z0-9-]+$/);
      expect(a.contiene !== undefined || a.ausente !== undefined).toBe(true);
      expect(a.resumen.length).toBeGreaterThan(0);
    }
  });

  it("cada sección citada existe en el SKILL.md de su Skill", () => {
    const leer = lectorDeSkillMd(VENDOR_SKILLS_DIR);
    for (const a of AFIRMACIONES_DEL_REPO) {
      const md = leer(a.skill);
      expect(md, `falta ${a.skill}/SKILL.md`).toBeDefined();
      expect(titulosDeSkill(md!).has(a.seccion), `«${a.seccion}» no está en ${a.skill}`).toBe(
        true,
      );
      // El **texto** se contrasta con un fixture, no con `vendor/`: con el árbol
      // real, cada mejora legítima de un Skill haría rojo `npm test`, que es justo
      // lo que el ticket 08 dice que (b) no debe ser. El fixture prueba la regla;
      // el árbol sólo prueba que la sección citada existe.
      const cuerpo =
        a.contiene !== undefined
          ? `Esto dice: ${a.contiene}\n`
          : "Otra cosa cualquiera.\n";
      const fixture = `## ${a.seccion}\n\n${cuerpo}`;
      expect(evaluarAfirmacion(a.skill, fixture, a).estado).toBe("vigente");
    }
  });

  it("cada Caso citado existe en casos/, es del Skill que el hecho declara y tiene ese Skill", () => {
    for (const a of AFIRMACIONES_DEL_REPO) {
      const [skill, id] = a.caso!.split("/") as [string, string];
      const carpeta = carpetaDe(skill, id);
      expect(carpeta, `no existe el Caso ${a.caso}`).toBeDefined();
      expect(cargarCaso(carpeta!).skill).toBe(skill);
    }
  });

  it("incluye los tres hechos que el ticket nombra por su nombre", () => {
    const claves = AFIRMACIONES_DEL_REPO.map(
      (a) => `${a.skill}:${a.contiene ?? a.ausente}`,
    );
    expect(claves).toContain("desy-styles-reference:`gap-base`");
    expect(claves).toContain("desy-implement-layout-patterns:gap-x-4");
    expect(claves).toContain("desy-implement-component:página de prueba");
  });
});

/** La carpeta de un Caso en `casos/<skill>/<tipo>/<id>`, buscando su tipo. */
function carpetaDe(skill: string, id: string): string | undefined {
  for (const tipo of ["componente", "pagina", "decision"]) {
    const candidata = join(CASOS_DIR, skill, tipo, id);
    try {
      // Basta con que el Caso cargue: el tipo lo pone la carpeta, y aquí lo que
      // se afirma es que existe y es del Skill que el hecho declara.
      cargarCaso(candidata);
      return candidata;
    } catch {
      continue;
    }
  }
  return undefined;
}

// --- (a) replay del grader --------------------------------------------------

const GUARD_MACRO = {
  id: "usa-macro-boton",
  severity: "guard" as const,
  weight: 0,
  passed: true,
  assert: { kind: "macro_presente" as const, macro: "componentButton" },
};

const QUALITY_TEXTO = {
  id: "dice-enviar",
  severity: "quality" as const,
  weight: 2,
  passed: true,
  assert: { kind: "contiene_texto" as const, texto: "Enviar" },
};

/** Una Ejecución guardada con la forma mínima que el replay lee. */
function ejecucion(parcial: Partial<ResultadoEjecucion> = {}): ResultadoEjecucion {
  return {
    skill: "implement-component",
    caso: "boton-primario",
    tipo: "caso-componente",
    pin: "abc123",
    fecha: "20261101",
    grade: "EXCELENTE",
    detalle: [GUARD_MACRO, QUALITY_TEXTO],
    flujoObservado: ["implement-component"],
    artefactos: {
      "src/boton.html": '{{ componentButton({ "text": "Enviar" }) }}',
    },
    entrega: "con-artefacto",
    flujoAlcanzoSkill: true,
    exitCode: 0,
    ultimoPasoDelFlujo: "implement-component",
    arbolHash: "hash",
    salida: { stdout: "", stderr: "" },
    ...parcial,
  };
}

describe("(a) replay: la Evidencia guardada vuelve a dar su Grade", () => {
  // El replay re-gradua con los Checks del **Caso**, no con los de la Ejecución:
  // la Ejecución no guarda el peso (`DetalleCheck` no lo persiste) y el Grade de
  // calidad se calcula con él. Estos dos Checks son los del Caso del disco.
  const DEL_CASO = { checks: [GUARD_MACRO, QUALITY_TEXTO] as Check[] };

  it("reproduce cuando nada cambió, y declara que los Checks salen del Caso", () => {
    const r = replayDeEjecucion(ejecucion(), "evidencia/1.json", DEL_CASO);
    expect(r.estado).toBe("reproduce");
    expect(r.gradeActual).toBe("EXCELENTE");
    expect(r.origenChecks).toBe("desde-el-caso");
    expect(r.checksQueCambian).toEqual([]);
  });

  it("DERIVA cuando el grader de hoy puntúa distinto lo mismo, y nombra el Check", () => {
    // La Evidencia no contiene el macro: hoy el guard cae. Guardarla como
    // EXCELENTE es la deriva que el replay tiene que cazar.
    const r = replayDeEjecucion(
      ejecucion({ artefactos: { "src/boton.html": "<button>Enviar</button>" } }),
      "evidencia/1.json",
      DEL_CASO,
    );
    expect(r.estado).toBe("deriva");
    expect(r.gradeGuardado).toBe("EXCELENTE");
    expect(r.gradeActual).toBe("INACEPTABLE");
    expect(r.checksQueCambian).toEqual([
      { id: "usa-macro-boton", guardado: true, actual: false },
    ]);
    expect(renderLineaDeReplay(r)).toContain("DERIVA");
    expect(renderLineaDeReplay(r)).toContain("usa-macro-boton ✓ → ✗");
  });

  it("deriva también un Grade de calidad que baja, no sólo un guard", () => {
    // Sin la palabra «Enviar» la Quality cae: ACEPTABLE hoy, guardado EXCELENTE.
    const sinTexto = ejecucion({
      artefactos: { "src/boton.html": '{{ componentButton({ "text": "Otra" }) }}' },
    });
    const r = replayDeEjecucion(sinTexto, "e.json", DEL_CASO);
    expect(r.gradeActual).toBe("ACEPTABLE");
    expect(r.estado).toBe("deriva");
    expect(r.checksQueCambian).toEqual([
      { id: "dice-enviar", guardado: true, actual: false },
    ]);
  });

  it("no deriva por un peso que la Ejecución no guarda: los pesos son los del Caso (bug cazado en la revisión)", () => {
    // Un Caso con pesos muy distintos: la Quality pesa 5 y falla, la otra pesa 1
    // y pasa -> ratio 1/6 -> ACEPTABLE. Con todos los pesos forzados a 1 (lo que
    // hacía el primer replay) el ratio sería 1/2 -> ACEPTABLE también, pero con
    // 1 y 5 al revés el Grade cambia de BUENO a ACEPTABLE: aquí se fija que el
    // peso lo pone el Caso, no un 1 inventado.
    const pesada = { id: "pesada", severity: "quality" as const, weight: 1, passed: false,
      assert: { kind: "contiene_texto" as const, texto: "NO ESTA" } };
    const ligera = { id: "ligera", severity: "quality" as const, weight: 2, passed: true,
      assert: { kind: "contiene_texto" as const, texto: "Enviar" } };
    const checks = [pesada, ligera].map(({ passed: _p, ...c }) => c);
    const e = ejecucion({
      grade: "BUENO",
      detalle: [pesada, ligera],
      artefactos: { "src/x.html": "<p>Enviar</p>" },
    });
    const r = replayDeEjecucion(e, "e.json", { checks });
    expect(r.gradeActual).toBe("BUENO");
    expect(r.estado).toBe("reproduce");
  });

  it("respeta el Framework del tipo: los guards base del Caso-página cuentan aunque la Ejecución no los traiga", () => {
    const pagina = ejecucion({
      tipo: "caso-pagina",
      artefactos: { "dist/pagina.html": "<html><body><p>sin h1</p></body></html>" },
    });
    const r = replayDeEjecucion(pagina, "e.json", DEL_CASO);
    expect(r.estado).toBe("deriva");
    expect(r.gradeActual).toBe("INACEPTABLE");

    // Control positivo: el artefacto completo (h1, skip-link y los tres hechos de
    // fidelidad, con el Gold del Caso) reproduce su Grade.
    const complete = {
      "dist/pagina.html":
        '<html><body><a class="skip-link" href="#main">Saltar</a>' +
        '<main class="container mx-auto"><h1 class="c-h1">Hola</h1>' +
        '<div class="grid lg:grid-cols-4 gap-x-4"><p>Enviar</p></div></main></body></html>',
    };
    const gold =
      '<html><body><main class="container mx-auto"><h1 class="c-h1">Gold</h1>' +
      '<div class="grid lg:grid-cols-4 gap-x-4"></div></main></body></html>';
    const conGold = ejecucion({
      tipo: "caso-pagina",
      grade: "EXCELENTE",
      detalle: [QUALITY_TEXTO],
      artefactos: complete,
    });
    expect(
      replayDeEjecucion(conGold, "e.json", { checks: [QUALITY_TEXTO], gold }).estado,
    ).toBe("reproduce");
  });

  it("respeta el Gold del Caso en los guards de fidelidad: sin él ningún guard reproduce", () => {
    const fidelidad = {
      id: "fidelidad-container",
      severity: "guard" as const,
      weight: 0,
      passed: true,
      assert: { kind: "fidelidad_estructural" as const, hecho: "container" as const },
    };
    const evidencia = ejecucion({
      tipo: "caso-pagina",
      grade: "INACEPTABLE",
      detalle: [fidelidad],
      artefactos: {
        "dist/pagina.html":
          '<html><body><a class="skip-link" href="#main">Saltar</a>' +
          '<main class="container mx-auto"><h1 class="c-h1">Hola</h1>' +
          '<div class="grid lg:grid-cols-4 gap-x-4"></div></main></body></html>',
      },
    });
    // Sin Gold no hay contra qué comparar: los guards de fidelidad del Framework
    // caen y el INACEPTABLE guardado se reproduce. Con el Gold, reproducen y el
    // mismo INACEPTABLE deriva.
    expect(replayDeEjecucion(evidencia, "e.json", { checks: [fidelidad] }).estado).toBe(
      "reproduce",
    );
    const gold =
      '<html><body><main class="container mx-auto"><h1 class="c-h1">Gold</h1>' +
      '<div class="grid lg:grid-cols-4 gap-x-4"></div></main></body></html>';
    expect(
      replayDeEjecucion(evidencia, "e.json", { checks: [fidelidad], gold }).estado,
    ).toBe("deriva");
  });

  it("sin el Caso en disco es un error explícito: no hay con qué re-graduar, ni siquiera con los `assert` de la Ejecución", () => {
    expect(() => replayDeEjecucion(ejecucion(), "reports/x/1.json", undefined)).toThrow(
      /implement-component\/boton-primario/,
    );
  });

  it("declara los campos que una Ejecución vieja no trae (exitCode, arbolHash), sin fallar por ello", () => {
    expect(camposQueFaltan(ejecucion())).toEqual([]);
    const { exitCode: _exit, arbolHash: _hash, ...vieja } = ejecucion();
    expect(camposQueFaltan(vieja)).toEqual(["exitCode", "arbolHash"]);
    const r = replayDeEjecucion(vieja as ResultadoEjecucion, "e.json", DEL_CASO);
    expect(r.faltanCampos).toEqual(["exitCode", "arbolHash"]);
    expect(r.estado).toBe("reproduce");
  });

  it("replayDeEjecuciones junta varias y `derivas` devuelve sólo las que cambian", () => {
    const buena = { origen: "a.json", ejecucion: ejecucion() };
    const mala = {
      origen: "b.json",
      ejecucion: ejecucion({ artefactos: { "src/boton.html": "<br>" } }),
    };
    const resultados = replayDeEjecuciones([buena, mala], () => DEL_CASO);
    expect(resultados.map((r) => r.origen)).toEqual(["a.json", "b.json"]);
    expect(derivas(resultados).map((r) => r.origen)).toEqual(["b.json"]);
  });
});
