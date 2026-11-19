import { describe, expect, it } from "vitest";
import {
  deudaDeAnclaje,
  problemasDeAnclaDeFramework,
  problemasDeAnclaje,
} from "../src/guardarrail-casos.js";
import type { CasoEnDisco } from "../src/guardarrail-casos.js";

/**
 * ADR-0020: la lista de ids del Framework mezcla dos clases y sólo una es
 * intocable para el ancla. Un **Guard del tipo de Caso** lo ejecuta el Framework aunque el Caso no
 * lo nombre: anclarlo son dos fuentes. Un **id que el Framework también usa y el
 * Caso declara** es un Check de negocio: se ancla, y sin el ancla el informe decía
 * de un Check medido «no declara de qué sección depende».
 *
 * El test es el de la decisión y no el del fichero: recorre los ids de la lista y
 * comprueba que cada uno cae del lado que el ADR dice. Si alguien mueve un id de
 * clase, se pone rojo aquí antes de que el retro lo descubra a mano.
 */
const GUARDS_QUE_EL_FRAMEWORK_EJECUTA_SIN_QUE_EL_CASO_LOS_DECLARE = [
  "un-solo-h1",
  "skip-link",
  "fidelidad-container",
  "fidelidad-escala-h1",
  "fidelidad-gap",
];

const IDS_QUE_EL_CASO_DECLARA_PARA_MEDIRLOS = ["fieldset-con-legend", "labels-visibles"];

const casoQueAncla = (id: string): CasoEnDisco => ({
  ruta: "casos/skill/componente/caso/rubric.md",
  skill: "skill",
  tipo: "componente",
  id: "caso",
  tienePrompt: true,
  tieneChecks: true,
  tieneRubric: true,
  idsDeChecks: [id],
  anclas: new Map([[id, { skill: "desy-styles-reference", seccion: "Espaciado" }]]),
});

const SIN_ANCLA: ReadonlyMap<string, string> = new Map();

describe("ADR-0020: qué id del Framework se ancla y cuál no", () => {
  for (const id of GUARDS_QUE_EL_FRAMEWORK_EJECUTA_SIN_QUE_EL_CASO_LOS_DECLARE) {
    it(`\`${id}\` es un Guard: anclarlo es un rechazo`, () => {
      const [hallazgo] = problemasDeAnclaDeFramework(casoQueAncla(id));

      expect(hallazgo).toContain("Guard del Framework");
    });
  }

  for (const id of IDS_QUE_EL_CASO_DECLARA_PARA_MEDIRLOS) {
    it(`\`${id}\`: el Caso lo declara, así que se ancla sin rechazo`, () => {
      expect(problemasDeAnclaDeFramework(casoQueAncla(id))).toEqual([]);
    });

    it(`\`${id}\`: sin el ancla es deuda, no silencio`, () => {
      // El fallo que destapó el ticket 17: la cuenta filtraba este id porque está
      // en la lista del Framework, y un Caso que lo declara salía sin deuda.
      const sinAncla: CasoEnDisco = { ...casoQueAncla(id), anclas: new Map() };

      expect(problemasDeAnclaje(sinAncla, SIN_ANCLA)[0]).toContain("no ancla 1 de sus 1");
      expect(deudaDeAnclaje([sinAncla], new Map([[sinAncla.ruta, "ticket"]]))).toHaveLength(1);
    });
  }
});
