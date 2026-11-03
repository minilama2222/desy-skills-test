import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  cabeceraDeLegado,
  descripcionDelFolio,
  esLegado,
  hechosDeLaEjecucion,
  medidaDeLegado,
  pinDe,
  tasaDeEntrega,
  type CabeceraDeLegado,
  type ContextoDeArchivo,
  type HechosDeLaEjecucion,
  type Medida,
  type ReglaDeMedida,
  type TasaDeEntrega,
} from "../src/legado.js";
import { REPO_ROOT } from "../src/repo.js";

/**
 * Archivado del legado (ticket 10 del bucle de refinamiento): copia la evidencia
 * anterior a la regla del ticket 01 a `reports/legado/`, con una cabecera
 * `LEGADO.md` por corrida y otra al lado de cada fichero, que dicen con qué
 * regla se midió.
 *
 * Se corre **una vez**, a mano —`npm run archivar-legado`—: lo archivado se
 * commitea y no se vuelve a generar (el origen está en `reports/`, ignorado, y
 * la suite lo vacía). Volver a correrlo sobre el mismo árbol pisa lo archivado
 * con una copia idéntica del origen; el `README.md` del archivo no se toca.
 *
 * Regla de privacidad heredada de `scorecardDeVersion` (ADR-0016): un Pin
 * **local** lleva la ruta del checkout del mantenedor en `repo` (ADR-0015), y lo
 * que se versiona no lleva la ruta de nadie. Por eso la cabecera copia el
 * **hecho** (`ref`, `commit`, `fecha`) y nunca `repo`.
 */

/** Qué regla se usó para la corrida del 27/10, la del ticket 01 aún sin aplicar. */
const REGLA_ADR_0007 = {
  nombre: "ADR-0007",
  que:
    "El veredicto de un Caso se calcula sobre las Ejecuciones que **alcanzaron el skill** " +
    "(`flujoAlcanzoSkill: true`). Las que lo alcanzaron y no entregaron no se separaban: " +
    "contaban como dato y condenaban el Caso.",
  entregaCero: "**SUSPENDE**",
  adr: "docs/adr/0007-politica-de-n-ejecuciones.md",
};

/**
 * Qué regla se usó en el experimento del 22/10. **La misma que el ADR-0007**, y
 * por eso es el mismo texto: `scripts/experimento-estabilidad.ts` lo dice en su
 * línea 118 y su veredicto descarta las Ejecuciones que no alcanzaron el skill y
 * llama SUSPENDE a un Caso que llegó y no entregó. (`conDato.length === 0` era
 * INDETERMINADO, que es **otro** hecho: *ninguna llegó al skill*, no «ninguna
 * entregó».) La diferencia con la regla de hoy es la que importa: las que
 * llegaron y no entregaron **contaban como dato**.
 */
const REGLA_EXPERIMENTO = REGLA_ADR_0007;

/**
 * Las dos corridas que conserva el archivo, con su nombre definitivo. Una
 * corrida no se archiva sin su regla: sin regla no es legado.
 *
 * El nombre lleva la fecha de la **corrida**, no la de hoy: en `reports/` no hay
 * ninguna, y es el único dato que las separa.
 *
 * `expedientes` son los ficheros de la corrida que **no se archivan**, declarados
 * a propósito para que su ausencia no parezca un olvido: el `veredicto.json` del
 * experimento no es un folio (no tiene Pin ni casos por Skill) y su medida ya la
 * da el `resumen.json` de la misma corrida. La cabecera de la corrida lo dice.
 */
export const CORRIDAS_ARCHIVADAS: readonly {
  dir: string;
  origen: string;
  fecha: string;
  regla: ReglaDeMedida;
  expedientes: readonly string[];
}[] = [
  {
    dir: "suite-2026-10-27",
    origen: "suite",
    fecha: "2026-10-27",
    regla: REGLA_ADR_0007,
    expedientes: [],
  },
  {
    dir: "estabilidad-2026-10-22",
    origen: "estabilidad-v2",
    fecha: "2026-10-22",
    regla: REGLA_EXPERIMENTO,
    expedientes: ["veredicto.json"],
  },
];

