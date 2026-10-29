import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO_ROOT } from "../src/repo.js";
import { readPin } from "../src/pin.js";
import type { Scorecard } from "../src/scorecard.js";

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
const entrega = entregas[indice] ?? "bueno";

// Marca de "el guion corrió esta Ejecución": la lee el test para no confundir un
// verde del test con un verde de la suite (ver la cabecera).
writeFileSync(join(casa, "visto-" + indice + ".txt"), entrega);

// El Flujo observado: preflight primero (Flujo canónico) y el skill del Caso.
process.stderr.write('\\u2192 Skill "desy-preflight-check"\\n');
process.stderr.write('\\u2192 Skill "desy-implement-component"\\n');

if (entrega !== "nada") {
  mkdirSync("src", { recursive: true });
  writeFileSync(join("src", artefacto), contenido[entrega] ?? "");
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
}

const TSX = join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");

/**
 * Corre `src/cli.ts suite` con el SUT falso. `--reports` apunta a un directorio
 * temporal —nunca a `reports/suite` del repo— para no dejar rastro.
 */
async function correrSuite(args: string[], entregas: string[] = ["bueno"]): Promise<Corrida> {
  const dir = mkdtempSync(join(tmpdir(), "suite-cli-"));
  try {
    writeFileSync(join(dir, "opencode-falso.cjs"), GUION, "utf8");
    writeFileSync(join(dir, "preludio.cjs"), PRELUDIO, "utf8");
    writeFileSync(
      join(dir, "guion.json"),
      JSON.stringify({ entregas, artefacto: ARTEFACTO, contenido: ENTREGAS }),
      "utf8",
    );

    const reports = join(dir, "reports");
    const inicio = Date.now();
    const r = spawnSync(
      process.execPath,
      [TSX, "src/cli.ts", "suite", ...args, "--reports", reports],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        env: {
          ...process.env,
          // `NODE_OPTIONS` parsea comillas y barras: la ruta va con `/` o Windows
          // se come los `\` y Node no encuentra el preludio.
          NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --require "${join(dir, "preludio.cjs").replace(/\\/g, "/")}"`.trim(),
        },
      },
    );
    const segundos = Math.round((Date.now() - inicio) / 1000);

    const json = join(reports, "scorecard.json");
    const md = join(reports, "scorecard.md");
    const vistas = entregas.map((_, i) => {
      const marca = join(dir, `visto-${i}.txt`);
      return existsSync(marca) ? readFileSync(marca, "utf8").trim() : "(no corrió)";
    });
    return {
      code: r.status ?? -1,
      stdout: r.stdout ?? "",
      stderr: r.stderr ?? "",
      segundos,
      vistas,
      ...(existsSync(json) ? { scorecard: JSON.parse(readFileSync(json, "utf8")) as Scorecard } : {}),
      ...(existsSync(md) ? { markdown: readFileSync(md, "utf8") } : {}),
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const pin = readPin(join(REPO_ROOT, "pin.json"));
const BOTON = ["--skill", "implement-component", "--case", "boton-primario"];

/**
 * Presupuesto de tiempo por Ejecución. No es un adorno: la copia del starter al
 * sandbox (~85 MB / 5.260 ficheros, ver `SandboxOptions.scaffoldDir`) domina el
 * coste, y una regresión ahí infla el CI en silencio — pasó en la primera
 * versión de este test, que tardaba 4× más y nadie lo notaba. Medido: ~19 s por
 * Ejecución con `robocopy` (antes ~66 s con `cpSync`). El techo deja aire para
 * una máquina cargada, pero no para volver al `cpSync`.
 */
const SEGUNDOS_POR_EJECUCION = 35;

function expectDentroDelPresupuesto(corrida: Corrida, ejecuciones: number): void {
  const techo = SEGUNDOS_POR_EJECUCION * ejecuciones;
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
      expectDentroDelPresupuesto(corrida, 1);
      expect(corrida.code).toBe(0);
      // El JSON es la fuente de verdad y declara siempre el Pin testeado.
      expect(corrida.scorecard?.pin.commit).toBe(pin.commit);
      expect(corrida.scorecard?.skills.map((s) => s.skill)).toEqual(["implement-component"]);
      expect(corrida.scorecard?.skills[0]?.casos.map((c) => c.veredicto)).toEqual(["PASA"]);
      // El Scorecard legible queda en disco y en stdout.
      expect(corrida.markdown).toContain(`Scorecard — Pin ${pin.commit}`);
      expect(corrida.stdout).toContain(`Scorecard — Pin ${pin.commit}`);
    },
    180_000,
  );

  it(
    "sale con código ≠ 0 si alguna Ejecución alcanza el skill y ninguna es correcta",
    async () => {
      // N=3 con las tres entregas malas: el Caso SUSPENDE y el merge se bloquea.
      const corrida = await correrSuite([...BOTON, "--n", "3"], ["malo", "malo", "malo"]);

      expect(corrida.vistas).toEqual(["malo", "malo", "malo"]);
      expectDentroDelPresupuesto(corrida, 3);
      expect(corrida.code).not.toBe(0);
      expect(corrida.scorecard?.skills[0]?.casos[0]?.veredicto).toBe("SUSPENDE");
      expect(corrida.stderr).toContain("SUSPENDIDO");
    },
    180_000,
  );

  it(
    "sale con 0 y INDETERMINADO si ninguna de las N Ejecuciones entregó nada (ADR-0014)",
    async () => {
      // Antes esto bloqueaba el merge sin decir nada del skill: el agente llegó
      // al skill y no escribió. Desde ADR-0014 no hay nada que graduar, así que
      // el Caso no juzga — pero tampoco pasa por medido: el scorecard lo dice.
      const corrida = await correrSuite([...BOTON, "--n", "3"], ["nada", "nada", "nada"]);

      expect(corrida.vistas).toEqual(["nada", "nada", "nada"]);
      expectDentroDelPresupuesto(corrida, 3);
      expect(corrida.code).toBe(0);
      const caso = corrida.scorecard?.skills[0]?.casos[0];
      expect(caso?.veredicto).toBe("INDETERMINADO");
      expect(caso?.sinArtefacto).toBe(3);
    },
    180_000,
  );

  it(
    "basta con que una de las N Ejecuciones sea correcta (ADR-0007) y sale con 0",
    async () => {
      const corrida = await correrSuite([...BOTON, "--n", "3"], ["malo", "bueno", "nada"]);

      expect(corrida.vistas).toEqual(["malo", "bueno", "nada"]);
      expectDentroDelPresupuesto(corrida, 3);
      expect(corrida.code).toBe(0);
      const caso = corrida.scorecard?.skills[0]?.casos[0];
      expect(caso?.veredicto).toBe("PASA");
      // Las tres causas quedan contadas por separado: entregó mal, entregó
      // bien y no llegó a entregar.
      expect(caso?.correctas).toBe(1);
      expect(caso?.entregoMal).toBe(1);
      expect(caso?.sinArtefacto).toBe(1);
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
});
