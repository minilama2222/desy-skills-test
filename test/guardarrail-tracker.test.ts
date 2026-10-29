import { describe, expect, it } from "vitest";
import { problemasDelTracker } from "../src/guardarrail-tracker.js";

const ticket = (path: string, status: string, cuerpo = ""): { path: string; contenido: string } => ({
  path,
  contenido: `# T\n\n**Status:** ${status}\n\n${cuerpo}\n`,
});

describe("problemasDelTracker", () => {
  it("no marca un ticket `done` con todas las casillas hechas", () => {
    const tickets = [
      ticket("01.md", "done", "- [x] uno\n- [x] dos"),
    ];
    expect(problemasDelTracker(tickets)).toEqual([]);
  });

  it("marca un ticket `done` con una casilla sin marcar", () => {
    // El caso real: el 15 estaba `done` con una casilla que dependía del ticket 12.
    const tickets = [
      ticket("15.md", "done", "- [x] uno\n- [ ] depende del 12"),
    ];
    const hallazgos = problemasDelTracker(tickets);
    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("15.md");
    expect(hallazgos[0]).toContain("ready-for-human");
  });

  it("no marca los estados no-`done`, aunque tengan casillas abiertas", () => {
    const tickets = [
      ticket("08.md", "ready-for-human", "- [x] uno\n- [ ] depende del 12"),
      ticket("09.md", "ready-for-agent", "- [ ] uno\n- [ ] dos"),
    ];
    expect(problemasDelTracker(tickets)).toEqual([]);
  });

  it("marca cada ticket infractor, no solo el primero", () => {
    const tickets = [
      ticket("a.md", "done", "- [ ] x"),
      ticket("b.md", "done", "- [ ] y"),
    ];
    expect(problemasDelTracker(tickets)).toHaveLength(2);
  });

  it("ignora las casillas que no están al principio de línea (texto, código)", () => {
    // Una casilla citada dentro de un párrafo o un bloque de código no cuenta: el
    // tracker escribe las casillas como listas al margen.
    const tickets = [
      ticket("c.md", "done", "El criterio era `- [ ] algo`.\n- [x] hecho"),
    ];
    expect(problemasDelTracker(tickets)).toEqual([]);
  });

  it("marca un ticket construido que sigue en un estado de triage, sin declarar por qué", () => {
    // El caso real del retro del ticket 07: el 05 estaba `ready-for-human` con
    // todas sus casillas hechas y ya commiteado. El estado mentía en la otra
    // dirección que el `done` mentiroso del 15, y pasaba en verde.
    const tickets = [
      ticket("05.md", "ready-for-human", "- [x] uno\n- [x] dos"),
      ticket("03.md", "ready-for-agent", "- [x] uno"),
    ];
    const hallazgos = problemasDelTracker(tickets);

    expect(hallazgos).toHaveLength(2);
    expect(hallazgos[0]).toContain("05.md");
    expect(hallazgos[1]).toContain("03.md");
    expect(hallazgos[0]).toContain("con sus 2 casilla/s ya hechas");
    expect(hallazgos[0]).toContain("declara por qué espera");
  });

  it("no marca un ticket construido que declara de qué depende", () => {
    // La segunda dirección es una inferencia; la excepción tiene que ser una
    // decisión escrita, no una casilla olvidada.
    const tickets = [
      ticket(
        "05.md",
        "ready-for-human",
        "**Status depende de:** que un humano acepte el modo local\n\n- [x] uno\n- [x] dos",
      ),
    ];
    expect(problemasDelTracker(tickets)).toEqual([]);
    // Control positivo: el mismo ticket sin la declaración **sí** se marca, así
    // que el verde de arriba mide la excepción y no la regla desactivada.
    const sinDeclarar = tickets.map((t) => ({
      ...t,
      contenido: t.contenido.replace("**Status depende de:**", "Espera:"),
    }));
    expect(problemasDelTracker(sinDeclarar)).toHaveLength(1);
  });

  it("declarar `Status depende de` no excusa un `done` con casillas abiertas", () => {
    // La excepción es para lo construido; un `done` que no está entero sigue
    // siendo un mentiroso aunque explique cuánto le falta.
    const tickets = [
      ticket("15.md", "done", "**Status depende de:** el 12\n\n- [x] uno\n- [ ] dos"),
    ];
    const hallazgos = problemasDelTracker(tickets);

    expect(hallazgos).toHaveLength(1);
    expect(hallazgos[0]).toContain("1 casilla/s sin marcar");
  });

  it("no lee el `Status` de un ticket citado en el cuerpo", () => {
    // Un ticket que cita otro (`**Status:** done` en prosa) no puede pasar por
    // estar en ese estado: la cabecera manda.
    const tickets = [
      {
        path: "cita.md",
        contenido: "# C\n\n**Status:** ready-for-human\n\n## Notas\n\n**Status:** done\n",
      },
    ];
    expect(problemasDelTracker(tickets)).toEqual([]);
  });

  it("un ticket sin casillas no se juzga en ninguna dirección", () => {
    const tickets = [
      ticket("sin.md", "ready-for-human"),
      ticket("sin2.md", "wontfix"),
    ];
    expect(problemasDelTracker(tickets)).toEqual([]);
  });
});
