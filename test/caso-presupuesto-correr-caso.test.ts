import { describe, expect, it } from "vitest";
import { correrCaso, type ProgresoDelCaso } from "../src/cli.js";
import type { Caso } from "../src/caso.js";
import type { ResultadoEjecucion } from "../src/ejecutar.js";
import type { Pin } from "../src/pin.js";
import type { CommandRunner, RunDeps, Sandbox } from "../src/runner.js";
import { agregarScorecard } from "../src/scorecard.js";

/**
 * Ticket 03 (bucle-de-refinamiento) / ADR-0014: el presupuesto por Caso es de
 * **entregas**. El bucle `correrCaso` intenta hasta tener `n` entregas o agotar
 * el tope duro (`n * 2` por defecto), lo que antes llegue.
 *
 * Se prueba en su seam: los dos dobles que el bucle ya inyecta —el sandbox y el
 * `CommandRunner`—, que son la frontera del sistema (el SUT es un proceso
 * externo). El guion del `CommandRunner` decide qué entrega cada intento; el
 * camino que recorre (sandbox, copia, transcript, grader, entrega) es el real,
 * así que el veredicto se lee del scorecard que el adaptador genera con las
 * Ejecuciones devueltas, no de un campo interno del bucle.
 *
 * No hay proceso real: no hace falta presupuesto de tiempo (la caja 5 del
 * ticket es condicional).
 */

const pin: Pin = {
  ref: "main",
  commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-29",
  repo: "https://github.com/minilama2222/desy-skills",
};

const caso: Caso = {
  skill: "implement-component",
  id: "boton-primario",
  tipo: "caso-componente",
  prompt: "Genera un botón primario con texto 'Enviar'",
  checks: [
    {
      id: "usa-macro-boton",
      severity: "guard",
      weight: 0,
      assert: { kind: "macro_presente", macro: "componentButton" },
    },
  ],
};

/** El Artefacto correcto: pasa el guard y da EXCELENTE. */
const BUENO = '{{ componentButton({ "text": "Enviar", "classes": "c-button--primary" }) }}';

/** Invocaciones del SUT por stderr, como las imprime `opencode run`. */
const FLUJO = '\u2192 Skill "desy-preflight-check"\n\u2192 Skill "desy-implement-component"\n';

/** La misma corrida sin invocar el skill del Caso: sólo el preflight. */
const FLUJO_SIN_SKILL = '\u2192 Skill "desy-preflight-check"\n';

type Entrega = "bueno" | "malo" | "nada" | "crash" | "sin-skill";

/** Qué escribe y con qué exit code el SUT en cada clase de intento. */
const DIBUJOS: Record<Entrega, { artefacto: string | undefined; code: number }> = {
  bueno: { artefacto: BUENO, code: 0 },
  malo: { artefacto: "<button>Enviar</button>", code: 0 },
  nada: { artefacto: undefined, code: 0 },
  crash: { artefacto: undefined, code: 1 },
  // La corrida del 27/10: escribe un Artefacto **sin invocar** el skill. Es el
  // hallazgo de trigger (ticket 07), no una entrega que el Caso pueda contar.
  "sin-skill": { artefacto: BUENO, code: 0 },
};

/**
 * Un SUT falso: recibe la entrega de cada intento por índice y deja constancia de
 * cuántas veces se le llamó — esa cuenta **es** los intentos hechos.
 *
 * El contrato con el bucle, en orden dentro de cada intento: `create()` (el
 * sandbox nace vacío) → `run()` (el SUT escribe) → `listArtefactos()` (lo que se
 * entrega es lo de este intento). El sandbox de cada intento sólo ve el espacio
 * que su propio `run` rellenó: si leyera el estado global, todos los intentos
 * entregarían y el test mediría el tope, no el presupuesto.
 */
