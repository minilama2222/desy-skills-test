import type { AnclaDeSkill, ContradiccionDeSkill } from "./caso.js";
import type { ResultadoEjecucion } from "./ejecutar.js";
import type { DetalleCheck } from "./grader.js";
import { esHallazgoDeTrigger } from "./scorecard.js";
import { trazaDeAssert, type TrazaCheck } from "./traza.js";

/**
 * El informe por Caso (ticket 06 del bucle de refinamiento): pone lado a lado la
 * aserción del Check fallido, la línea del Artefacto que la tumba y la sección
 * del skill que el Caso nombra.
 *
 * **Presenta, no adivina.** El informe no emite veredicto de «culpa del skill» o
 * «culpa del check»: eso lo decide quien lo lee, y para decidirlo necesita los
 * tres datos en la misma vista. Por eso este módulo es puro —recibe Ejecuciones
 * ya graduadas y Casos, y devuelve markdown— y por eso nunca escribe la palabra
 * «culpa».
 *
 * La única excepción que sí se destaca es el **hallazgo de trigger** (entrega
 * correcta sin invocar el skill): es un hecho del Flujo, no una atribución de
 * culpa, y sin destacarlo la evidencia se pierde. Sale en lo alto del informe del
 * Caso y en la cabecera del Scorecard (ticket 07).
 */

/** Un ancla como la lee el informe: el skill y su sección, resueltos o no. */
export interface SeccionDelSkill {
  skill: string;
  seccion: string;
  /**
   * El texto de la sección, tal como está hoy en el árbol de skills medido. Vacío
   * cuando el informe no pudo leer la sección (no hubo invocación, o el
   * `SKILL.md` no está en el sitio esperado): entonces sólo se cita el título.
   */
  texto: string;
  /**
   * `undefined` si se leyó; si no, por qué no. El informe lo dice en vez de
   * callar: una sección que no se pudo leer no es una sección inexistente.
   */
  noLeida?: string;
}

/**
 * Lo que el informe necesita saber de un Caso que la Ejecución no lleva: su
 * prompt, sus anclas por Check y cómo resolver el texto de una sección.
 *
 * Todo es opcional salvo `prompt`: un informe de un árbol de Ejecuciones
 * anteriores, o de un Caso que ya no está en `casos/`, sigue siendo legible. Lo
 * que falte se dice en el propio informe.
 */
export interface ContextoDelCaso {
  caso: string;
  /** El prompt del Caso (`input/prompt.md`). */
  prompt?: string;
  /** Las anclas por id de Check, del `rubric.md` del Caso (o de la Ejecución). */
  anclas?: ReadonlyMap<string, AnclaDeSkill>;
  /**
   * Las contradicciones que el `rubric.md` del Caso declara entre un Check y una
   * sección de un skill (ticket 13). No son anclas: no sustituyen a `anclas`, que
   * sigue diciendo de qué sección depende la regla. Sin ellas no hay nada que
   * presentar, y eso no es un rojo.
   */
  contradicciones?: ReadonlyMap<string, ContradiccionDeSkill>;
  /**
   * Resuelve el texto de una sección de un skill. El adaptador lo construye con
   * los skills medidos (el árbol de `--skills-local`, o el `vendor/`); el
   * informe no sabe dónde viven ni tiene por qué saberlo.
   */
  leerSeccion?: (ancla: AnclaDeSkill) => string | undefined;
}

/**
 * ¿El Check mira el Flujo en vez del artefacto? Se decide por su **aserción**
 * (`flujo_canonico`), no por su id: el id lo elige el Caso y puede ser cualquiera
 * (`encadenado-canonico`, `flujo-canonico-pagina`…). Un Check de Flujo es el caso
 * en que «la línea del artefacto» no existe: lo que se cita es el Flujo observado.
 */
function esDelFlujo(check: DetalleCheck): boolean {
  return check.assert !== undefined && check.assert.kind === "flujo_canonico";
}

/**
 * Cómo se lee la salida de una Ejecución: el Grade y la Entrega dicen qué
 * dimensión se rompió, y cada una se explica en una frase distinta. Un crash
 * (exit ≠ 0) no es un «no entregó»: es otra cosa, y decirlo importa.
 */
