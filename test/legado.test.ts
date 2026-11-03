import { describe, expect, it } from "vitest";
import {
  cabeceraDeLegado,
  descripcionDelFolio,
  esLegado,
  hechosDeLaEjecucion,
  medidaDeLegado,
  tasaDeEntrega,
} from "../src/legado.js";

/**
 * Ticket 10 (bucle de refinamiento): el **legado** —la evidencia anterior a la
 * regla del ticket 01— guardado en `reports/legado/` con la regla con la que se
 * midió escrita encima, y fuera del mecanismo de comparación.
 *
 * Este fichero fija la **cabecera**: qué dice cada fichero archivado, y qué
 * cuenta de cada Caso sin inventarse lo que el fichero no guardó. Que el diff no
 * lo lea se fija por proceso real en `test/legado-cli.test.ts`; que el archivo
 * del repo sea el de verdad, en `test/legado-archivo.test.ts`; que el script lo
 * reproduzca, en `test/archivar-legado.test.ts`.
 */

/** El Scorecard del 27/10, tal como lo dejó la corrida: la forma anterior al 03. */
const SCORECARD_V0 = {
  pin: {
    ref: "main",
    commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
    fecha: "2026-10-20",
    repo: "https://github.com/minilama2222/desy-skills",
  },
  skills: [
    {
      skill: "implement-component",
      casos: [
        {
          caso: "boton-primario",
          tipo: "caso-componente",
          veredicto: "SUSPENDE",
          // `ejecuciones` son **intentos**, y las Entregas no se guardaron: es
          // justo lo que el ticket 03 separó.
          ejecuciones: 3,
          alcanzaronSkill: 2,
          correctas: 0,
          entregoMal: 0,
          sinArtefacto: 2,
          fallos: [],
          guards: { ok: 2, total: 4 },
          gradeCalidad: "INACEPTABLE",
        },
      ],
      pasados: 0,
      suspendidos: 1,
      indeterminados: 0,
    },
  ],
};

const SCORECARD_NUEVO = {
  pin: { ref: "main", commit: "c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0", fecha: "2026-10-29" },
  skills: [
    {
      skill: "implement-component",
      casos: [
        {
          caso: "boton-primario",
          veredicto: "PASA",
          entregas: 1,
          intentos: 4,
          correctas: 1,
          entregoMal: 0,
          sinArtefacto: 3,
        },
      ],
      pasados: 1,
      suspendidos: 0,
      indeterminados: 0,
    },
  ],
};

const REGLA = {
  nombre: "ADR-0007",
  que: "El veredicto de un Caso se calcula sobre las Ejecuciones que alcanzaron el skill.",
  entregaCero: "**SUSPENDE**",
  adr: "docs/adr/0007-politica-de-n-ejecuciones.md",
};

const contexto = (over: Partial<Parameters<typeof cabeceraDeLegado>[1]> = {}) => ({
  origen: "reports/suite/scorecard.json",
  fichero: "scorecard.json",
  fecha: "2026-10-27",
  regla: REGLA,
  ...over,
});

