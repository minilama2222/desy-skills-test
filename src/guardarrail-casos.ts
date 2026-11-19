import type { AnclaDeSkill, ContradiccionDeSkill } from "./caso.js";

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
  /**
   * Las anclas de skill que declara la `rubric.md`, por id de Check (ticket 06).
   * `undefined` si el Caso no las declara: entonces el guardarraíl no juzga nada
   * y el informe dice «el Check no declara de qué sección depende».
   */
  anclas?: Map<string, AnclaDeSkill>;
  /**
   * Las contradicciones con el skill que declara la `rubric.md`, por id de Check
   * (ticket 13). Opcionales: no declarar ninguna no es un rojo —la contradicción
   * es deuda de juicio, no un hecho mecánico—; lo que sí se juzga es que las que se
   * declaran apunten a un Check real y a una sección que exista.
   */
  contradicciones?: Map<string, ContradiccionDeSkill>;
  /**
   * Las secciones que existen en el árbol de skills medido, por `skill` → títulos
   * presentes en su `SKILL.md`. Lo aporta el adaptador; sin él no se puede decir
   * que una ancla apunte a una sección inexistente.
   */
  seccionesPorSkill?: Map<string, Set<string>>;
}

const TIPOS_VALIDOS = new Set(["componente", "pagina", "decision"]);

/**
 * Devuelve un hallazgo por problema de un Caso, o vacío si el árbol está sano.
 * Acumula varios problemas del mismo Caso.
 *
 * `lista` es la de pendientes (`PENDIENTES_DE_ANCLAR` por defecto). Se puede
 * pasar otra para probar la tolerancia por ruta y las reglas de la lista: desde
 * el ticket 12 la real está vacía, y así se queda.
 */
export function problemasDelArbolDeCasos(
  casos: CasoEnDisco[],
  lista: ReadonlyMap<string, string> = PENDIENTES_DE_ANCLAR,
): string[] {
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
    for (const problema of problemasDeAnclaje(caso, lista)) hallazgos.push(problema);
    for (const problema of problemasDeContradiccion(caso)) hallazgos.push(problema);
  }
  if (esArbolCompleto(casos, lista)) {
    for (const problema of problemasDeLaListaDePendientes(casos, lista)) hallazgos.push(problema);
  }
  return hallazgos;
}

/**
 * Las anclas de skill del Caso apuntan a algo real (ticket 06). Un ancla que
 * nombra un Check que el Caso no tiene queda obsoleta en cuanto el `checks.json`
 * cambia, y una que cita una sección que el skill no tiene cita una frase que
 * nadie escribió: el informe presentaría esa sección como si existiera. Es el
 * mismo género que el id obsoleto de la rúbrica.
 *
 * El skill del ancla que no es el del Caso se acepta (un Caso-componente ancla en
 * `desy-styles-reference`, que es donde vive la tabla de tokens), pero se
 * contrasta contra **ese** skill, no contra el del Caso.
 */
/**
 * Los Casos que **todavía no** anclan sus Checks, con el ticket que los anclar.
 *
 * Nació como deuda declarada en el ticket 06 (cada Caso anterior al anclaje por
 * Check describía en prosa de apoyo en qué secciones del skill vive la regla, sin
 * decir a qué Check corresponde cada una) y el **ticket 12** la saldó entera:
 * los trece Casos anclan hoy cada Check. La lista **queda vacía y así se queda**:
 * cualquier Caso sin anclar es un rojo, que es la regla del 06 entera.
 *
 * Se conserva la lista —y no se borra— porque tiene tres propiedades que siguen
 * valiendo si algún día hace falta una excepción temporal:
 *
 * - **Sólo admite Casos que existen**: un nombre que sobra es un hallazgo (la
 *   lista no puede crecer con fantasmas), y así se ve cuándo vaciarla.
 * - **Un Caso que sale de la lista no puede quedar sin anclar**: si se anclaró,
 *   fuera de la lista; si se borró, fuera también.
 * - **Un Caso nuevo sin ancla rompe el build**, que es el objetivo: el silencio
 *   sólo se tolera donde ya estaba, y hoy no está en ningún sitio.
 */
