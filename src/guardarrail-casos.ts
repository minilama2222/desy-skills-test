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
  /** Los `id` de los Checks del Caso (`expected/checks.json`), si se pudieron leer. */
  idsDeChecks?: string[];
  /** El texto de `rubric.md`, para contrastarlo con los Checks del Caso. */
  textoRubric?: string;
}

const TIPOS_VALIDOS = new Set(["componente", "pagina", "decision"]);

/**
 * Devuelve un hallazgo por problema de un Caso, o vacío si el árbol está sano.
 * Acumula varios problemas del mismo Caso.
 */
export function problemasDelArbolDeCasos(casos: CasoEnDisco[]): string[] {
  const hallazgos: string[] = [];
  // El vocabulario de ids conocido: todos los que declara cualquier Caso del
  // árbol. Es lo que permite distinguir un id que **sobró** (dejó de estar en su
  // Caso) de una palabra en negrita cualquiera.
  const vocabulario = new Set<string>(IDS_DEL_FRAMEWORK);
  for (const caso of casos) {
    for (const id of caso.idsDeChecks ?? []) vocabulario.add(id);
  }

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
    for (const problema of problemasDeRubric(caso, vocabulario)) hallazgos.push(problema);
  }
  return hallazgos;
}

/**
 * Los `id` de los Checks del **Framework** (los base que el grader añade por tipo
 * de Caso, ver `frameworkDeChecks` en `src/grader.ts`). Una rúbrica puede
 * documentarlos aunque no estén en su `checks.json`: están ahí porque el tipo de
 * Caso los trae, no porque el Caso los declare. Se listan aquí para que la regla
 * no los confunda con un Check que sobra.
 */
export const IDS_DEL_FRAMEWORK = new Set([
  "tokens-del-sistema",
  "un-solo-h1",
  "skip-link",
  "fieldset-con-legend",
  "labels-visibles",
  "fidelidad-container",
  "fidelidad-escala-h1",
  "fidelidad-gap",
]);

/**
 * Los tokens que la rúbrica escribe **en negrita** (`**token-base-16px**`), que es
 * la convención del repo para citar un Check. Devuelve todos los candidatos; los
 * que **son** una cita de Check los decide `problemasDeRubric`, que tiene el
 * vocabulario a mano (un valor de dominio como `**desy-html**` también va en
 * negrita y no es un id).
 */
export function idsDeChecksCitadosEnRubric(rubric: string): string[] {
  const ids = new Set<string>();
  for (const match of rubric.matchAll(/\*\*([a-z][a-z0-9]*(?:-[a-z0-9]+)+)\*\*/g)) {
    ids.add(match[1]!);
  }
  return [...ids];
}

/**
 * Coherencia entre la rúbrica y los Checks del Caso. Nace del Bloque C: al
 * cambiar los Quality de `styles-reference` en `checks.json`, su `rubric.md` se
 * quedó describiendo los anteriores, y ni el loader ni el guardarraíl del árbol
 * lo veían —`tieneRubric` comprueba que el fichero exista, no lo que dice—. La
 * review lo cazó a mano; esta regla lo caza sola.
 *
 * Sólo se juzga sobre los tokens que **son ids**: los del Caso, los del Framework
 * y los que algún otro Caso declara (`vocabularioDeIds`). Ese último conjunto es
 * lo que permite detectar un id **obsoleto**: uno que ya no está en este Caso
 * pero sigue siendo un id por otros Casos, o que simplemente desapareció. Un
 * valor de dominio en negrita (`**desy-html**`, una librería) no es un id y no
 * cuenta.
 *
 * `vocabularioDeIds` es opcional: sin él (una prueba que valida un Caso aislado)
 * sólo se juzga la dirección «el Caso tiene Checks sin documentar», que no
 * necesita saber qué es un id obsoleto.
 */
export function problemasDeRubric(
  caso: CasoEnDisco,
  vocabularioDeIds?: Set<string>,
): string[] {
  if (caso.idsDeChecks === undefined || caso.textoRubric === undefined) return [];

  const delCaso = new Set(caso.idsDeChecks);
  const esIdDeCheck = (token: string): boolean =>
    delCaso.has(token) ||
    IDS_DEL_FRAMEWORK.has(token) ||
    (vocabularioDeIds !== undefined && vocabularioDeIds.has(token));
  const citados = new Set(
    idsDeChecksCitadosEnRubric(caso.textoRubric).filter(esIdDeCheck),
  );
  if (citados.size === 0) return [];

  const sobrantes = [...citados].filter((id) => !delCaso.has(id) && !IDS_DEL_FRAMEWORK.has(id));
  const sinDocumentar = [...delCaso].filter((id) => !citados.has(id));

  const problemas: string[] = [];
  if (sobrantes.length > 0) {
    problemas.push(
      `${caso.ruta}: la rubric.md nombra Check/s que el Caso ya no tiene: ` +
        `${sobrantes.join(", ")}`,
    );
  }
  if (sinDocumentar.length > 0) {
    problemas.push(
      `${caso.ruta}: el Caso tiene Check/s que la rubric.md no documenta: ` +
        `${sinDocumentar.join(", ")}`,
    );
  }
  return problemas;
}