function estadoDeEjecucion(ejecucion: ResultadoEjecucion): string {
  if (ejecucion.exitCode !== 0) {
    return `crasheó (exit ${ejecucion.exitCode})`;
  }
  if (ejecucion.entrega === "sin-artefacto") {
    return "terminó sin entregar (exit 0, sin Artefacto)";
  }
  if (ejecucion.grade === "EXCELENTE") return "entregó y pasó todos los Checks";
  return `entregó (${ejecucion.grade})`;
}

/** El artefacto de una Ejecución, si lo hubiera, como texto de una línea. */
function artefactosEntregados(ejecucion: ResultadoEjecucion): string[] {
  return Object.keys(ejecucion.artefactos).sort();
}

/**
 * El hallazgo de trigger: una Ejecución entregó un Artefacto **EXCELENTE sin
 * invocar el skill bajo test**. Es de la clase «información sobre el skill (su
 * `description`/frontmatter) que el veredicto tira», y sin destacarlo se pierde.
 *
 * La regla no vive aquí: vive en `src/scorecard.ts`, junto al veredicto que
 * descarta la Ejecución (ticket 07), para que descarte y hallazgo no puedan
 * divergir. Se re-exporta porque el informe es su consumidor natural.
 */
export { esHallazgoDeTrigger };

/**
 * Las primeras líneas de la salida del SUT en las que aparece `aguja`, con su
 * número de línea. Es la cita del artefacto: la línea de **la salida** que tumba
 * el Check, no una línea inventada por el informe.
 *
 * Devuelve vacío si no encuentra nada: una aserción puede fallar por **ausencia**
 * (no hay `componentButton`, no hay `lg:grid-cols-4`), y entonces la cita honesta
 * es «no hay línea», no la primera línea del fichero como si fuera la culpable.
 */
export function lineasQueMencionan(
  texto: string,
  aguja: string,
  maximo = 3,
): { numero: number; texto: string }[] {
  const buscada = aguja.trim().toLowerCase();
  if (buscada.length === 0) return [];
  const encontradas: { numero: number; texto: string }[] = [];
  const lineas = texto.split(/\r?\n/);
  for (let i = 0; i < lineas.length && encontradas.length < maximo; i++) {
    const linea = lineas[i]!;
    if (linea.toLowerCase().includes(buscada)) {
      encontradas.push({ numero: i + 1, texto: linea.trim() });
    }
  }
  return encontradas;
}

/**
 * Las agujas con las que se busca, en el artefacto, la línea que tumba el Check.
 * Salen del **valor** que la aserción nombra (`c-button--primary`, el texto que
 * debe estar…), no del id del Check: el id es un nombre para gente y no aparece
 * nunca en el artefacto.
 *
 * El orden importa: primero el valor que **difiere** (la clase, el texto, el
 * nombre de la prop), y después el macro. Citar la línea del `import` porque
 * nombra `componentButton` apunta a la línea correcta del artefacto por el motivo
 * equivocado; la línea que el autor mira es la que pone `classes`.
 */
function agujasDeAssert(assert: DetalleCheck["assert"]): string[] {
  if (assert === undefined) return [];
  switch (assert.kind) {
    case "macro_presente":
      return [assert.macro];
    // El macro es el **andamio** de la ausencia, no la línea que tumba: en
    // `macro_con_clase` la aguja es la clase, y el macro lo usa `citar`.
    case "macro_con_clase":
    case "macro_sin_clase":
      return [assert.clase];
    case "sin_props_inventados":
      return [assert.macro];
    case "usa_clase_tipografica":
      return [assert.clase];
    case "contiene_texto":
      return [assert.texto];
    case "estructura_grid":
      return ["grid"];
    case "declara_decision":
      return [assert.valor];
    case "no_declara_decision":
      return [assert.valor];
    case "no_declara_ejecucion":
      return [assert.accion];
    case "declara_fallo":
      return [assert.hecho];
    case "reconoce_componente":
      return [assert.componente];
    default:
      return [];
  }
}

