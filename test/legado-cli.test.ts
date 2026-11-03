import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO_ROOT } from "../src/repo.js";
import { validarVersion } from "../src/versiones.js";

/**
 * Ticket 10 (bucle de refinamiento): el **legado** queda fuera del mecanismo de
 * comparación, y se comprueba corriendo el producto, no leyendo su código.
 *
 * El escenario adversario se escribe entero (ver `CODING_STANDARDS.md`): el
 * `reports/legado/` de cada test tiene que tener ficheros que **un diff leería
 * encantado** si los mirase.
 *
 * - El Scorecard de una corrida vieja **tiene la forma de un Scorecard de
 *   versión** (`skills` con `veredicto`), y está **más abajo** en el directorio
 *   que cualquier versión: si el diff se pusiera a leer todo `reports/`, saldría
 *   en su informe.
 * - Las versiones de fixture tienen **dos pares de fechas enfrentados**, y el
 *   test exige las dos versiones de `versiones/`: un diff que eligiera otro par
 *   sería el que hubiera leído el legado y ordenado por fecha.
 *
 * Los dos controles positivos: sin versiones en `versiones/`, ese mismo legado
 * **no produce un diff** (sale «Sin diff», no una tabla); y con dos versiones de
 * verdad, el diff **sí** sale. Sin ellos, un comando que no leyera nada pasaría.
 */

const TSX = join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);
const HASH_LEGADO = "f".repeat(64);

const PIN_A = { ref: "main", commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df", fecha: "2026-10-20" };
const PIN_B = { ref: "main", commit: "c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0", fecha: "2026-10-29" };
/** Más reciente que `PIN_B`: si el diff la leyera, sería la «B» de un diff. */
const PIN_LEGADO = { ref: "main", commit: "9".repeat(40), fecha: "2026-10-30" };

function version(arbolHash: string, pin: typeof PIN_A, veredicto: "PASA" | "SUSPENDE") {
  return {
    arbolHash,
    pin,
    skills: [
      {
        skill: "implement-component",
        casos: [
          {
            caso: "boton-primario",
            tipo: "caso-componente",
            veredicto,
            entregas: 3,
            intentos: 3,
            alcanzaronSkill: 3,
            correctas: veredicto === "PASA" ? 3 : 0,
            entregoMal: veredicto === "PASA" ? 0 : 3,
            sinArtefacto: 0,
            hallazgosConArtefacto: 0,
            fallos: [],
            guards: { ok: veredicto === "PASA" ? 4 : 2, total: 4 },
            gradeCalidad: veredicto === "PASA" ? "EXCELENTE" : "INACEPTABLE",
            hallazgosDeTrigger: 0,
            triggerConEvidencia: 0,
          },
        ],
        pasados: veredicto === "PASA" ? 1 : 0,
        suspendidos: veredicto === "PASA" ? 0 : 1,
        indeterminados: 0,
      },
    ],
  };
}

const escribir = (dir: string, nombre: string, contenido: unknown): void => {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, nombre), JSON.stringify(contenido, null, 2) + "\n", "utf8");
};

/**
 * Un `reports/` de test con las dos versiones **y** un legado que un diff
 * ingenuo leería: el del 27/10, **más reciente y con `arbolHash`**, para que ni
 * siquiera falle al validarse como versión.
 *
 * Se planta en **dos** sitios, y cada uno atrapa una forma distinta de leerlo:
 *
 * - `reports/legado/<corrida>/<hash>.json` — el sitial real. Atrapa a un diff que
 *   recorriera `reports/` entero en busca de JSON.
 * - `reports/<corrida>/<hash>.json` — un hermano de `versiones/`, un nivel más
 *   arriba del que el test puede ver. Atrapa a un diff que leyera «el directorio
 *   de versiones y al lado lo que haya», que es la trampa más fácil de escribir.
 *
 * Con el segundo, el lector que abriera `reports/` en busca de versiones tendría
 * **tres** candidatas, y la del legado sería la más reciente.
 */
function conLegadoAdversario<T>(
  fn: (reports: string) => T,
  opciones: { versiones: boolean; legado: boolean },
): T {
  const reports = mkdtempSync(join(tmpdir(), "legado-adversario-"));
  try {
    if (opciones.versiones) {
      escribir(join(reports, "versiones"), `${HASH_A}.json`, version(HASH_A, PIN_A, "SUSPENDE"));
      escribir(join(reports, "versiones"), `${HASH_B}.json`, version(HASH_B, PIN_B, "PASA"));
    }
    if (opciones.legado) {
      const legado = { ...version(HASH_LEGADO, PIN_LEGADO, "SUSPENDE"), arbolHash: HASH_LEGADO };
      escribir(join(reports, "legado", "suite-2026-10-27"), `${HASH_LEGADO}.json`, legado);
      escribir(join(reports, "corrida-2026-10-30"), `${HASH_LEGADO}.json`, legado);
    }
    return fn(reports);
  } finally {
    rmSync(reports, { recursive: true, force: true });
  }
}