export const PENDIENTES_DE_ANCLAR: ReadonlyMap<string, string> = new Map([]);

export function problemasDeAnclaje(
  caso: CasoEnDisco,
  lista: ReadonlyMap<string, string> = PENDIENTES_DE_ANCLAR,
): string[] {
  const problemas: string[] = [];
  const delCaso = new Set(caso.idsDeChecks ?? []);

  for (const [id, ancla] of caso.anclas ?? []) {
    if (caso.idsDeChecks !== undefined && !delCaso.has(id)) {
      problemas.push(
        `${caso.ruta}: rubric.md ancla «${ancla.skill} → «${ancla.seccion}»» al Check "${id}", ` +
          `que el Caso no tiene`,
      );
    }
    if (caso.seccionesPorSkill === undefined) continue;
    const secciones = caso.seccionesPorSkill.get(ancla.skill);
    if (secciones === undefined) {
      problemas.push(
        `${caso.ruta}: rubric.md ancla al skill "${ancla.skill}", que no está en el árbol de skills medido`,
      );
    } else if (!secciones.has(ancla.seccion)) {
      problemas.push(
        `${caso.ruta}: rubric.md ancla «${ancla.skill} → «${ancla.seccion}»», ` +
          `pero ese SKILL.md no tiene esa sección`,
      );
    }
  }

  problemas.push(...problemasDeChecksSinAncla(caso, lista));
  return problemas;
}

/**
 * Todo Check del Caso tiene su ancla (retro del ticket 06). El informe por Caso
 * cita la sección de la que depende **cada** Check; sin ancla no tiene qué citar
 * y escribe «el Check no declara de qué sección depende», que es verdad del Check
 * y una pena para quien lee.
 *
 * Nace de un silencio medido: de los 11 Casos con epígrafe `## Anclaje en
 * desy-skills`, diez lo escriben como **prosa de apoyo** («Macros y props:
 * `desy-implement-component` → «Macros compuestos»»), que describe en qué
 * secciones vive la regla en general y **no** a qué Check corresponde cada una.
 * El parser, correcto, los ignoraba; y como sólo valida las anclas que encontró,
 * no dijo nada. Esta regla convierte ese silencio en un rojo: si un Caso declara
 * Checks y no los ancla, `verificar-casos` lo nombra y dice cuáles faltan.
 *
 * La prosa de apoyo sigue siendo válida: lo que se exige es que **además** cada
 * Check tenga su línea de ancla.
 */
function problemasDeChecksSinAncla(
  caso: CasoEnDisco,
  lista: ReadonlyMap<string, string>,
): string[] {
  const { total, sinAncla } = checksSinAncla(caso);
  if (sinAncla.length === 0) return [];
  // La deuda declarada se tolera aquí, pero se **dice** en el resumen del script:
  // si no, un pendiente se vuelve invisible y la lista crece.
  if (lista.has(caso.ruta)) return [];
  return [
    `${caso.ruta}: rubric.md no ancla ${sinAncla.length} de sus ${total} ` +
      `Check/s (${sinAncla.join(", ")})`,
  ];
}

/**
 * Una contradicción declarada (ticket 13) apunta a algo real, como un ancla: el
 * Check tiene que existir en el Caso, y la sección citada en el `SKILL.md` del
 * skill que contradice. Citar una sección fantasma no es un hallazgo, es un error
 * —el informe presentaría como contradicción una frase que nadie escribió—.
 *
 * El skill que contradice puede ser distinto del Caso y del ancla: es el que
 * choca, no el que manda. Se contrasta contra **ese** skill.
 */