/** El Pin en una línea de la cabecera, con lo que se puede afirmar de él. */
export function pinEnTexto(cabecera: CabeceraDeLegado): string {
  const pin = cabecera.pin;
  if (pin.estado === "desconocido") return "no declarado";
  const hechos = [pin.ref ?? null, pin.commit ?? null, pin.fecha ?? null]
    .filter((h): h is string => h !== null)
    .join(" · ");
  return pin.estado === "comprobado"
    ? `${hechos} (comprobado)`
    : `${hechos} — **declarado** por la corrida, no comprobado contra el árbol medido`;
}

/**
 * La cabecera en Markdown de una corrida, la de su artefacto principal (el
 * Scorecard; si no lo hay, el resumen; y sin ninguno de los dos, la captura en
 * prosa que conserva la evidencia). La tasa de entrega va aparte porque la
 * trae el resumen, aunque el principal sea otro fichero.
 */
export function renderCabecera(
  cabecera: CabeceraDeLegado,
  medidas: Medida[],
  copiados: string[] = [],
  noCopiados: readonly string[] = [],
  tasa?: TasaDeEntrega,
  hechos?: HechosDeLaEjecucion,
): string {
  const regla = cabecera.regla;
  if (regla === undefined) {
    throw new Error(`«${cabecera.origen}» no declara con qué regla se midió: sin regla no es legado.`);
  }

  const lineas: string[] = [
    `# Legado — ${cabecera.origen}`,
    "",
    "> **Este directorio no se compara.** Se midió con otra regla y no es un Scorecard de",
    "> versión: `npm run diff-versiones` no lo lee, y compararlo con una Versión de skills de",
    "> hoy es comparar dos medidas que no dicen lo mismo (ticket 10).",
    "",
    `- origen: \`${cabecera.origen}\``,
    ...(copiados.length === 0 ? [] : [`- copiado de: ${copiados.map((f) => `\`${f}\``).join(", ")}`]),
    `- fecha de la corrida: ${cabecera.fecha}`,
    `- qué es: ${descripcionDelFolio(cabecera.folio)}`,
    `- regla de medida: **${regla.nombre}**` +
      (regla.adr === null
        ? " (una lectura en línea; nunca fue una decisión escrita)"
        : ` — \`${regla.adr}\``),
    `- Pin: ${pinEnTexto(cabecera)}`,
    "",
    "## Con qué regla se midió",
    "",
    regla.que,
    "",
    `Entonces, un Caso que alcanzó el skill y **no entregó nada** era ${regla.entregaCero}.`,
    "Y **ninguna** Ejecución alcanzó el skill era INDETERMINADO: sin dato, no había juicio.",
    "",
  ];

  // Qué contiene **este** fichero, dicho de él: la sección sobre el SUSPENDE sólo
  // tiene sentido si el fichero trae veredictos. El de una captura o una
  // Ejecución no los trae, y decir «su SUSPENDE» de él sería hablar de otro.
  if (medidas.length > 0) {
    const veredictos = [...new Set(medidas.map((m) => m.veredicto))].join(", ");
    lineas.push(
      "## Lo que significan sus veredictos",
      "",
      `Este fichero trae ${medidas.length} Caso/s con veredicto: ${veredictos}.`,
      "",
      "**No** significan lo que significaría hoy un SUSPENDE. Con la regla del ticket 01, un",
      "Caso en el que **ninguna** Ejecución entregó es **INDETERMINADO**, no SUSPENDE: no hay",
      "nada que graduar, y llamarlo suspenso fabrica un rojo del skill que no lo es (ADR-0014).",
      "",
      "Leer un SUSPENDE de aquí y tomarlo por un juicio del skill es el error que este archivo",
      "existe para no repetir: lo que dice es «las Ejecuciones que llegaron no acertaron», no",
      "«el skill está mal». La tasa de entrega que lo sostiene está en el `LEGADO.md` de la",
      "corrida.",
      "",
    );
  } else if (hechos !== undefined) {
    lineas.push(
      "## Qué hizo esta Ejecución",
      "",
      `- Skill y Caso: \`${hechos.skill}/${hechos.caso}\``,
      `- Grade: **${hechos.grade}**`,
      ...(hechos.entrega === undefined ? [] : [`- Entrega: \`${hechos.entrega}\``]),
      ...(hechos.alcanzoElSkill === undefined
        ? []
        : [`- Alcanzó el skill: ${hechos.alcanzoElSkill ? "sí" : "no"}`]),
      "",
      "Es **una** Ejecución: no tiene veredicto de Caso. El Veredicto de un Caso lo agrega el",
      "scorecard sobre todas sus Ejecuciones, y aquí no hay ninguno que agregar.",
      "",
    );
  } else {
    lineas.push(
      "## Qué es",
      "",
      "Este fichero no trae veredictos ni la medida de una Ejecución: es la evidencia en la que",
      "se apoyó un HALLAZGO. No tiene SUSPENDE del que hablar; su valor es el contenido tal",
      "cual, que se copió sin tocar.",
      "",
    );
  }

  if (medidas.length > 0) {
    lineas.push(
      "## Casos, como se guardaron",
      "",
      "| Caso | Veredicto | entregas | intentos | correctas | entregó mal | sin entregar |",
      "|---|---|---|---|---|---|---|",
    );
    for (const m of medidas) {
      lineas.push(
        `| ${m.caso} | ${m.veredicto} | ${m.entregas ?? "—"} | ${m.intentos} | ` +
          `${m.correctas} | ${m.entregoMal} | ${m.sinArtefacto} |`,
      );
    }
    lineas.push(
      "",
      "La columna `entregas` sale `—` cuando el fichero no las guardó: este Scorecard es",
      "anterior al ticket 03, que separó entregas de intentos. Un `0` ahí diría «no entregó»,",
      "y no es cierto.",
      "",
    );
  }

  if (tasa !== undefined) {
    lineas.push(
      "## La tasa de entrega que se midió",
      "",
      `**${tasa.conArtefacto} de ${tasa.ejecuciones}** Ejecuciones entregaron Artefacto; ` +
        `${tasa.alcanzaronSkill} de ${tasa.ejecuciones} alcanzaron el skill.`,
      "",
      "Es el número que sostiene la regla nueva. El veredicto del Caso de esta corrida, con",
      "esta regla y con esta tasa, dependerá de si alguna de las que entregaron acertó: el",
      "`resumen.json` de este directorio lo dice Ejecución a Ejecución.",
      "",
    );
  } else if (medidas.length > 0) {
    // Una cabecera de un fichero suelto no lleva la cifra (vive en la de su
    // corrida): decirlo es mejor que dejar al lector buscando «abajo».
    lineas.push(
      "La tasa de entrega de la corrida está en el `LEGADO.md` de su directorio.",
      "",
    );
  }

  lineas.push(
    "## Qué se conserva y qué no",
    "",
    "Se conserva el **porqué** del bucle de refinamiento —los dos HALLAZGOS y la tasa de",
    "entrega que se midió—; sus diagnósticos están en",
    "`.scratch/desy-skills-test-harness/issues/HALLAZGO-*.md`, que no se copian aquí. Lo que",
    "se copia es la **evidencia** de esta corrida. No se conserva el **qué**: los veredictos",
    "viejos como si fueran una línea base. La línea base arranca vacía en la primera corrida",
    "con la regla nueva (`reports/versiones/`).",
  );
  if (noCopiados.length > 0) {
    lineas.push(
      "",
      "No se copia " +
        noCopiados.map((f) => `\`${f}\``).join(", ") +
        ": no es un folio del archivo —no tiene Pin ni caso por Skill—, y su medida ya la",
      "da el `resumen.json` de la misma corrida. Se queda en `reports/`, que está ignorado.",
    );
  }
  return lineas.join("\n") + "\n";
}