/** El texto que se cita como «la línea del artefacto»: el artefacto, o la salida. */
function textoDelArtefacto(ejecucion: ResultadoEjecucion): string {
  const ficheros = Object.values(ejecucion.artefactos);
  return ficheros.length > 0 ? ficheros.join("\n") : ejecucion.salida.stdout;
}

/** La línea del artefacto que tumba un Check, o por qué no hay ninguna. */
interface Cita {
  lineas: { numero: number; texto: string }[];
  /**
   * Cuando no hay una línea con lo que el Check exige: el artefacto **carece** de
   * ella. `ancla` es la línea donde debería estar (la llamada al macro, por
   * ejemplo), si se puede localizar; si no, no hay nada que citar.
   */
  ausencia: { ancla?: { numero: number; texto: string } };
}

/**
 * Busca en el artefacto la cita del Check fallido. Primero el valor que la
 * aserción **nombra** (la clase `c-button--primary`); si no está —el caso típico
 * de un Guard por ausencia—, la línea donde el valor debería vivir (la llamada al
 * macro). No inventa una línea culpable cuando no hay ninguna: eso es información,
 * no un hueco que rellenar.
 *
 * La línea del macro no es una cita del fallo: un `import` que nombra
 * `componentButton` estuvo bien antes y lo seguirá estando después. Sólo se usa
 * como **andamio** de la ausencia, para decir dónde se esperaba el valor.
 */