export function problemasDeContradiccion(caso: CasoEnDisco): string[] {
  const problemas: string[] = [];
  const delCaso = new Set(caso.idsDeChecks ?? []);

  for (const [id, c] of caso.contradicciones ?? []) {
    const cita = `«${c.skill} → «${c.seccion}»»`;
    if (caso.idsDeChecks !== undefined && !delCaso.has(id)) {
      problemas.push(
        `${caso.ruta}: rubric.md declara que ${cita} contradice al Check "${id}", ` +
          "que el Caso no tiene",
      );
    }
    if (caso.seccionesPorSkill === undefined) continue;
    const secciones = caso.seccionesPorSkill.get(c.skill);
    if (secciones === undefined) {
      problemas.push(
        `${caso.ruta}: rubric.md declara una contradicción con el skill "${c.skill}", ` +
          "que no está en el árbol de skills medido",
      );
    } else if (!secciones.has(c.seccion)) {
      problemas.push(
        `${caso.ruta}: rubric.md declara que ${cita} contradice al Check "${id}", ` +
          "pero ese SKILL.md no tiene esa sección",
      );
    }
  }
  return problemas;
}

/**
 * Los Checks de un Caso que no tienen ancla, y cuántos tiene en total. Es la
 * única fuente de la resta que hacen el rojo (`problemasDeChecksSinAncla`) y la
 * deuda declarada (`deudaDeAnclaje`): si cada una la calculara, la tolerancia por
 * ruta y la medida por Check podrían discrepar.
 */
function checksSinAncla(caso: CasoEnDisco): { total: number; sinAncla: string[] } {
  const ids = caso.idsDeChecks ?? [];
  const ancladas = new Set((caso.anclas ?? new Map()).keys());
  return { total: ids.length, sinAncla: ids.filter((id) => !ancladas.has(id)) };
}

/**
 * El ancla **se suma** a la prosa de apoyo, no la sustituye (retro de la sesión
 * del ticket 12): al anclar cada Check, la prosa que ya había se reescribe —o se
 * pierde— sin que nada lo note. La rúbrica es prosa que lee una persona, y una
 * sección que se cae en una reescritura se lleva su cita con ella.
 *
 * Recibe, por Caso, las secciones citadas hoy y las de su versión en `HEAD`, y
 * devuelve un hallazgo por sección que **desapareció**. Una rúbrica nueva (sin
 * versión anterior) no tiene de qué perder.
 *
 * Se compara por **título**, no por número de línea: las líneas se mueven con
 * cada edición.
 */
export interface SeccionesCitadas {
  ruta: string;
  /** Las de la rúbrica en disco, hoy. */
  actuales: string[];
  /** Las de la rúbrica en `HEAD`; `undefined` si el Caso es nuevo. */
  anteriores?: string[];
}

export function problemasDeAnclajePerdidas(
  rubricas: SeccionesCitadas[],
): string[] {
  const problemas: string[] = [];
  for (const { ruta, actuales, anteriores } of rubricas) {
    if (anteriores === undefined) continue;
    const hoy = new Set(actuales);
    const perdidas = anteriores.filter((cita) => !hoy.has(cita));
    if (perdidas.length === 0) continue;
    problemas.push(
      `${ruta}: rubric.md ya no cita ${perdidas.length} sección/es que sí citaba en ` +
        `HEAD (${perdidas.join("; ")}). El ancla se suma a la prosa de apoyo: ` +
        "reescríbela sin perder ninguna sección citada",
    );
  }
  return problemas;
}

/**
 * La deuda de anclaje **declarada**, medida por Check: cuántos Checks le faltan a
 * cada Caso de `PENDIENTES_DE_ANCLAR`, y cuáles.
 *
 * No es un rojo y no lo será: el ticket 06 decidió tolerar la deuda mientras el
 * Caso está en la lista (`problemasDeChecksSinAncla`), y la revisión del retro del
 * 07 recordó que esta función **no cambia esa decisión**, sólo la mide. Lo que sí
 * garantiza es que la medida no pueda discrepar del guardarraíl: las dos parten
 * de `checksSinAncla`, así que un Caso al que le quede uno no puede salir «sin
 * deuda» aquí y en rojo allí.
 *
 * Sirve para que `verificar-casos` diga el progreso. Con la lista vacía (ticket
 * 12) ya no mide nada: cualquier Check sin ancla es un rojo del guardarraíl.
 * La lista es un argumento para poder probar la regla sin la constante vacía.
 */
