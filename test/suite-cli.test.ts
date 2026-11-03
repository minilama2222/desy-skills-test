import { describe, expect, it } from "vitest";
import { spawnSync, execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { REPO_ROOT } from "../src/repo.js";
import { readPin } from "../src/pin.js";
import { leerEjecuciones, VERSIONES_DIR } from "../src/reportes.js";
import type { ResultadoEjecucion } from "../src/ejecutar.js";
import type { Scorecard } from "../src/scorecard.js";
import type { ScorecardDeVersion } from "../src/versiones.js";

/**
 * Aceptación del comando de CI (ticket 13): corre la CLI **de verdad**, como la
 * correría un pipeline, porque lo que el ticket pide —el exit code del proceso,
 * el JSON + Scorecard en disco, el subconjunto por skill/Caso y el Pin
 * declarado— no lo deja medir un seam puro.
 *
 * El SUT (`opencode`) se sustituye por un guion: el camino es el real (sandbox,
 * copia de los skills del Pin, `opencode run`, captura de artefactos, grader,
 * agregado) salvo el binario externo, que un test no puede tener. Lo único que
 * fija el guion es la **entrega de cada Ejecución**, por índice en una lista.
 *
 * Cómo se sustituye, y por qué así: jugar con el `PATH` no sirve en Windows.
 * `spawn` sólo mira la clave **`Path`** (un `PATH` inyectado se ignora en
 * silencio y responde el `opencode` real: todas las entregas buenas, exit 0 —así
 * falló el primer precommit—), un `.exe` del directorio gana a un `.cmd`, y un
 * `.cmd` por ruta absoluta **tampoco** lo lanza `spawn` sin `shell`. La vía
 * portable es inyectar un **preludio** (`--require` vía `NODE_OPTIONS`) que
 * envuelve `child_process.spawn`/`spawnSync` dentro de la suite: sólo se
 * intercepta el binario `opencode`, y se corre el guion con Node.
 *
 * El preludio es además el **guardarraíl contra el falso verde**: si el SUT falso
 * no se inyecta, el CLI llama al `opencode` real y el Caso PASA igualmente. Por
 * eso el guion deja una marca por Ejecución y el test comprueba que llegaron
 * todas: un verde sin esas marcas es un verde del test, no de la suite.
 */

/** El Caso que este test sabe graduar a mano (`implement-component/boton-primario`). */
const ENTREGAS: Record<string, string> = {
  /** El fuente correcto del Caso: macro, variante primaria y props del catálogo. */
  bueno: [
    '{% from "components/button/_macro.button.njk" import componentButton %}',
    "",
    "{{ componentButton({",
    '  "text": "Enviar",',
    '  "type": "submit",',
    '  "classes": "c-button--primary"',
    "}) }}",
  ].join("\n"),
  /** Aún entrega (y llegó al skill), pero sin el macro: los Guards lo hunden. */
  malo: '<button type="submit" class="c-button c-button--primary">Enviar</button>',
};

/** El artefacto del Caso: un fichero del `src/` del sandbox (ADR-0006). */
const ARTEFACTO = "boton.html";

/**
 * El guion del SUT falso (`cjs`, porque el repo es `"type": "module"`). Recibe
 * los mismos argumentos que `opencode run`; el sandbox es su `cwd`. El índice de
 * Ejecución vive junto al guion —persiste entre sandboxes— y la entrega sale de
 * la lista de `guion.json`.
 */
const GUION = `
const { existsSync, readFileSync, writeFileSync, mkdirSync } = require("node:fs");
const { join, dirname } = require("node:path");

const casa = dirname(process.argv[1]);
const marca = join(casa, ".entrega");
const indice = existsSync(marca) ? Number(readFileSync(marca, "utf8")) : 0;
writeFileSync(marca, String(indice + 1));

const { entregas, artefacto, contenido } = JSON.parse(readFileSync(join(casa, "guion.json"), "utf8"));
// Sin más entregas en la lista se repite la última, no se entrega por defecto: el
// bucle del presupuesto (ticket 03) reintenta hasta tener n entregas, así que un
// guion corto no puede cambiar lo que el SUT entrega a mitad de corrida — «nada»
// tiene que seguir siendo «nada» hasta el tope.
const entrega = entregas[Math.min(indice, entregas.length - 1)] ?? "nada";

// Marca de "el guion corrió esta Ejecución": la lee el test para no confundir un
// verde del test con un verde de la suite (ver la cabecera).
writeFileSync(join(casa, "visto-" + indice + ".txt"), entrega);

// El Flujo observado: preflight primero (Flujo canónico) y el skill del Caso.
// \`sin-skill\` es la Ejecución del 27/10: escribe el fichero sin invocar el skill
// (ticket 07), así que sólo se ve el Arranque.
process.stderr.write('\\u2192 Skill "desy-preflight-check"\\n');
if (entrega !== "sin-skill") {
  process.stderr.write('\\u2192 Skill "desy-implement-component"\\n');
}

// Lo que el SUT "ve" de skills en su HOME, para el test de --skills-local: lee el
// SKILL.md que el runner copió al sandbox y lo escribe por stdout, que es el canal
// del propio SUT. La ruta se toma del \`opencode.jsonc\` que el SUT obedece, no se
// reconstruye: reconstruirla en el test es cómo se coló un \`opencode/opencode\` que
// el propio SUT no usa (ADR-0015).
let vistoSkills = "(sin preflight local)";
try {
  const cfg = JSON.parse(readFileSync(join(String(process.env.XDG_CONFIG_HOME), "opencode.jsonc"), "utf8"));
  const declarado = cfg.skills[0];
  vistoSkills = readFileSync(join(declarado, "desy-preflight-check", "SKILL.md"), "utf8").trim();
} catch (e) {
  vistoSkills = "(sin preflight local) " + e.message;
}
process.stdout.write("skills-vistos=" + vistoSkills + "\\n");

if (entrega !== "nada") {
  mkdirSync("src", { recursive: true });
  const cual = entrega === "sin-skill" ? "bueno" : entrega;
  writeFileSync(join("src", artefacto), contenido[cual] ?? "");
}
`;

/**
 * El preludio: dentro del proceso de la suite, `spawn`/`spawnSync` de `opencode`
 * corren el guion con Node. Devuelve la misma forma que `spawnSync`
 * (`{ status, stdout, stderr }`), que es lo que el runner del SUT lee.
 */
const PRELUDIO = `
const cp = require("node:child_process");
const { join } = require("node:path");

const guion = join(__dirname, "opencode-falso.cjs");
const esOpencode = (cmd) => /(^|[\\\\/])opencode(\\.exe|\\.cmd)?$/i.test(String(cmd));

const spawnSyncOriginal = cp.spawnSync;
cp.spawnSync = function (cmd, args, opts) {
  if (!esOpencode(cmd)) return spawnSyncOriginal.call(this, cmd, args, opts);
  return spawnSyncOriginal.call(this, process.execPath, [guion, ...(args ?? [])], opts);
};
`;

interface Corrida {
  code: number;
  stdout: string;
  stderr: string;
  /** Cuánto tardó el proceso de la suite, en segundos (presupuesto del test). */
  segundos: number;
  /** La entrega que el guion recibió en cada Ejecución (probado en los tests). */
  vistas: string[];
  scorecard?: Scorecard;
  markdown?: string;
  /** El informe por Caso, tal como quedó en disco. */
  informe?: string;
  /** La versión que dejó la suite en `reports/versiones/<arbolHash>.json`, si la dejó. */
  version?: ScorecardDeVersion;
  /** El árbol temporal de la corrida, para leer sus Ejecuciones antes de borrarlo. */
  ejecuciones: ResultadoEjecucion[];
}

const TSX = join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");

/** La versión que dejó la suite para `arbolHash`, tal cual quedó en disco. */
function versionEnDisco(dir: string, arbolHash: string): ScorecardDeVersion | undefined {
  const path = join(dir, `${arbolHash}.json`);
  return existsSync(path)
    ? (JSON.parse(readFileSync(path, "utf8")) as ScorecardDeVersion)
    : undefined;
}

/**
 * Corre `src/cli.ts suite` con el SUT falso. `--reports` apunta a un directorio
 * temporal —nunca a `reports/suite` del repo— para no dejar rastro.
 */
async function correrSuite(args: string[], entregas: string[] = ["bueno"]): Promise<Corrida> {
  const dir = mkdtempSync(join(tmpdir(), "suite-cli-"));
  const versionsDirDeLaCorrida = join(dir, "versiones");
  try {
    writeFileSync(join(dir, "opencode-falso.cjs"), GUION, "utf8");
    writeFileSync(join(dir, "preludio.cjs"), PRELUDIO, "utf8");
    writeFileSync(
      join(dir, "guion.json"),
      JSON.stringify({ entregas, artefacto: ARTEFACTO, contenido: ENTREGAS }),
      "utf8",
    );

    const env = {
      ...process.env,
      // `NODE_OPTIONS` parsea comillas y barras: la ruta va con `/` o Windows
      // se come los `\` y Node no encuentra el preludio.
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require "${join(dir, "preludio.cjs").replace(/\\/g, "/")}"`.trim(),
      // Las versiones de esta corrida, en el temporal: el test no escribe en el
      // `reports/versiones/` que se versiona (ticket 09).
      DESY_VERSIONES_DIR: versionsDirDeLaCorrida,
    };
    const reports = join(dir, "reports");
    const inicio = Date.now();
    const r = spawnSync(
      process.execPath,
      [TSX, "src/cli.ts", "suite", ...resolverRutasDeCheckout(args, dir), "--reports", reports],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env,
      },
    );
    const segundos = Math.round((Date.now() - inicio) / 1000);

    const json = join(reports, "scorecard.json");
    const md = join(reports, "scorecard.md");
    const informe = join(reports, "informe", "implement-component", "boton-primario.md");
    // Las marcas del guion **son** los intentos hechos: con el presupuesto de
    // entregas (ticket 03) la lista de entregas ya no dice cuántos hubo — un
    // «nada» se reintenta hasta el tope—, así que se leen del disco en vez de
    // suponer una por entrada de la lista.
    const vistas: string[] = [];
    for (let i = 0; existsSync(join(dir, `visto-${i}.txt`)); i++) {
      vistas.push(readFileSync(join(dir, `visto-${i}.txt`), "utf8").trim());
    }
    // Las Ejecuciones se leen antes del `finally`: el test necesita la salida
    // cruda del SUT (`salida.stdout`), no sólo el agregado.
    const ejecuciones = leerEjecuciones(join(reports, "ejecuciones"));
    const version =
      existsSync(json) && (JSON.parse(readFileSync(json, "utf8")) as Scorecard).arbolHash !== undefined
        ? versionEnDisco(
            versionsDirDeLaCorrida,
            (JSON.parse(readFileSync(json, "utf8")) as Scorecard).arbolHash!,
          )
        : undefined;
    return {
      code: r.status ?? -1,
      stdout: r.stdout ?? "",
      stderr: r.stderr ?? "",
      segundos,
      vistas,
      ejecuciones,
      ...(existsSync(json) ? { scorecard: JSON.parse(readFileSync(json, "utf8")) as Scorecard } : {}),
      ...(existsSync(md) ? { markdown: readFileSync(md, "utf8") } : {}),
      ...(existsSync(informe) ? { informe: readFileSync(informe, "utf8") } : {}),
      ...(version === undefined ? {} : { version }),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const pin = readPin(join(REPO_ROOT, "pin.json"));
const BOTON = ["--skill", "implement-component", "--case", "boton-primario"];

/** El `SKILL.md` del checkout limpio: el guion del SUT lo lee de su HOME y lo dice. */
const MARCA_LOCAL = "mi-desy-skills-42";

/**
 * Presupuesto de tiempo por **intento**. No es un adorno: la copia del starter
 * al sandbox (~85 MB / 5.260 ficheros, ver `SandboxOptions.scaffoldDir`) domina
 * el coste, y una regresión ahí infla el CI en silencio — pasó en la primera
 * versión de este test, que tardaba 4× más y nadie lo notaba. Medido: ~19 s por
 * Ejecución con `robocopy` (antes ~66 s con `cpSync`). El techo deja aire para
 * una máquina cargada, pero no para volver al `cpSync`.
 *
 * Cuántos intentos entran en el techo lo dice `expectDentroDelPresupuesto`, que
 * los lee de la corrida: el número no se escribe a mano (ver allí el fallo que
 * costó el test del ticket 07).
 */
const SEGUNDOS_POR_EJECUCION = 35;

/**
 * El presupuesto de una corrida: `SEGUNDOS_POR_EJECUCION` por cada **intento que
 * de verdad ocurrió**. El número se lee de la corrida (`vistas`: una marca por
 * Ejecución del guion) y no se pasa a mano.
 *
 * Desde el ticket 03 el coste de un test es **variable**: con `--n 2` se corre
 * hasta tener 2 entregas o agotar el tope, así que una respuesta que no entrega
 * añade intentos. El test del hallazgo de trigger hacía 4 y declaraba `2` —el
 * número estaba en su propio comentario—, y sólo pasaba cuando el disco iba tan
 * rápido que 4 copias cabían en el techo de 2 (medido: 78 s contra 70 s).
 *
 * Leerlo de la corrida quita el desfase de raíz. Lo que el techo deja de vigilar
 * —que los intentos sean los debidos— lo fijan los `expect(corrida.vistas)`
 * de cada test, que es donde ese fallo se lee con un mensaje claro.
 */
function expectDentroDelPresupuesto(corrida: Corrida): void {
  const intentos = corrida.vistas.length;
  // Sin marcas no hubo Ejecuciones: el techo sería 0 y el fallo diría «tardó 3 s,
  // techo 0 s». Se dice lo que pasó, que es que el guion no corrió.
  expect(
    intentos,
    "el guion no dejó ninguna marca: la suite no llegó a correr una Ejecución",
  ).toBeGreaterThan(0);
  const techo = SEGUNDOS_POR_EJECUCION * intentos;
  expect(corrida.segundos, `la suite tardó ${corrida.segundos}s (techo ${techo}s)`).toBeLessThan(
    techo,
  );
}

describe("suite (comando de CI, ticket 13)", () => {
  it(
    "corre el subconjunto por Caso, emite JSON + Scorecard y sale con 0 si pasa",
    async () => {
      const corrida = await correrSuite([...BOTON, "--n", "1"]);

      // El guion corrió de verdad: sin esta marca, el verde sería del test.
      expect(corrida.vistas).toEqual(["bueno"]);
      expectDentroDelPresupuesto(corrida);
      expect(corrida.code).toBe(0);
      // El JSON es la fuente de verdad y declara siempre el Pin testeado.
      expect(corrida.scorecard?.pin.commit).toBe(pin.commit);
      expect(corrida.scorecard?.skills.map((s) => s.skill)).toEqual(["implement-component"]);
      expect(corrida.scorecard?.skills[0]?.casos.map((c) => c.veredicto)).toEqual(["PASA"]);
      // El Scorecard legible queda en disco y en stdout.
      expect(corrida.markdown).toContain(`Scorecard — Pin ${pin.commit}`);
      expect(corrida.stdout).toContain(`Scorecard — Pin ${pin.commit}`);
      // Y la corrida se versiona (ticket 09): el fichero de su `arbolHash` es el
      // scorecard con su identidad al lado.
      const hash = corrida.scorecard?.arbolHash;
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(corrida.version?.arbolHash).toBe(hash);
      expect(corrida.version?.skills).toEqual(corrida.scorecard?.skills);
      expect(corrida.version?.pin).toEqual({
        ref: pin.ref,
        commit: pin.commit,
        fecha: pin.fecha,
      });
    },
    180_000,
  );

  it(
    "sale con código ≠ 0 si alguna Ejecución alcanza el skill y ninguna es correcta",
    async () => {
      // N=3 con las tres entregas malas: el Caso SUSPENDE y el merge se bloquea.
      const corrida = await correrSuite([...BOTON, "--n", "3"], ["malo", "malo", "malo"]);

      expect(corrida.vistas).toEqual(["malo", "malo", "malo"]);
      expectDentroDelPresupuesto(corrida);
      expect(corrida.code, corrida.stderr).not.toBe(0);
      expect(corrida.scorecard?.skills[0]?.casos[0]?.veredicto).toBe("SUSPENDE");
      expect(corrida.stderr).toContain("SUSPENDIDO");
    },
    // ~26 s medido aislado; ~45 s con la batería entera compitiendo por el disco.
    // Los 180 s de antes dejaron pasar por una vez un rojo que no volvió a
    // reproducirse en tres corridas: el techo era el de la máquina, no el del
    // test, y un intermitente así no se puede diagnosticar (CODING_STANDARDS).
    180_000,
  );

  it(
    "sale con 0 y INDETERMINADO si los intentos no dan las N entregas (ADR-0014, ticket 03)",
    async () => {
      // Antes esto bloqueaba el merge sin decir nada del skill: el agente llegó
      // al skill y no escribió. Desde ADR-0014 no hay nada que graduar, así que
      // el Caso no juzga — pero tampoco pasa por medido: el scorecard lo dice.
      const corrida = await correrSuite([...BOTON, "--n", "3"], ["nada", "nada", "nada"]);

      // Pedir 3 entregas no es correr 3 veces: sin un solo Artefacto se agota el
      // tope duro —6 intentos, el doble de n— y ahí se para (ticket 03).
      expect(corrida.vistas).toEqual(["nada", "nada", "nada", "nada", "nada", "nada"]);
      expectDentroDelPresupuesto(corrida);
      expect(corrida.code).toBe(0);
      const caso = corrida.scorecard?.skills[0]?.casos[0];
      expect(caso?.veredicto).toBe("INDETERMINADO");
      expect(caso?.entregas).toBe(0);
      expect(caso?.intentos).toBe(6);
      expect(caso?.sinArtefacto).toBe(6);
      // Topó con 0 entregas: no es un verde, y el Scorecard lo dice con la
      // columna de entregas al lado de la de intentos.
    },
    180_000,
  );

  it(
    "basta con que una de las N Ejecuciones sea correcta (ADR-0007) y sale con 0",
    async () => {
      const corrida = await correrSuite([...BOTON, "--n", "3"], ["malo", "bueno", "nada"]);

      // n=3 son 3 **entregas**, no 3 intentos (ticket 03): el tercer intento no
      // entregó, así que el bucle sigue pidiendo intentos —y el guion, sin más
      // entregas en la lista, repite la última («nada»)— hasta agotar el tope
      // duro de 6. Las entregas cortan el bucle; el tope, la falta de ellas.
      expect(corrida.vistas).toEqual(["malo", "bueno", "nada", "nada", "nada", "nada"]);
      expectDentroDelPresupuesto(corrida);
      expect(corrida.code).toBe(0);
      const caso = corrida.scorecard?.skills[0]?.casos[0];
      expect(caso?.veredicto).toBe("PASA");
      // Las tres causas quedan contadas por separado y cuadran con el
      // denominador limpio: no entregó + correctas + entregó mal = intentos.
      expect(caso?.intentos).toBe(6);
      expect(caso?.entregas).toBe(2);
      expect(caso?.correctas).toBe(1);
      expect(caso?.entregoMal).toBe(1);
      expect(caso?.sinArtefacto).toBe(4);
    },
    180_000,
  );

  it(
    "un filtro que no casa con ningún Caso falla en vez de dar una suite vacía en verde",
    async () => {
      const corrida = await correrSuite(["--skill", "no-existe"]);

      expect(corrida.code).not.toBe(0);
      expect(corrida.stderr).toContain('No hay Casos para el skill "no-existe"');
      expect(corrida.scorecard).toBeUndefined();
    },
    60_000,
  );

  it(
    "destaca la entrega EXCELENTE sin invocar el skill, en el scorecard y en el informe (ticket 07)",
    async () => {
      // La corrida del 27/10: una Ejecución llega al skill y entrega mal, otra
      // entrega bien **sin invocar `implement-component`**. Recorrido completo
      // —sandbox, copia de skills, SUT falso, grader, persistencia— para fijar lo
      // que el CLI deja en disco: el hallazgo en lo alto del scorecard y del
      // informe, la Ejecución con su ruta de Evidencia, y el veredicto intacto.
      const corrida = await correrSuite([...BOTON, "--n", "2"], ["malo", "sin-skill"]);

      // La entrega sin skill no cierra el presupuesto de 2 entregas (ticket 03):
      // el guion se queda sin entregas y agota el tope de 4 intentos. Las dos
      // últimas no aportan entregas que el Caso pueda contar.
      expect(corrida.vistas).toEqual(["malo", "sin-skill", "sin-skill", "sin-skill"]);
      expectDentroDelPresupuesto(corrida);

      // El veredicto sigue descartándola como dato: entrega mala y nada más.
      const caso = corrida.scorecard?.skills[0]?.casos[0];
      expect(caso?.veredicto).toBe("SUSPENDE");
      expect(caso?.correctas).toBe(0);
      // Sólo la «malo» alcanzó `implement-component`: las `sin-skill` se quedan
      // en el preflight.
      expect(caso?.alcanzaronSkill).toBe(1);
      // Y la evidencia no se pierde: los tres intentos que entregaron sin invocar
      // el skill —el de la lista y los dos que el guion repitió hasta el tope— se
      // cuentan como hallazgo, cada uno con su Evidencia en disco.
      expect(caso?.hallazgosDeTrigger).toBe(3);
      expect(caso?.triggerConEvidencia).toBe(3);

      // Y la Ejecución dice de sí misma dónde se lee: la ruta se escribió en el
      // JSON al persistirla, no se reconstruyó al agregar.
      const tercera = corrida.ejecuciones[1]!;
      expect(tercera.evidencia).toMatch(
        /ejecuciones[\\/]implement-component[\\/]boton-primario[\\/]2\.json$/,
      );

      // En lo alto de los dos documentos, antes de ninguna tabla.
      const hallazgoMd = corrida.markdown!.indexOf("Hallazgo de trigger");
      const hallazgoInforme = corrida.informe!.indexOf("Hallazgo de trigger");
      expect(hallazgoMd).toBeGreaterThan(-1);
      expect(hallazgoMd).toBeLessThan(corrida.markdown!.indexOf("| Caso |"));
      expect(hallazgoInforme).toBeGreaterThan(-1);
      expect(hallazgoInforme).toBeLessThan(corrida.informe!.indexOf("| Ejecución |"));
      expect(corrida.informe).toContain(tercera.evidencia!.split("\\").join("/"));
    },
    180_000,
  );
});

/**
 * Los checkouts que usan los tests de `--skills-local`, dentro del directorio
 * temporal de la corrida: uno limpio, con una marca en el `SKILL.md` que el guion
 * del SUT lee de su HOME, y uno con ese `SKILL.md` editado sin commitear.
 */
function prepararCheckouts(dir: string): { limpio: string; sucio: string } {
  const crear = (nombre: string, contenido: string): string => {
    const repo = join(dir, nombre);
    mkdirSync(join(repo, "skills", "desy-preflight-check"), { recursive: true });
    writeFileSync(join(repo, "skills", "desy-preflight-check", "SKILL.md"), contenido, "utf8");
    const git = (...args: string[]): void => {
      execFileSync("git", args, { cwd: repo, stdio: "pipe" });
    };
    git("init", "--quiet");
    git("config", "user.email", "test@example.com");
    git("config", "user.name", "test");
    git("add", ".");
    git("commit", "--quiet", "-m", "checkout");
    return repo;
  };

  const limpio = crear("mi-desy-skills", MARCA_LOCAL);
  const sucio = crear("mi-desy-skills-sucio", "version commiteada");
  writeFileSync(
    join(sucio, "skills", "desy-preflight-check", "SKILL.md"),
    "editado a mano sin commitear",
    "utf8",
  );
  return { limpio, sucio };
}

/** El test nombra el checkout que quiere con un marcador; aquí se vuelve ruta. */
function resolverRutasDeCheckout(args: string[], dir: string): string[] {
  const { limpio, sucio } = prepararCheckouts(dir);
  return args.map((a) => a.replace("@CHECKOUT_LIMPIO@", limpio).replace("@CHECKOUT_SUCIO@", sucio));
}

/**
 * Ticket 05: un checkout local declarado. Lo único que este test fija y los demás
 * no pueden es el camino completo de `--skills-local` con un proceso real: que los
 * skills que el SUT ve salgan **de ese checkout** (el guion lo lee de su HOME), que
 * el scorecard diga `local (sin commit)` donde un Pin remoto diría un SHA, y que
 * `vendor/` no se toque.
 */
describe("suite --skills-local: un checkout local declarado (ticket 05)", () => {
  it(
    "mide los skills del checkout, lo declara como `local (sin commit)` y no toca vendor/",
    async () => {
      const antes = fingerprintDeVendor();
      const corrida = await correrSuite([...BOTON, "--n", "1", "--skills-local", "@CHECKOUT_LIMPIO@"]);

      expect(corrida.vistas).toEqual(["bueno"]);
      expectDentroDelPresupuesto(corrida);
      expect(corrida.code).toBe(0);

      // Ni un SHA: el Pin es local y así se lee en JSON, en el H1 y por consola.
      expect(corrida.scorecard?.pin.commit).toBe("local");
      expect(corrida.scorecard?.pin.commit).not.toMatch(/[0-9a-f]{7,40}/i);
      expect(corrida.markdown).toContain("Scorecard — Pin local (sin commit)");
      expect(corrida.stderr).toContain("sobre Pin local (sin commit)");

      // Lo medido se identifica por hash: sin commit, es lo que queda.
      expect(corrida.scorecard?.arbolHash).toMatch(/^[0-9a-f]{64}$/);

      // El SUT vio el checkout local, no `vendor/`: lo dijo por stdout y el
      // runner guarda la salida sin fusionar en la Ejecución.
      const ejecuciones = corrida.ejecuciones;
      expect(ejecuciones[0]?.salida.stdout).toContain(`skills-vistos=${MARCA_LOCAL}`);

      // Medir local nunca escribe en vendor/: mismo vistazo antes y después.
      expect(fingerprintDeVendor()).toEqual(antes);
    },
    180_000,
  );

  /**
   * Los demás tests de `--skills-local` no necesitan un SUT: el guion del SUT
   * falso (que abre sandbox y copia el starter) es el 90 % del coste, y lo que
   * estos casos fijan es la política del comando: negarse ante un árbol sucio o
   * una ruta inexistente, sin gastar una sola Ejecución.
   */
  it(
    "se niega a medir un checkout local sucio, igual que con vendor/ (ticket 04)",
    async () => {
      const corrida = await correrSuite([...BOTON, "--n", "1", "--skills-local", "@CHECKOUT_SUCIO@"]);

      expect(corrida.code).not.toBe(0);
      expect(corrida.stderr).toContain("sin commitear");
      expect(corrida.stderr).toContain("desy-preflight-check/SKILL.md");
      // Ni una Ejecución gastada: el guion no llegó a correr.
      expect(corrida.vistas).toEqual([]);
      expect(corrida.scorecard).toBeUndefined();
    },
    60_000,
  );

  it(
    "se niega a medir un checkout local sucio, igual que con vendor/ (ticket 04)",
    async () => {
      const corrida = await correrSuite([...BOTON, "--n", "1", "--skills-local", "@CHECKOUT_SUCIO@"]);

      expect(corrida.code).not.toBe(0);
      expect(corrida.stderr).toContain("sin commitear");
      expect(corrida.stderr).toContain("desy-preflight-check/SKILL.md");
      // Ni una Ejecución gastada: el guion no llegó a correr.
      expect(corrida.vistas).toEqual([]);
      expect(corrida.scorecard).toBeUndefined();
    },
    60_000,
  );

  it(
    "un --skills-local que no existe es un error explícito, no un árbol limpio",
    async () => {
      const corrida = await correrSuite([
        ...BOTON,
        "--n",
        "1",
        "--skills-local",
        join(tmpdir(), "no-existe-checkout-local"),
      ]);

      expect(corrida.code).not.toBe(0);
      expect(corrida.stderr).toMatch(/No existe el checkout local/);
      expect(corrida.scorecard).toBeUndefined();
    },
    60_000,
  );
});

/**
 * Un vistazo de `vendor/desy-skills`: nombre y mtime de cada fichero. Basta para
 * afirmar que un `--skills-local` no lo reescribió.
 */
function fingerprintDeVendor(): string[] {
  const vendor = join(REPO_ROOT, "vendor", "desy-skills");
  const lineas: string[] = [];
  const recorrer = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) recorrer(full);
      else lineas.push(`${relative(vendor, full)}:${statSync(full).mtimeMs}`);
    }
  };
  recorrer(vendor);
  return lineas.sort();
}