describe("cabeceraDeLegado: la regla con la que se midió, escrita encima (ticket 10)", () => {
  it("declara de dónde sale, qué es, con qué regla se midió y qué Pin", () => {
    const cabecera = cabeceraDeLegado(SCORECARD_V0, contexto());

    expect(cabecera).toEqual({
      origen: "reports/suite/scorecard.json",
      folio: "scorecard",
      fecha: "2026-10-27",
      // «declarado», no «medido»: anterior al ticket 04 no hay hash del árbol, y
      // afirmar que se midió ese commit es la mentira que el 04 quitó.
      pin: {
        estado: "declarado",
        ref: "main",
        commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
        fecha: "2026-10-20",
      },
      regla: REGLA,
    });
    expect(esLegado(cabecera)).toBe(true);
  });

  it("la cabecera no lleva la ruta del repo del Pin (un Pin local lleva la de nadie)", () => {
    // `repo` es la ruta del checkout del mantenedor en un Pin local (ADR-0015):
    // lo versionado no la lleva, igual que en el Scorecard de versión.
    expect(JSON.stringify(cabeceraDeLegado(SCORECARD_V0, contexto()))).not.toContain("github.com");
  });

  it("un fichero sin regla declarada no es legado: no se puede decir con qué se midió", () => {
    const cabecera = cabeceraDeLegado(SCORECARD_V0, {
      origen: "reports/suite/scorecard.json",
      fichero: "scorecard.json",
      fecha: "2026-10-27",
    });

    expect(cabecera.regla).toBeUndefined();
    expect(esLegado(cabecera)).toBe(false);
  });

  it("sin Pin lo dice, en vez de dejar el hueco vacío", () => {
    const cabecera = cabeceraDeLegado([{ ejecucion: 1 }], {
      origen: "reports/estabilidad-v2/resumen.json",
      fichero: "resumen.json",
      fecha: "2026-10-22",
      regla: REGLA,
    });

    expect(cabecera.folio).toBe("resumen");
    expect(cabecera.pin).toEqual({ estado: "desconocido" });
    expect(esLegado(cabecera)).toBe(false);
  });

  it("con la forma nueva, el Pin pasa a estar comprobado: se midió ese contenido", () => {
    const cabecera = cabeceraDeLegado(SCORECARD_NUEVO, contexto());
    expect(cabecera.pin.estado).toBe("comprobado");
  });

  it("con `arbolHash` también, y sin ninguno de los dos sigue siendo declarado", () => {
    // Control positivo de los dos lados: lo que separa «declarado» de
    // «comprobado» es una marca de medida en el fichero, no el test.
    expect(cabeceraDeLegado({ ...SCORECARD_V0, arbolHash: "a".repeat(64) }, contexto()).pin.estado).toBe(
      "comprobado",
    );
    expect(cabeceraDeLegado(SCORECARD_V0, contexto()).pin.estado).toBe("declarado");
  });

  it("un JSON que no es de los folios del archivo no es legado", () => {
    const cabecera = cabeceraDeLegado(
      { herramienta: "opencode", version: "2.1.0" },
      { origen: "reports/opencode.json", fichero: "opencode.json", fecha: "2026-10-22", regla: REGLA },
    );

    expect(cabecera.folio).toBe("otro");
    expect(esLegado(cabecera)).toBe(false);
  });

  it("una Ejecución persistida es un folio con nombre propio, no un Scorecard", () => {
    const cabecera = cabeceraDeLegado(
      {
        skill: "implement-component",
        caso: "boton-primario",
        grade: "INACEPTABLE",
        pin: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
      },
      contexto({ origen: "reports/suite/ejecuciones/implement-component/boton-primario/2.json", fichero: "2.json" }),
    );

    expect(cabecera.folio).toBe("ejecucion");
    expect(cabecera.pin.estado).toBe("declarado");
  });

  it("una captura en prosa es un texto, y lo que no es ni eso se distingue", () => {
    expect(cabeceraDeLegado(null, contexto({ fichero: "ejecucion-1-fuente.txt" })).folio).toBe("texto");
    expect(cabeceraDeLegado("{}", contexto({ fichero: "notas.txt" })).folio).toBe("texto");
  });

  it("cada folio se describe con lo que es", () => {
    expect(descripcionDelFolio("scorecard")).toBe("El Scorecard de una corrida completa.");
    expect(descripcionDelFolio("texto")).toContain("prosa");
  });
});

