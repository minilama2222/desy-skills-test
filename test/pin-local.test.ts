import { describe, expect, it } from "vitest";
import type { Pin } from "../src/pin.js";
import { esPinLocal, LOCAL, pinLocal, pinSinRuta, rutaEnElRepo } from "../src/pin.js";
import {
  PIN_LOCAL_DECLARADO,
  agregarScorecard,
  etiquetaDelPin,
  renderScorecard,
} from "../src/scorecard.js";
import type { ResultadoEjecucion } from "../src/ejecutar.js";

/**
 * Ticket 05 (bucle-de-refinamiento): un checkout local declarado.
 *
 * La regla del ticket es una sola y en negativo: **con un checkout local no se
 * puede producir un scorecard que declare un commit**. Se prueba en los dos
 * sitios donde se lee —el JSON y el H1 del Markdown— y en la raíz de ambos: el
 * Pin local no lleva SHA, así que cualquier consumidor que lo enseñe está
 * enseñando `local`.
 */

const remoto: Pin = {
  ref: "main",
  commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-20",
  repo: "https://github.com/minilama2222/desy-skills",
};

const local = pinLocal("C:/repos-mios/desy-skills", "2026-10-29");

const ejecucion = (over: Partial<ResultadoEjecucion> = {}): ResultadoEjecucion => ({
  skill: "implement-component",
  caso: "boton-primario",
  tipo: "caso-componente",
  pin: remoto.commit,
  fecha: remoto.fecha,
  grade: "EXCELENTE",
  detalle: [],
  flujoObservado: ["preflight-check", "implement-component"],
  artefactos: { "src/boton.html": "{{ componentButton() }}" },
  entrega: "con-artefacto",
  flujoAlcanzoSkill: true,
  exitCode: 0,
  ultimoPasoDelFlujo: "implement-component",
  arbolHash: "hash-de-fixture",
  salida: { stdout: "", stderr: "" },
  ...over,
});

describe("el Pin de un checkout local", () => {
  it("declara `local` en el commit, que no es un SHA", () => {
    expect(local.commit).toBe("local");
    expect(local.commit).not.toMatch(/^[0-9a-f]{7,40}$/i);
  });

  it("es un Pin local; uno remoto no lo es", () => {
    expect(esPinLocal(local)).toBe(true);
    expect(esPinLocal(remoto)).toBe(false);
  });

  it("`pinSinRuta` le quita la marca `local` —eso es lo que hace que se versionara— y deja el commit", () => {
    // Quien mira el JSON versionado se guía por `commit: "local"`, no por la
    // marca: la marca existe para el Pin en memoria, que sí lleva la ruta.
    expect(esPinLocal(pinSinRuta(local))).toBe(false);
    expect(pinSinRuta(local).commit).toBe(LOCAL);
  });

  it("guarda de dónde se copiaron los skills, para que el informe lo diga", () => {
    expect(local.repo).toBe("C:/repos-mios/desy-skills");
  });
});

describe("pinSinRuta: lo que se versiona no lleva la ruta de la máquina", () => {
  it("a un Pin local le quita la ruta y le deja el hecho `local (sin commit)`", () => {
    const sinRuta = pinSinRuta(local);

    expect(sinRuta).toEqual({ ref: "local", commit: LOCAL, fecha: "2026-10-29" });
    expect(JSON.stringify(sinRuta)).not.toContain("repos-mios");
    // Lo que se versiona no puede contener la marca `local`: si la llevara, el
    // schema estático de un scorecard de versión admitiría dos formas.
    expect(sinRuta).not.toHaveProperty("local");
  });

  it("a un Pin remoto no le toca nada: conserva el SHA y el repo", () => {
    expect(pinSinRuta(remoto)).toEqual(remoto);
  });

  it("la ruta del informe es relativa al repo y con `/`, para que no filtre el usuario", () => {
    expect(
      rutaEnElRepo("C:/Users/jmcuadra/sda/desy-skills-test", "C:/Users/jmcuadra/sda/desy-skills"),
    ).toBe("../desy-skills");

    expect(
      rutaEnElRepo("C:/Users/jmcuadra/sda/desy-skills-test", "C:/Users/jmcuadra/sda/desy-skills-test/.local-skills"),
    ).toBe(".local-skills");
  });
});

describe("el scorecard declara el Pin: commit para el remoto, `local (sin commit)` para el local", () => {
  it("con un Pin remoto, el commit declarado es el SHA", () => {
    const scorecard = agregarScorecard([ejecucion()], remoto, "hash-de-fixture");

    expect(scorecard.pin.commit).toBe(remoto.commit);
    expect(scorecard.pin.repo).toBe(remoto.repo);
  });

  it("con un Pin local, el JSON NO declara ningún commit", () => {
    const scorecard = agregarScorecard([ejecucion({ pin: "local" })], local, "hash-de-fixture");

    expect(scorecard.pin.commit).toBe("local");
    // La regla del ticket, al pie de la letra: no puede haber un SHA ahí.
    expect(scorecard.pin.commit).not.toMatch(/^[0-9a-f]{7,40}$/i);
    // Y todo el JSON, mirado de una vez: ningún campo declara un commit de git.
    expect(JSON.stringify(scorecard)).not.toMatch(/[0-9a-f]{7,40}/i);
  });

  it("el scorecard de la corrida dice de qué checkout local salieron los skills", () => {
    const scorecard = agregarScorecard([ejecucion({ pin: "local" })], local);

    expect(scorecard.pin.repo).toBe("C:/repos-mios/desy-skills");
    expect(scorecard.pin.commit).toBe("local");
  });

  it("el H1 del Markdown dice `local (sin commit)`, no un SHA", () => {
    const markdown = renderScorecard(agregarScorecard([ejecucion({ pin: "local" })], local));

    expect(markdown.split("\n")[0]).toBe(`# Scorecard — Pin ${PIN_LOCAL_DECLARADO} (2026-10-29)`);
    expect(markdown.split("\n")[0]).not.toMatch(/\b[0-9a-f]{7,40}\b/);
  });

  it("el H1 del Markdown con un Pin remoto sigue siendo el commit", () => {
    const markdown = renderScorecard(agregarScorecard([ejecucion()], remoto));

    expect(markdown.split("\n")[0]).toBe(`# Scorecard — Pin ${remoto.commit} (2026-10-20)`);
  });

  it("etiquetaDelPin distingue los dos casos: SHA remoto → commit, `local` → `local (sin commit)`", () => {
    expect(etiquetaDelPin(pinSinRuta(remoto))).toBe(remoto.commit);
    // Es el scorecard **de la corrida**: el que lee el humano y el que la CLI
    // anuncia por stderr. Ahí no puede aparecer un SHA.
    expect(etiquetaDelPin(agregarScorecard([ejecucion()], local).pin)).toBe(PIN_LOCAL_DECLARADO);
  });

  it("`local` en el commit basta: aunque el pin versionado no lleve la marca, se lee como local", () => {
    expect(etiquetaDelPin(pinSinRuta(local))).toBe(PIN_LOCAL_DECLARADO);
  });

  it("un scorecard sin hash declarado no inventa la línea del árbol", () => {
    // La ausencia de hash es información (una suite anterior al ticket 04): que
    // parezca una identidad sería peor que no decirla.
    const markdown = renderScorecard(agregarScorecard([ejecucion()], remoto));

    expect(markdown).not.toContain("Árbol");
    expect(agregarScorecard([ejecucion()], remoto)).not.toHaveProperty("arbolHash");
  });
});