function guion(entregas: Entrega[]): { deps: RunDeps; intentos: () => number } {
  const dibujoDe = (i: number) => DIBUJOS[entregas[i] ?? "nada"]!;
  let hecho = 0;
  let escrito: string | undefined;

  const command: CommandRunner = {
    run: () => {
      const clase = entregas[hecho] ?? "nada";
      escrito = dibujoDe(hecho).artefacto;
      hecho += 1;
      // `sin-skill` escribe el Artefacto pero el Flujo se queda en el preflight.
      return {
        stdout: "",
        stderr: clase === "sin-skill" ? FLUJO_SIN_SKILL : FLUJO,
        code: dibujoDe(hecho - 1).code,
      };
    },
  };

  const sandbox = (): Sandbox => ({
    workDir: "C:/sandbox/work",
    home: "C:/sandbox/home",
    configDir: "C:/sandbox/home/.config/opencode",
    skillsDir: "C:/sandbox/skills",
    copySkills: () => {},
    configurar: () => {},
    listArtefactos: () => (escrito === undefined ? [] : [{ path: "boton.html", contenido: escrito }]),
    cleanup: () => {},
  });

  return {
    deps: {
      sandbox: {
        create: () => {
          escrito = undefined;
          return sandbox();
        },
      },
      command,
    },
    intentos: () => hecho,
  };
}

/** Los intentos que hizo el bucle: una Ejecución por intento. */
const intentosHechos = (resultados: ResultadoEjecucion[]): number => resultados.length;

const veredictoDe = (resultados: ResultadoEjecucion[]) =>
  agregarScorecard(resultados, pin).skills[0]!.casos[0]!;