// Presupuesto de cada proceso real: ver `test/diff-versiones-cli.test.ts`, con la
// medición de la base. Aquí el arranque de `tsx` (~4 s) es todo el coste, y el
// de vitest es el mismo más el margen de la contienda de workers: 60 s.
const SEGUNDOS_POR_CORRIDA = 60;
const PRESUPUESTO_DEL_TEST = SEGUNDOS_POR_CORRIDA * 1000;

function correr(reports: string, args: string[] = []): { status: number; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, [TSX, "scripts/diff-versiones.ts", ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: PRESUPUESTO_DEL_TEST,
    env: { ...process.env, DESY_VERSIONES_DIR: join(reports, "versiones") },
  });
  return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

describe("npm run diff-versiones: el legado no entra en el diff (ticket 10)", () => {
  it("no lo lee aunque tenga forma de versión, sea más reciente y viva en reports/", () => {
    const r = conLegadoAdversario((reports) => correr(reports), { versiones: true, legado: true });

    expect(r.status, r.stderr).toBe(0);
    // Las dos de `versiones/`: con el legado leído, la B sería la del 30/10.
    expect(r.stdout).toContain(`\`${HASH_A.slice(0, 12)}\` → \`${HASH_B.slice(0, 12)}\``);
    expect(r.stdout).not.toContain(PIN_LEGADO.commit);
    expect(r.stdout).not.toContain(HASH_LEGADO.slice(0, 12));
    // Y el diff es el de A→B, no uno vacío: la versión de verdad se sigue leyendo.
    expect(r.stdout).toContain("SUSPENDE · 0/3/0 | PASA · 3/0/0");
  }, PRESUPUESTO_DEL_TEST * 2);

  it("sin versiones, el legado no produce un diff: el comando sigue empezando vacío", () => {
    // Control positivo al revés: el legado no es una línea base ni siquiera
    // cuando es lo único que hay. Un «hay 3 versiones» aquí sería haberlo leído.
    const r = conLegadoAdversario((reports) => correr(reports), { versiones: false, legado: true });

    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("Sin diff");
    expect(r.stdout).toContain("hay 0");
    expect(r.stdout).not.toContain("| Caso |");
  }, PRESUPUESTO_DEL_TEST);

  it("control: con dos versiones de verdad y sin legado, el diff sí sale", () => {
    const r = conLegadoAdversario((reports) => correr(reports), { versiones: true, legado: false });

    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain("| implement-component/boton-primario | SUSPENDE · 0/3/0 | PASA · 3/0/0 | sí |");
  }, PRESUPUESTO_DEL_TEST);

  it("un fichero de legado pasado a mano es una versión inválida, no un diff", () => {
    // Los argumentos explícitos sí leen lo que se les da. Un Scorecard de la
    // regla vieja no declara `arbolHash`, así que no se puede tomar por versión.
    const reports = mkdtempSync(join(tmpdir(), "legado-mano-"));
    try {
      const viejo = join(reports, "scorecard-viejo.json");
      writeFileSync(
        viejo,
        readFileSync(join(REPO_ROOT, "reports", "legado", "suite-2026-10-27", "scorecard.json")),
        "utf8",
      );
      const r = correr(reports, [viejo, viejo]);

      expect(r.status).not.toBe(0);
      expect(r.stderr).toContain("arbolHash");
    } finally {
      rmSync(reports, { recursive: true, force: true });
    }
  }, PRESUPUESTO_DEL_TEST);
});

describe("el archivo del repo es legado de verdad (ticket 10)", () => {
  const legado = join(REPO_ROOT, "reports", "legado");

  it("ninguno de los archivos con forma de Scorecard se puede leer como versión", () => {
    // Lo que de verdad impide que el legado entre en un diff: ninguno declara
    // `arbolHash`, y `validarVersion` lo rechaza. Es una segunda cerradura,
    // detrás de la del directorio: el JSON más cercano a una versión de todo el
    // archivo es el Scorecard del 27/10, y tampoco pasa.
    const archivados = [
      "suite-2026-10-27/scorecard.json",
      "suite-2026-10-27/ejecuciones/implement-component/boton-primario/2.json",
    ];
    for (const archivado of archivados) {
      const raw = JSON.parse(readFileSync(join(legado, archivado), "utf8"));
      expect(() => validarVersion(raw), archivado).toThrow();
    }
    // Control: el del 27/10 tiene la forma de un Scorecard (si no, el test de
    // arriba pasaría por «no parece un scorecard» en vez de por «no es versión»).
    const scorecard = JSON.parse(
      readFileSync(join(legado, "suite-2026-10-27/scorecard.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(Array.isArray(scorecard["skills"])).toBe(true);
    expect(scorecard["arbolHash"]).toBeUndefined();
  });
});