function citar(texto: string, assert: DetalleCheck["assert"]): Cita {
  const encontradas = agujasDeAssert(assert).flatMap((aguja) =>
    lineasQueMencionan(texto, aguja),
  );
  const macro = assert !== undefined && "macro" in assert ? assert.macro : undefined;
  if (encontradas.length > 0) {
    // El `import` del macro, con la clase ausente, no es la línea que tumba:
    // se aparta, para que la cita sea la llamada y no la cabecera del fichero.
    const citas = encontradas.filter(
      (linea) => macro === undefined || !/^\s*\{%\s*from\b/.test(linea.texto),
    );
    if (citas.length > 0) return { lineas: citas, ausencia: {} };
  }
  const dondeDeberiaEstar = macro === undefined ? [] : lineasDeLlamadaAMacro(texto, macro);
  return {
    lineas: [],
    ausencia: dondeDeberiaEstar.length === 0 ? {} : { ancla: dondeDeberiaEstar[0]! },
  };
}

/**
 * La línea donde se **llama** al macro (`{{ componentButton({`), no la del
 * `{% from … import %}`: ésa sólo lo trae, y citarla como «aquí debería estar»
 * manda a quien lee a la cabecera del fichero, no al sitio que hay que editar.
 */
function lineasDeLlamadaAMacro(  texto: string,
  macro: string,
): { numero: number; texto: string }[] {
  const llamada = new RegExp(`\\b${escaparRegex(macro)}\\s*\\(`);
  return texto
    .split(/\r?\n/)
    .map((linea, i) => ({ numero: i + 1, texto: linea.trim() }))
    .filter((linea) => llamada.test(linea.texto) && !/^\{%\s*from\b/.test(linea.texto))
    .slice(0, 1);
}

/** El nombre de un macro como patrón de regex: un `$` o un `.` no son meta. */
function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Una cita en bloque markdown, con las líneas del artefacto y su número. */
function citaDeLineas(
  ficheros: string[],
  lineas: { numero: number; texto: string }[],
): string[] {
  if (lineas.length === 0) return [];
  const origen = ficheros.length === 0 ? "salida del SUT" : ficheros.join(", ");
  const salida: string[] = ["", `> ${origen}:`];
  for (const linea of lineas) {
    salida.push(`> \`${String(linea.numero).padStart(4, " ")} | ${linea.texto}\``);
  }
  return salida;
}

/**
 * La sección del skill que el Caso nombra para un Check, resuelta contra el árbol
 * medido. Sin ancla —un Check del Framework, que el Caso no declara— no hay
 * sección: se dice, no se rellena con una aproximación.
 *
 * **La invocación se comprueba primero, y a propósito.** El informe es de una
 * Ejecución, no del árbol: si esa Ejecución no invocó ningún skill, no hay nada
 * que esa corrida haya leído, y citar la sección —aunque el skill exista en el
 * árbol— presentaría como propio de la corrida un texto que el SUT nunca leyó.
 * Es la cuarta casilla del ticket, y la razón de que el chequeo no pueda quedar
 * detrás de `leerSeccion`: con el árbol disponible, `leerSeccion` devuelve texto y
 * la ausencia de invocación pasaría invisible.
 */
function seccionDe(
  check: DetalleCheck,
  contexto: ContextoDelCaso,
  invocaciones: number,
): SeccionDelSkill | undefined {
  const ancla = check.ancla ?? contexto.anclas?.get(check.id);
  if (ancla === undefined) return undefined;
  if (invocaciones === 0) {
    return {
      ...ancla,
      texto: "",
      noLeida: "no se invocó ningún skill, así que no hay sección que leer",
    };
  }
  const texto = contexto.leerSeccion?.(ancla);
  if (texto !== undefined) return { ...ancla, texto };
  return {
    ...ancla,
    texto: "",
    noLeida: `la sección no se encontró en el árbol medido de \`${ancla.skill}\``,
  };
}

/** Las líneas de la sección, recortadas a un bloque legible. */
const MAX_LINEAS_DE_SECCION = 12;

function bloqueDeSeccion(seccion: SeccionDelSkill): string[] {
  const titulo = `**Sección del skill:** \`${seccion.skill}\` → «${seccion.seccion}»`;
  if (seccion.noLeida !== undefined) {
    return [titulo, `_No se cita el texto: ${seccion.noLeida}._`];
  }
  const lineas = seccion.texto.split(/\r?\n/);
  const recortadas = lineas.slice(0, MAX_LINEAS_DE_SECCION);
  const resto = lineas.length - recortadas.length;
  return [
    titulo,
    "",
    "```markdown",
    ...recortadas,
    ...(resto > 0 ? [`… (${resto} línea/s más en la sección)`] : []),
    "```",
  ];
}

/**
 * El bloque de una Ejecución: qué entregó, por dónde fue el Flujo, cómo acabó y,
 * por cada Check, ✓/✗ con su aserción, la línea que lo tumba y la sección.
 */
function renderEjecucion(
  ejecucion: ResultadoEjecucion,
  indice: number,
  contexto: ContextoDelCaso,
): string[] {
  const lineas: string[] = [];
  const ficheros = artefactosEntregados(ejecucion);
  lineas.push(
    `### Ejecución ${indice} — ${ejecucion.grade} · ${estadoDeEjecucion(ejecucion)}`,
    "",
    `- **Artefactos entregados:** ${
      ficheros.length === 0 ? "ninguno" : ficheros.map((f) => `\`${f}\``).join(", ")
    }`,
    `- **Flujo observado:** ${
      ejecucion.flujoObservado.length === 0
        ? "— (no invocó ningún skill)"
        : ejecucion.flujoObservado.map((p) => `\`${p}\``).join(" → ")
    }`,
    `- **Exit code:** \`${ejecucion.exitCode}\``,
  );
  if (ejecucion.ultimoPasoDelFlujo !== null) {
    lineas.push(`- **Último paso del Flujo:** \`${ejecucion.ultimoPasoDelFlujo}\``);
  }

  if (esHallazgoDeTrigger(ejecucion)) {
    lineas.push(
      "",
      "> **Hallazgo de trigger:** entregó un Artefacto EXCELENTE **sin invocar el skill**.",
      "> Es un hecho del Flujo (la `description`/frontmatter del skill no lo disparó),",
      "> no un juicio del Grade: el veredicto del Caso no cuenta esta Ejecución como dato.",
    );
  }

  if (ejecucion.detalle.length === 0) {
    lineas.push("", "_Sin Checks evaluados: no hubo Evidencia que graduar._");
    return lineas;
  }

  lineas.push("");
  for (const check of ejecucion.detalle) {
    lineas.push(
      `- ${check.passed ? "✓" : "✗"} **${check.id}** (${check.severity})`,
    );
    if (check.passed) continue;

    const traza: TrazaCheck | undefined =
      check.assert === undefined ? undefined : trazaDeAssert(check.assert);
    lineas.push(
      `  - Exige: ${traza?.exige ?? "_la Ejecución no trae la aserción (anterior al ticket 06)_"}`,
    );
    lineas.push(`  - Tumba: ${traza?.tumba ?? "_desconocido: no hay aserción que leer_"}`);

    if (esDelFlujo(check)) {
      // El Check del Flujo no tiene línea de artefacto: lo que se cita es el Flujo.
      lineas.push(
        `  - Línea del artefacto: — el Check mira el Flujo, no el artefacto (` +
          `${ejecucion.flujoObservado.length === 0 ? "ningún paso" : ejecucion.flujoObservado.join(" → ")})`,
      );
    } else {
      const texto = textoDelArtefacto(ejecucion);
      const cita = citar(texto, check.assert);
      if (cita.lineas.length > 0) {
        lineas.push("  - Línea del artefacto:");
        for (const linea of citaDeLineas(ficheros, cita.lineas)) lineas.push(`  ${linea}`);
      } else {
        lineas.push(
          "  - Línea del artefacto: — no hay línea que citar: el Check falla por " +
            "**ausencia** de lo que exige, no por un texto que esté ahí.",
        );
        if (cita.ausencia.ancla !== undefined) {
          lineas.push("", "    Donde debería estar:");
          for (const linea of citaDeLineas(ficheros, [cita.ausencia.ancla])) {
            lineas.push(`    ${linea}`);
          }
        }
      }
    }

    const seccion = seccionDe(check, contexto, ejecucion.flujoObservado.length);
    lineas.push("");
    if (seccion === undefined) {
      lineas.push(
        "  - Sección del skill: — el Check no declara de qué sección depende " +
          "(es del Framework o el Caso no la nombra en su `rubric.md`).",
      );
    } else {
      for (const linea of bloqueDeSeccion(seccion)) {
        lineas.push(`  ${linea}`.trimEnd());
      }
    }
  }
  return lineas;
}