export interface DeudaDeAnclaje {
  ruta: string;
  /** El ticket que la salda (`ticket 12`). */
  ticket: string;
  ancladas: number;
  total: number;
  /** Los Checks que le faltan, por id: lo que hay que hacer, no sólo cuánto. */
  sinAncla: string[];
}

export function deudaDeAnclaje(
  casos: CasoEnDisco[],
  lista: ReadonlyMap<string, string> = PENDIENTES_DE_ANCLAR,
): DeudaDeAnclaje[] {
  const porRuta = new Map(casos.map((c) => [c.ruta, c]));
  const deuda: DeudaDeAnclaje[] = [];
  for (const [ruta, ticket] of lista) {
    const caso = porRuta.get(ruta);
    if (caso === undefined) continue;
    const { total, sinAncla } = checksSinAncla(caso);
    if (sinAncla.length === 0) continue;
    deuda.push({ ruta, ticket, ancladas: total - sinAncla.length, total, sinAncla });
  }
  return deuda;
}

/**
 * Lo que la lista de pendientes dice de sí misma, para que no mienta:
 *
 * - Un nombre que **no está** en el árbol es un fantasma: se ancló y no se sacó
 *   de la lista, o el Caso se borró y el pendiente quedó. En ambos casos la lista
 *   deja de describir la deuda real.
 * - Un pendiente que **ya ancla** todos sus Checks sobra: no se puede dejar ahí
 *   para siempre.
 *
 * Devuelve un hallazgo por cada caso, con qué hacer. La lista es un argumento,
 * como en `deudaDeAnclaje`: desde el ticket 12 la real está vacía.
 */
export function problemasDeLaListaDePendientes(
  casos: CasoEnDisco[],
  lista: ReadonlyMap<string, string> = PENDIENTES_DE_ANCLAR,
): string[] {
  const problemas: string[] = [];
  const porRuta = new Map(casos.map((c) => [c.ruta, c]));

  for (const [ruta, ticket] of lista) {
    const caso = porRuta.get(ruta);
    if (caso === undefined) {
      problemas.push(
        `PENDIENTES_DE_ANCLAR nombra «${ruta}» (${ticket}), que no está en el árbol de Casos: ` +
          "quítalo de la lista",
      );
      continue;
    }
    // Sin deuda no hay nada que tolerar: `checksSinAncla` es la misma resta que
    // hace el rojo, así que la lista no puede decir «me queda deuda» mientras el
    // guardarraíl calla, ni al revés.
    const { total, sinAncla } = checksSinAncla(caso);
    if (sinAncla.length === 0) {
      problemas.push(
        `${ruta} ya ancla sus ${total} Check/s: quítalo de PENDIENTES_DE_ANCLAR (${ticket})`,
      );
    }
  }
  return problemas;
}

/**
 * ¿Este árbol es el del repo entero? La lista de pendientes sólo tiene sentido
 * sobre el árbol completo: en una prueba de un Caso suelto, los Casos del repo no
 * están y serían «fantasmas» todos. Cuando falta alguno, la lista no se juzga:
 * sus propias pruebas la juzgan con la lista entera. Desde el ticket 12 la lista
 * está vacía, así que las reglas de la lista sólo disparan con listas de prueba.
 */
function esArbolCompleto(
  casos: CasoEnDisco[],
  lista: ReadonlyMap<string, string>,
): boolean {
  const rutas = new Set(casos.map((c) => c.ruta));
  return [...lista.keys()].every((ruta) => rutas.has(ruta));
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