describe("correrCaso: presupuesto de entregas con tope duro (ADR-0014)", () => {
  it("entrega a la primera: con 1 entrega pedida, para en el primer intento", async () => {
    // El camino rápido del bucle (`run` sin `--n`): una entrega basta y no se
    // reintenta. La distinción entregas/intentos la fija el test siguiente.
    const { deps, intentos } = guion(["bueno", "nada", "nada"]);

    const resultados = await correrCaso(caso, pin, { n: 1, deps });

    expect(intentosHechos(resultados)).toBe(1);
    expect(intentos()).toBe(1);
    expect(veredictoDe(resultados).entregas).toBe(1);

    // El sandbox del intento se listó después de correr: lo que se entrega es lo
    // que el SUT escribió en ese intento, no lo del anterior.
    const primero = resultados[0]!;
    expect(primero.entrega).toBe("con-artefacto");
    expect(primero.artefactos).toEqual({ "boton.html": BUENO });
  });

  it("con n=2, para al tener 2 entregas aunque al tope le quede margen", async () => {
    // Dos entregas seguidas y el tope (4) con intentos de sobra: paran las
    // entregas, no el tope. Un bucle de intentos haría los 4.
    const { deps, intentos } = guion(["bueno", "bueno", "nada", "nada"]);

    const resultados = await correrCaso(caso, pin, { n: 2, deps });

    expect(intentosHechos(resultados)).toBe(2);
    expect(intentos()).toBe(2);
    expect(veredictoDe(resultados)).toMatchObject({ entregas: 2, veredicto: "PASA" });
  });

  it("entrega a la tercera: dos intentos sin Artefacto son intentos, no entregas", async () => {
    // El caso real del 27/10: la entrega llega tarde. Con n=3 se acaba a la
    // tercera entrega, en el quinto intento como mucho (tope 6).
    const { deps, intentos } = guion(["nada", "nada", "bueno", "bueno", "bueno", "nada"]);

    const resultados = await correrCaso(caso, pin, { n: 3, deps });

    // 5 intentos: la segunda entrega no cierra el presupuesto de 3...
    expect(intentosHechos(resultados)).toBe(5);
    expect(intentos()).toBe(5);
    expect(veredictoDe(resultados)).toMatchObject({
      entregas: 3,
      intentos: 5,
      veredicto: "PASA",
    });
  });

  it("nunca entrega y topa: para en n*2 intentos y el veredicto es INDETERMINADO", async () => {
    const { deps, intentos } = guion(["nada", "nada", "nada", "nada", "nada", "nada", "bueno"]);

    const resultados = await correrCaso(caso, pin, { n: 3, deps });

    // El tope por defecto de n=3 es 6: el séptimo intento (que sí entregaría) no
    // se hace, porque el séptimo ya está fuera del presupuesto.
    expect(intentosHechos(resultados)).toBe(6);
    expect(intentos()).toBe(6);

    const casoScorecard = veredictoDe(resultados);
    expect(casoScorecard).toMatchObject({
      entregas: 0,
      intentos: 6,
      veredicto: "INDETERMINADO",
    });
  });

  it("topa también con crashes: un SUT que no arranca consume intento y no condena", async () => {
    const { deps, intentos } = guion(["crash", "crash", "crash", "crash", "crash", "crash", "crash"]);

    const resultados = await correrCaso(caso, pin, { n: 3, deps });

    expect(intentosHechos(resultados)).toBe(6);
    expect(intentos()).toBe(6);
    expect(resultados.map((r) => r.exitCode)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(veredictoDe(resultados).veredicto).toBe("INDETERMINADO");
  });

  it("una entrega sin invocar el skill no cierra el presupuesto", async () => {
    // Una sola entrega pedida (n=1). El primer intento escribe un Artefacto
    // **sin invocar** `implement-component`: no mide el skill, así que no puede
    // cerrar el presupuesto. Si contara, el bucle pararía ahí con un Caso que no
    // se ha medido ni una vez — el falso verde que el ticket 03 tiene que impedir.
    const { deps, intentos } = guion(["sin-skill", "bueno", "bueno"]);

    const resultados = await correrCaso(caso, pin, { n: 1, deps });

    // 2 intentos: el primero es trigger y no cuenta; el segundo sí y cierra el
    // presupuesto de una entrega (con el criterio viejo habría parado en 1).
    expect(intentosHechos(resultados)).toBe(2);
    expect(intentos()).toBe(2);
    expect(veredictoDe(resultados)).toMatchObject({
      entregas: 1,
      intentos: 2,
      hallazgosConArtefacto: 1,
      veredicto: "PASA",
    });
    // Control positivo: la entrega de trigger existe, se cuenta como hallazgo y
    // no se pierde del registro.
    expect(resultados.filter((r) => !r.flujoAlcanzoSkill)).toHaveLength(1);
  });

  it("un tope explícito manda sobre el defecto", async () => {
    const { deps, intentos } = guion(["nada", "nada", "nada", "nada", "nada"]);

    const resultados = await correrCaso(caso, pin, { n: 2, tope: 3, deps });

    expect(intentosHechos(resultados)).toBe(3);
    expect(intentos()).toBe(3);
  });

  it("avisa antes de cada intento y guarda cada Ejecución en cuanto termina", async () => {
    // El adaptador de la suite guarda y anuncia intento a intento: una suite
    // cortada a mitad conserva lo medido (ticket 07). Con presupuesto de entregas
    // el número anunciado ya no es «i/N intentos»: N son entregas.
    const { deps } = guion(["nada", "bueno", "bueno", "bueno"]);
    const anunciados: ProgresoDelCaso[] = [];
    const guardados: number[] = [];

    await correrCaso(caso, pin, {
      n: 2,
      deps,
      anunciar: (estado) => anunciados.push(estado),
      alGuardar: () => guardados.push(guardados.length + 1),
    });

    // El primer intento no entrega: se anuncia un tercero. Al segundo llega una
    // entrega y se anuncia el otro que falta; al tercero se completa el
    // presupuesto y no hay cuarto.
    expect(anunciados.map((a) => a.intento)).toEqual([1, 2, 3]);
    expect(anunciados.map((a) => a.faltan)).toEqual([2, 2, 1]);
    expect(anunciados.every((a) => a.tope === 4)).toBe(true);
    expect(guardados).toEqual([1, 2, 3]);
  });
});