/**
 * La cabecera de **un** fichero archivado: parsea si es JSON, exige que sea
 * legado y devuelve el Markdown. Lo que no es legado se rechaza aquí, no se
 * archiva con una cabecera a medias.
 */
export function cabeceraDeArchivo(
  contenido: string,
  contexto: ContextoDeArchivo,
): {
  cabecera: CabeceraDeLegado;
  markdown: string;
  medidas: Medida[];
  tasa?: TasaDeEntrega;
  hechos?: HechosDeLaEjecucion;
} {
  const raw = contexto.fichero.endsWith(".json") ? (JSON.parse(contenido) as unknown) : null;
  const cabecera = cabeceraDeLegado(raw, contexto);
  if (!esLegado(cabecera)) {
    throw new Error(
      `«${contexto.fichero}» no es legado (${descripcionDelFolio(cabecera.folio)}): ` +
        "sin un Pin conocido y una regla declarada no se archiva.",
    );
  }
  const medidas = medidaDeLegado(raw);
  const tasa = tasaDeEntrega(raw);
  const hechos = hechosDeLaEjecucion(raw);
  return {
    cabecera,
    markdown: renderCabecera(cabecera, medidas, [], [], tasa, hechos),
    medidas,
    ...(tasa === undefined ? {} : { tasa }),
    ...(hechos === undefined ? {} : { hechos }),
  };
}