/**
 * El bloque de cabecera de las contradicciones declaradas (ticket 13): por cada
 * Check que el `rubric.md` declara en desacuerdo con una sección de un skill, el
 * Check, el skill que contradice, su sección y lo que dice.
 *
 * Va en la **cabecera** y no enterrado bajo el Check fallido: es un hecho sobre el
 * skill que no depende de que la corrida haya medido bien, y quien lee sólo la
 * cabecera tiene que verlo. Presenta; no decide si se cambia el skill o el Check.
 */
function bloqueDeContradicciones(
  contradicciones: ReadonlyMap<string, ContradiccionDeSkill>,
): string[] {
  if (contradicciones.size === 0) return [];
  const lineas: string[] = [
    "> **El skill contradice este Check:** la rúbrica declara que una sección del skill",
    "> recomienda lo contrario de lo que exige el Check. No es un suspenso ni un fallo del",
    "> agente, y no cambia el veredicto: el Check sigue midiendo lo que mide, y la",
    "> contradicción se presenta para que se decida si cambia el skill o el Check.",
    "",
  ];
  for (const [id, contradiccion] of contradicciones) {
    lineas.push(
      `- \`${id}\` — el skill \`${contradiccion.skill}\` → «${contradiccion.seccion}» ` +
        `dice: ${contradiccion.texto}`,
    );
  }
  lineas.push("");
  return lineas;
}

/**
 * El informe completo de un Caso: cabecera (prompt, artefactos, Flujo, exit code
 * y por cada Check ✓/✗ con la línea que falla) y un bloque por Ejecución.
 *
 * `ejecuciones` son **todas** las del Caso, incluidas las que no alcanzaron el
 * skill: el veredicto las descarta como dato, pero el informe las presenta, que
 * es justo lo que el scorecard no puede hacer. Si no hay ninguna, el informe lo
 * dice en vez de renderizar una cabecera vacía.
 */
