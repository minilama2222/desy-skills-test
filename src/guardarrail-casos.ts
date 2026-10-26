/**
 * Guardarraíl del árbol de Casos: todos los Casos declarados en `casos/` deben
 * ser **cargables**. Nace del retro del ticket 09: cada Caso se validaba sólo por
 * un test que **nombraba su ruta**, así que un Caso nuevo con un `checks.json`
 * malformado o sin `rubric.md` se colaba hasta que alguien le escribía un test.
 * El trabajo del repo es declarar Casos sin escribir código (spec, user story 5):
 * un Caso malformado es un error mecánico, y un guardarraíl lo caza.
 *
 * Es **pura**: recibe una descripción del árbol (qué ficheros tiene cada Caso, y
 * si el loader lo cargó) y devuelve un hallazgo por problema. El recolector del
 * FS y el loader viven en `scripts/verificar-casos.ts`.
 */
export interface CasoEnDisco {
  /** Ruta relativa, para el mensaje. */
  ruta: string;
  skill: string;
  /** Nombre de la carpeta de tipo (`componente` | `pagina` | `decision`). */
  tipo: string;
  id: string;
  tienePrompt: boolean;
  tieneChecks: boolean;
  tieneRubric: boolean;
  /** Sólo lo exige un Caso-página. */
  tieneGold?: boolean;
  /**
   * El error del loader si el Caso tiene la estructura de ficheros correcta pero
   * su contenido no carga (p. ej. `checks.json` malformado). El mensaje ya viene
   * claro del loader; aquí sólo se propaga.
   */
  errorDeCarga?: string;
}

const TIPOS_VALIDOS = new Set(["componente", "pagina", "decision"]);

/**
 * Devuelve un hallazgo por problema de un Caso, o vacío si el árbol está sano.
 * Acumula varios problemas del mismo Caso.
 */
export function problemasDelArbolDeCasos(casos: CasoEnDisco[]): string[] {
  const hallazgos: string[] = [];
  for (const caso of casos) {
    if (!TIPOS_VALIDOS.has(caso.tipo)) {
      hallazgos.push(
        `${caso.ruta}: tipo de Caso desconocido "${caso.tipo}" ` +
          `(esperado: ${[...TIPOS_VALIDOS].join(", ")})`,
      );
    }
    if (!caso.tienePrompt) {
      hallazgos.push(`${caso.ruta}: falta el prompt en input/prompt.md`);
    }
    if (!caso.tieneChecks) {
      hallazgos.push(`${caso.ruta}: falta expected/checks.json`);
    }
    if (!caso.tieneRubric) {
      hallazgos.push(`${caso.ruta}: falta rubric.md`);
    }
    if (caso.tipo === "pagina" && !caso.tieneGold) {
      hallazgos.push(`${caso.ruta}: un Caso-página necesita el Gold-HTML en input/gold.html`);
    }
    if (caso.errorDeCarga !== undefined) {
      hallazgos.push(`${caso.ruta}: no carga — ${caso.errorDeCarga}`);
    }
  }
  return hallazgos;
}