/**
 * Los ficheros de una corrida que se copian, con su ruta relativa. Se copian los
 * JSON y los `.txt` (la fuente exacta del HALLAZGO es un `.txt`); los `.html` no:
 * el artefacto es output del SUT y se regenera, y lo que no se puede regenerar
 * es el **hecho** de que el guard leyó el artefacto equivocado.
 */
export function ficherosDeCorrida(corridaDir: string): string[] {
  if (!existsSync(corridaDir)) return [];
  const encontrados: string[] = [];
  const visitar = (actual: string, prefijo: string): void => {
    for (const entry of readdirSync(actual, { withFileTypes: true })) {
      const rel = prefijo === "" ? entry.name : `${prefijo}/${entry.name}`;
      if (entry.isDirectory()) {
        visitar(join(actual, entry.name), rel);
      } else if (/\.(json|txt)$/.test(entry.name)) {
        encontrados.push(rel);
      }
    }
  };
  visitar(corridaDir, "");
  return encontrados.sort();
}

/**
 * El archivado de **una** corrida, sobre el árbol real: copia cada fichero de
 * `<reportsDir>/<origen>` a `<legadoDir>/<dir>`, escribe la cabecera de la
 * corrida (`LEGADO.md`) y una cabecera al lado de cada JSON (`<f>.LEGADO.md`),
 * para que quien abra un fichero suelto no tenga que buscar el README.
 *
 * Antes de copiar nada, comprueba **toda** la corrida: si a un solo fichero le
 * falta el Pin o la regla, la corrida entera se niega. Lo que quedó a medias es
 * peor que nada —un archivo con `LEGADO.md` y sin los ficheros que dice tener—, y
 * el script se corre a mano, una vez, no en un bucle donde medio archivo sirva.
 *
 * Devuelve lo escrito, para que el script lo anuncie.
 */