export function renderInformeCaso(
  ejecuciones: ResultadoEjecucion[],
  contexto: ContextoDelCaso,
): string {
  const lineas: string[] = [];
  const primera = ejecuciones[0];
  const skill = primera?.skill ?? "(skill desconocido)";
  const caso = primera?.caso ?? contexto.caso;
  lineas.push(`# Informe — ${skill}/${caso}`, "");

  // La contradicción declarada con el skill es de la rúbrica, no de la corrida: va
  // justo bajo el H1, antes de todo lo que la corrida mida (ticket 13).
  lineas.push(...bloqueDeContradicciones(contexto.contradicciones ?? new Map()));

  // El hallazgo de trigger va **lo alto del informe**, antes que nada: es la
  // única cosa que el veredicto descarta a propósito y la que el mantenedor no
  // puede perder (ticket 07). Se nombra la Ejecución y su Evidencia, para que la
  // afirmación se pueda comprobar sin creerla.
  const triggers = ejecuciones
    .map((e, i) => ({ ejecucion: e, numero: i + 1 }))
    .filter(({ ejecucion }) => esHallazgoDeTrigger(ejecucion));
  if (triggers.length > 0) {
    lineas.push(
      "> **Hallazgo de trigger:** hay Ejecuciones que entregaron un Artefacto EXCELENTE" +
        " **sin invocar el skill**.",
      "> No cuentan para el veredicto del Caso (ADR-0007: no midieron el skill), y eso es" +
        " la política correcta,",
      "> pero sí dicen algo del skill: su `description`/frontmatter no lo disparó. Se" +
        " arregla en el frontmatter, no en los Checks.",
      "",
    );
    for (const { ejecucion, numero } of triggers) {
      const artefactos = artefactosEntregados(ejecucion);
      lineas.push(
        `- **Ejecución ${numero}** — \`${ejecucion.grade}\`, Flujo \`` +
          `${ejecucion.flujoObservado.join(" → ") || "—"}\`, entregó ` +
          `${artefactos.length === 0 ? "un Artefacto" : artefactos.map((f) => `\`${f}\``).join(", ")}` +
          `${ejecucion.evidencia === undefined ? "" : ` — Evidencia: \`${ejecucion.evidencia}\``}`,
      );
    }
    lineas.push("");
  }

  // La cabecera resume lo que una ojeada necesita: qué se pidió y cómo acabó cada
  // Ejecución. Es el «lado a lado» a nivel de Caso; el detalle va por Ejecución.
  lineas.push(`- **Prompt:** ${contexto.prompt?.trim() ?? "_no disponible_"}`, "");
  lineas.push("| Ejecución | Grade | Entrega | Flujo | Exit | Checks ✗ |");
  lineas.push("|---|---|---|---|---|---|");
  ejecuciones.forEach((e, i) => {
    const fallos = e.detalle.filter((d) => !d.passed).map((d) => d.id);
    lineas.push(
      `| ${i + 1} | ${e.grade} | ${e.entrega} | ${e.flujoObservado.join(" → ") || "—"} | ` +
        `${e.exitCode} | ${fallos.length === 0 ? "—" : fallos.join(", ")} |`,
    );
  });

  if (ejecuciones.length === 0) {
    lineas.push("", "_Sin Ejecuciones: no hay nada que presentar._");
    return lineas.join("\n");
  }

  const artefactos = [...new Set(ejecuciones.flatMap(artefactosEntregados))];
  lineas.push(
    "",
    `**Artefactos entregados:** ${
      artefactos.length === 0 ? "ninguno" : artefactos.map((f) => `\`${f}\``).join(", ")
    }`,
    "",
    "Por cada Check, la aserción que falla, la línea que la tumba y la sección del",
    "skill de la que el Caso dice depender. Este informe **presenta; no adivina**:",
    "si el rojo es del skill o del check lo decide quien lo lee. Su `rubric.md`",
    "declara toda contradicción conocida entre un Check y una sección del skill;",
    "esas salen en la cabecera, y el informe no decide cuál de los dos cambia.",
  );

  ejecuciones.forEach((ejecucion, i) => {
    lineas.push("", ...renderEjecucion(ejecucion, i + 1, contexto));
  });

  return lineas.join("\n");
}
