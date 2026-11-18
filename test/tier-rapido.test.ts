import { describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import { esCasoPagina } from "../src/caso.js";
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

  it("hoy el árbol vendido deja la checklist en verde (una sección renombrada la pondría roja)", () => {
    // Es el hecho de guardarraíl de la lista: si un Skill de `vendor/` se mueve
    // bajo un hecho —una sección que se renombra, un texto que se va— esto se
    // pone rojo y nombra el Caso a re-correr. Es una afirmación sobre el estado
    // de hoy, a propósito: la deriva de un Skill la presenta la checklist, y aquí
    // se fija que el árbol versionado sigue donde los Casos lo esperan.
    const r = checklist(AFIRMACIONES_DEL_REPO, lectorDeSkillMd(VENDOR_SKILLS_DIR));
    expect(r.cambiadas).toEqual([]);
    expect(r.queReCorrer).toEqual([]);
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
      const caso = cargarCaso(candidata);
      if (esCasoPagina(caso) || !esCasoPagina(caso)) return candidata;
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
  it("reproduce cuando nada cambió, con los Checks de la Ejecución", () => {
    const r = replayDeEjecucion(ejecucion(), "evidencia/1.json", undefined);
    expect(r.estado).toBe("reproduce");
    expect(r.gradeActual).toBe("EXCELENTE");
    expect(r.origenChecks).toBe("desde-la-ejecucion");
    expect(r.checksQueCambian).toEqual([]);
  });

  it("DERIVA cuando el grader de hoy puntúa distinto lo mismo, y nombra el Check", () => {
    // La Evidencia no contiene el macro: hoy el guard cae. Guardarla como
    // EXCELENTE es la deriva que el replay tiene que cazar.
    const r = replayDeEjecucion(
      ejecucion({ artefactos: { "src/boton.html": "<button>Enviar</button>" } }),
      "evidencia/1.json",
      undefined,
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
    const r = replayDeEjecucion(sinTexto, "e.json", undefined);
    expect(r.gradeActual).toBe("ACEPTABLE");
    expect(r.estado).toBe("deriva");
    expect(r.checksQueCambian).toEqual([
      { id: "dice-enviar", guardado: true, actual: false },
    ]);
  });

  it("respeta el Framework del tipo: los guards base del Caso-página cuentan aunque la Ejecución no los traiga", () => {
    // La Ejecución se graduó como Caso-componente (no lleva los guards del
    // Framework del Caso-página en `detalle`). La misma Evidencia, sin h1 ni
    // skip-link ni fidelidad, suspende hoy por esos guards: es deriva.
    const pagina = ejecucion({
      tipo: "caso-pagina",
      artefactos: { "dist/pagina.html": "<html><body><p>sin h1</p></body></html>" },
    });
    const r = replayDeEjecucion(pagina, "e.json", undefined);
    expect(r.estado).toBe("deriva");
    expect(r.gradeActual).toBe("INACEPTABLE");

    // Control positivo: un artefacto que pasa los guards del Framework (un h1,
    // skip-link y los tres hechos de fidelidad, que eximen la palabra «Enviar»)
    // reproduce su Grade. Los hechos de fidelidad no tienen Gold aquí, así que el
    // artefacto los trae del Gold del Caso-página del repo; sin él, no hay guard
    // de fidelidad que pasar, y eso es justamente lo que `gold` resuelve.
    const complete = {
      "dist/pagina.html":
        '<html><body><a class="skip-link" href="#main">Saltar</a>' +
        '<main class="container mx-auto"><h1 class="c-h1">Hola</h1>' +
        '<div class="grid lg:grid-cols-4 gap-x-4"><p>Enviar</p></div></main></body></html>',
    };
    const gold =
      '<html><body><main class="container mx-auto"><h1 class="c-h1">Gold</h1>' +
      '<div class="grid lg:grid-cols-4 gap-x-4"></div></main></body></html>';
    const conGold = ejecucion({ tipo: "caso-pagina", grade: "EXCELENTE", detalle: [QUALITY_TEXTO], artefactos: complete });
    expect(replayDeEjecucion(conGold, "e.json", { checks: [QUALITY_TEXTO], gold }).estado).toBe(
      "reproduce",
    );
  });

  it("respeta el Gold del Caso en los guards de fidelidad: sin él ningún guard reproduce", () => {
    const fidelidad = {
      id: "fidelidad-container",
      severity: "guard" as const,
      weight: 0,
      passed: true,
      assert: { kind: "fidelidad_estructural" as const, hecho: "container" as const },
    };
    // El artefacto trae el `main` del container y el resto de hechos del Gold. Sin
    // el Gold no hay contra qué comparar, así que los guards de fidelidad del
    // Framework caen y un INACEPTABLE guardado se reproduce.
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
    expect(replayDeEjecucion(evidencia, "e.json", { checks: [fidelidad] }).estado).toBe(
      "reproduce",
    );

    // El adverso: con el **Gold del Caso**, el guard del container sí reproduce (y
    // los del Framework también), así que un INACEPTABLE guardado deriva.
    const gold =
      '<html><body><main class="container mx-auto"><h1 class="c-h1">Gold</h1>' +
      '<div class="grid lg:grid-cols-4 gap-x-4"></div></main></body></html>';
    expect(replayDeEjecucion(evidencia, "e.json", { checks: [fidelidad], gold }).estado).toBe(
      "deriva",
    );
  });

  it("sin `assert` en la Ejecución (anterior al ticket 06) re-gradua con el Caso y lo declara", () => {
    const vieja = ejecucion({
      detalle: [{ id: "usa-macro-boton", severity: "guard", passed: true }],
    });
    const r = replayDeEjecucion(vieja, "e.json", { checks: [GUARD_MACRO, QUALITY_TEXTO] });
    expect(r.origenChecks).toBe("desde-el-caso");
    expect(r.estado).toBe("reproduce");
  });

  it("sin Checks en ningún sitio es un error explícito, no un verde silencioso", () => {
    const vieja = ejecucion({
      detalle: [{ id: "usa-macro-boton", severity: "guard", passed: true }],
    });
    expect(() => replayDeEjecucion(vieja, "reports/x/1.json", undefined)).toThrow(
      /implement-component\/boton-primario/,
    );
  });

  it("declara los campos que una Ejecución vieja no trae (exitCode, arbolHash), sin fallar por ello", () => {
    expect(camposQueFaltan(ejecucion())).toEqual([]);
    const { exitCode: _exit, arbolHash: _hash, ...vieja } = ejecucion();
    expect(camposQueFaltan(vieja)).toEqual(["exitCode", "arbolHash"]);
    // El replay lo presenta él mismo: el adaptador no tiene que recalcularlo.
    const r = replayDeEjecucion(vieja as ResultadoEjecucion, "e.json", undefined);
    expect(r.faltanCampos).toEqual(["exitCode", "arbolHash"]);
    expect(r.estado).toBe("reproduce");
  });

  it("replayDeEjecuciones junta varias y `derivas` devuelve sólo las que cambian", () => {
    const buena = { origen: "a.json", ejecucion: ejecucion() };
    const mala = {
      origen: "b.json",
      ejecucion: ejecucion({ artefactos: { "src/boton.html": "<br>" } }),
    };
    const { resultados } = replayDeEjecuciones([buena, mala], () => undefined);
    expect(resultados.map((r) => r.origen)).toEqual(["a.json", "b.json"]);
    expect(derivas(resultados).map((r) => r.origen)).toEqual(["b.json"]);
  });
});