describe("medidaDeLegado: lo que se leyó de cada Caso, como se guardó (ticket 10)", () => {
  it("lee el veredicto y sus cuentas, y no se inventa las entregas que no se guardaron", () => {
    expect(medidaDeLegado(SCORECARD_V0)).toEqual([
      {
        caso: "boton-primario",
        veredicto: "SUSPENDE",
        // Sin `entregas`: un 0 diría «no entregó» y dos sí entregaron (y
        // salieron mal). `ejecuciones` son intentos, y como intentos se leen.
        intentos: 3,
        correctas: 0,
        entregoMal: 0,
        sinArtefacto: 2,
      },
    ]);
  });

  it("con la forma nueva lee entregas, intentos y cuántas no entregaron", () => {
    expect(medidaDeLegado(SCORECARD_NUEVO)[0]).toEqual({
      caso: "boton-primario",
      veredicto: "PASA",
      entregas: 1,
      intentos: 4,
      correctas: 1,
      entregoMal: 0,
      sinArtefacto: 3,
    });
  });

  it("lo que no tiene Casos no tiene medida: ni una fila falsa ni un cero", () => {
    expect(medidaDeLegado({ skills: [] })).toEqual([]);
    expect(medidaDeLegado([{ ejecucion: 1 }])).toEqual([]);
    expect(medidaDeLegado(null)).toEqual([]);
  });
});

describe("hechosDeLaEjecucion: lo que una Ejecución dice de sí misma (ticket 10)", () => {
  // La Ejecución 2 real del experimento: la que entregó y fue EXCELENTE.
  const EJECUCION = {
    skill: "implement-component",
    caso: "boton-primario",
    tipo: "caso-componente",
    pin: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
    grade: "EXCELENTE",
    entrega: "con-artefacto",
    flujoAlcanzoSkill: true,
  };

  it("lee el Grade, la entrega y si alcanzó el skill", () => {
    expect(hechosDeLaEjecucion(EJECUCION)).toEqual({
      skill: "implement-component",
      caso: "boton-primario",
      grade: "EXCELENTE",
      entrega: "con-artefacto",
      alcanzoElSkill: true,
    });
  });

  it("lo que la Ejecución no trae no se le inventa", () => {
    // Los ficheros del 22/10 no tienen `exitCode`: la cabecera de una Ejecución
    // dice lo que hay, no lo que habría tras el ticket 02.
    const sinCampos = { skill: "s", caso: "c", grade: "INACEPTABLE" };
    expect(hechosDeLaEjecucion(sinCampos)).toEqual({
      skill: "s",
      caso: "c",
      grade: "INACEPTABLE",
    });
  });

  it("un Scorecard no es una Ejecución, y un array tampoco", () => {
    expect(hechosDeLaEjecucion(SCORECARD_V0)).toBeUndefined();
    expect(hechosDeLaEjecucion([{ ejecucion: 1 }])).toBeUndefined();
    expect(hechosDeLaEjecucion(null)).toBeUndefined();
  });
});

describe("tasaDeEntrega: cuántas entregaron, contado por Ejecución (ticket 10)", () => {
  // El `resumen.json` real de `estabilidad-v2`: 1 entrega de 3, y las que
  // entregan o no lo dicen cada una. La spec cita este «1 de 3».
  const RESUMEN = [
    { ejecucion: 1, grade: "INACEPTABLE", entrega: "sin-artefacto", flujoAlcanzoSkill: true },
    { ejecucion: 2, grade: "EXCELENTE", entrega: "con-artefacto", flujoAlcanzoSkill: true },
    { ejecucion: 3, grade: "INACEPTABLE", entrega: "sin-artefacto", flujoAlcanzoSkill: false },
  ];

  it("cuenta las que entregaron, no las que aprobaron", () => {
    expect(tasaDeEntrega(RESUMEN)).toEqual({ ejecuciones: 3, conArtefacto: 1, alcanzaronSkill: 2 });
  });

  it("cero entregas es un cero que significa algo, no un hueco", () => {
    const sinEntregas = RESUMEN.map((e) => ({ ...e, entrega: "sin-artefacto" }));
    expect(tasaDeEntrega(sinEntregas)?.conArtefacto).toBe(0);
  });

  it("un Scorecard no es un resumen: no tiene tasa que contar", () => {
    expect(tasaDeEntrega(SCORECARD_V0)).toBeUndefined();
    expect(tasaDeEntrega(null)).toBeUndefined();
  });
});