export function archivarCorrida(
  corrida: (typeof CORRIDAS_ARCHIVADAS)[number],
  reportsDir: string,
  legadoDir: string,
): string[] {
  const origen = join(reportsDir, corrida.origen);
  const ficheros = ficherosDeCorrida(origen).filter(
    (rel) => !corrida.expedientes.includes(rel),
  );
  if (ficheros.length === 0) {
    throw new Error(
      `No hay nada que archivar de «${corrida.origen}» en ${reportsDir}: ¿ya se movió? ` +
        "El archivo no inventa una corrida que no está.",
    );
  }

  const contenidos = new Map(ficheros.map((rel) => [rel, readFileSync(join(origen, rel), "utf8")]));

  // El Pin de la corrida lo fija su artefacto principal (el Scorecard, o el que
  // mida): es el que declara de qué versión habla la corrida entera. Los folios
  // que no lo llevan (la captura en prosa, el resumen por Ejecución) lo heredan;
  // cubrir el hueco con el primer fichero por orden de nombre dependería del
  // orden del directorio, que no significa nada.
  const pinDeLaCorrida = (() => {
    for (const candidato of ["scorecard.json", "ejecucion-1.json", "resumen.json"]) {
      const contenido = contenidos.get(candidato);
      if (contenido === undefined) continue;
      const pin = pinDe(JSON.parse(contenido) as unknown);
      if (Object.keys(pin).length > 0) return pin;
    }
    return undefined;
  })();

  const marcados = ficheros.map((rel) => ({
    rel,
    marcado: cabeceraDeArchivo(contenidos.get(rel)!, {
      origen: `reports/${corrida.origen}/${rel}`,
      fichero: rel,
      fecha: corrida.fecha,
      regla: corrida.regla,
      ...(pinDeLaCorrida === undefined ? {} : { pinDeLaCorrida }),
    }),
  }));

  // La cabecera de la corrida cuenta lo que la **mide**. El Scorecard si lo hay,
  // y si no el resumen por Ejecución. Sin ninguno de los dos (un experimento), el
  // principal es la captura en prosa: es la evidencia del HALLAZGO, y sin ella el
  // archivo es un resumen. Las Ejecuciones sueltas van las últimas: su cabecera
  // individual ya dice lo suyo.
  const principal =
    marcados.find((m) => m.marcado.cabecera.folio === "scorecard") ??
    marcados.find(
      (m) => m.marcado.cabecera.folio === "resumen" && m.marcado.medidas.length > 0,
    ) ??
    marcados.find((m) => m.marcado.medidas.length > 0) ??
    marcados.find((m) => m.marcado.cabecera.folio === "texto") ??
    marcados[0]!;

  const salida = join(legadoDir, corrida.dir);
  const escritos: string[] = [];
  for (const { rel, marcado } of marcados) {
    const destino = join(salida, rel);
    mkdirSync(dirname(destino), { recursive: true });
    copyFileSync(join(origen, rel), destino);
    const cabeceraDeFichero = join(salida, `${rel}.LEGADO.md`);
    mkdirSync(dirname(cabeceraDeFichero), { recursive: true });
    writeFileSync(cabeceraDeFichero, marcado.markdown, "utf8");
    escritos.push(destino, cabeceraDeFichero);
  }

  const cabecera = join(salida, "LEGADO.md");
  const copiados = ficheros.map((rel) => `reports/${corrida.origen}/${rel}`);
  writeFileSync(
    cabecera,
    renderCabecera(
      principal.marcado.cabecera,
      principal.marcado.medidas,
      copiados,
      corrida.expedientes,
      // La tasa sale del archivo que la lleve en la corrida: el resumen por
      // Ejecución, o un Scorecard si alguna vez la trajera. Es el dato que
      // explica el SUSPENDE, así que no se pierde si el principal no la tiene.
      marcados.find((m) => m.marcado.tasa !== undefined)?.marcado.tasa,
      principal.marcado.hechos,
    ),
    "utf8",
  );
  escritos.push(cabecera);
  return escritos;
}

/**
 * `npm run archivar-legado`: archiva las corridas de `CORRIDAS_ARCHIVADAS` desde
 * `reports/` del repo. Falla en cuanto una no está —el archivo no inventa una
 * corrida— y no hace nada a medias: el primer error sale antes de copiar nada de
 * la siguiente.
 */
export function main(
  reportsDir: string = join(REPO_ROOT, "reports"),
  legadoDir: string = join(REPO_ROOT, "reports", "legado"),
  log: (linea: string) => void = console.log,
): void {
  for (const corrida of CORRIDAS_ARCHIVADAS) {
    const escritos = archivarCorrida(corrida, reportsDir, legadoDir);
    log(
      `${corrida.dir}: ${escritos.filter((f) => f.endsWith(".LEGADO.md")).length} cabecera/s, ` +
        `${escritos.filter((f) => !f.endsWith(".LEGADO.md")).length} fichero/s archivado/s.`,
    );
  }
}

// La guarda permite importar el módulo (los tests) sin archivar nada.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
