import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REPO_ROOT } from "../src/repo.js";
import { guardarEjecucion } from "../src/reportes.js";
import type { ResultadoEjecucion } from "../src/ejecutar.js";
import type { Scorecard } from "../src/scorecard.js";
import type { ScorecardDeVersion } from "../src/versiones.js";

/**
 * Ticket 09 (bucle de refinamiento): el versionado y el diff como **productos**
 * del repo, no sólo como funciones.
 *
 * - `npm run diff-versiones` se corre como proceso real sobre JSON de fixture en
 *   `reports/versiones/`, porque lo que se mide es lo que el mantenedor obtiene
 *   al teclearlo —incluido que con menos de dos versiones **sale limpio**—.
 * - `npm run report` se corre sobre un árbol de Ejecuciones temporal y tiene que
 *   **no re-etiquetar**: cada Ejecución declara su Pin, y un árbol mezclado no
 *   puede salir como el Pin de la primera.
 *
 * Los dos son deterministas y sin SUT (~1 s cada uno); el camino de `suite` con
 * la suite real (que escribe la versión de su `arbolHash`) vive en
 * `test/suite-cli.test.ts`, donde ya hay SUT doble.
 *
 * **Cada test usa su propio directorio de versiones**, redirigido con
 * `DESY_VERSIONES_DIR` (`src/reportes.ts`): no se escribe ni se aparta el
 * `reports/versiones/` real, y no se comparte estado con otros workers.
 */

const TSX = join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs");

/** Corre un script del repo y devuelve lo que un humano vería. */
function correr(args: string[]): { status: number; stdout: string; stderr: string } {
  const r = spawnSync(process.execPath, [TSX, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    // Hereda `DESY_VERSIONES_DIR` cuando `conVersionesDeFixture` lo redirige: el
    // proceso hijo lee las versiones del temporal del test, no las del repo.
    env: process.env,
  });
  return { status: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

const PIN_A: Scorecard["pin"] = {
  ref: "main",
  commit: "b523ca7df8594532f5fd47376894c16bc8f1b5df",
  fecha: "2026-10-20",
};

const PIN_B: Scorecard["pin"] = {
  ref: "main",
  commit: "c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0",
  fecha: "2026-10-29",
};

/** Un scorecard de versión, de los que deja `suite` en `reports/versiones/`. */
function version(
  arbolHash: string,
  pin: Scorecard["pin"],
  veredicto: "PASA" | "SUSPENDE",
): ScorecardDeVersion {
  const correctas = veredicto === "PASA" ? 3 : 0;
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
            correctas,
            entregoMal: 3 - correctas,
            sinArtefacto: 0,
            hallazgosConArtefacto: 0,
            fallos: [],
            guards: { ok: veredicto === "PASA" ? 4 : 2, total: 4 },
            gradeCalidad: veredicto === "PASA" ? "EXCELENTE" : "INACEPTABLE",
            hallazgosDeTrigger: 0,
            triggerConEvidencia: 0,
            contradiccionesDeclaradas: [],
          },
        ],
        pasados: veredicto === "PASA" ? 1 : 0,
        suspendidos: veredicto === "PASA" ? 0 : 1,
        indeterminados: 0,
      },
    ],
  };
}

function escribirVersionDeFixture(dir: string, v: ScorecardDeVersion): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${v.arbolHash}.json`), JSON.stringify(v, null, 2) + "\n", "utf8");
}

/**
/**
 * Corre `fn` con las versiones **de este test** (vacío), sin tocar el
 * `reports/versiones/` del repo: `VERSIONES_DIR` se redirige con
 * `DESY_VERSIONES_DIR` (`src/reportes.ts`), igual que en `suite-cli.test.ts`.
 *
 * Antes se apartaba el directorio del repo con un `rename` y se devolvía al
 * final. Pasaba, pero **compartía estado con cualquier otro worker**: dos
 * ficheros de test mutando el mismo directorio se ven entre sí a mitad, y un
 * `reports/versiones/` ausente por un instante es exactamente lo que otro test
 * podría leer. Redirigir no comparte nada.
 */
function conVersionesDeFixture<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "versiones-fixture-"));
  process.env.DESY_VERSIONES_DIR = dir;
  try {
    return fn(dir);
  } finally {
    delete process.env.DESY_VERSIONES_DIR;
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("npm run diff-versiones (ticket 09)", () => {
  it("empieza vacío: sin dos versiones no hay diff, lo dice y sale limpio", () => {
    conVersionesDeFixture((dir) => {
      const r = correr(["scripts/diff-versiones.ts"]);

      expect(r.status, r.stderr).toBe(0);
      expect(r.stdout).toContain("Sin diff");
      expect(r.stdout).toContain("hacen falta dos versiones");
      expect(r.stdout).toContain("hay 0");
      expect(r.stdout).not.toContain("| Caso |");
      expect(existsSync(dir)).toBe(true);
    });
  }, 60_000);

  it("con una sola versión no inventa una línea base: sale limpio y dice cuántas hay", () => {
    conVersionesDeFixture((dir) => {
      escribirVersionDeFixture(dir, version(HASH_A, PIN_A, "PASA"));

      const r = correr(["scripts/diff-versiones.ts"]);

      expect(r.status, r.stderr).toBe(0);
      expect(r.stdout).toContain("hay 1");
      expect(r.stdout).not.toContain("| Caso |");
    });
  }, 60_000);

  it("con dos versiones da el diff por Caso y por Skill", () => {
    conVersionesDeFixture((dir) => {
      escribirVersionDeFixture(dir, version(HASH_A, PIN_A, "SUSPENDE"));
      escribirVersionDeFixture(dir, version(HASH_B, PIN_B, "PASA"));

      const r = correr(["scripts/diff-versiones.ts"]);

      expect(r.status, r.stderr).toBe(0);
      expect(r.stdout).toContain(
        "| implement-component/boton-primario | SUSPENDE · 0/3/0 | PASA · 3/0/0 | sí |",
      );
      expect(r.stdout).toContain("| implement-component | 0/1/0 | 1/0/0 | sí |");
      // La cabecera sitúa las dos versiones por su hash y su Pin.
      expect(r.stdout).toContain(HASH_A);
      expect(r.stdout).toContain(PIN_B.commit);
    });
  }, 60_000);

  it("con dos rutas explícitas compara esas, aunque no estén en el repo", () => {
    const dir = mkdtempSync(join(tmpdir(), "versiones-rutas-"));
    try {
      const a = join(dir, "antes.json");
      const b = join(dir, "despues.json");
      writeFileSync(a, JSON.stringify(version(HASH_A, PIN_A, "PASA")), "utf8");
      writeFileSync(b, JSON.stringify(version(HASH_B, PIN_B, "SUSPENDE")), "utf8");

      const r = correr(["scripts/diff-versiones.ts", a, b]);

      expect(r.status, r.stderr).toBe(0);
      expect(r.stdout).toContain("PASA · 3/0/0 | SUSPENDE · 0/3/0");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it("una versión con Pin local se avisa: es cómoda para iterar, no lo que se medirá en CI", () => {
    conVersionesDeFixture((dir) => {
      escribirVersionDeFixture(dir, version(HASH_A, PIN_A, "SUSPENDE"));
      escribirVersionDeFixture(
        dir,
        version(HASH_B, { ref: "local", commit: "local", fecha: "2026-10-29" }, "PASA"),
      );

      const r = correr(["scripts/diff-versiones.ts"]);

      expect(r.status, r.stderr).toBe(0);
      expect(r.stderr).toContain("Pin local (sin commit)");
      // El aviso no sustituye al diff: sigue diciendo qué cambió.
      expect(r.stdout).toContain("Cambian 1 Caso/s");
    });
  }, 60_000);

  it("una ruta que no existe es un error explícito, no un diff vacío", () => {
    const dir = mkdtempSync(join(tmpdir(), "versiones-falta-"));
    try {
      const r = correr([
        "scripts/diff-versiones.ts",
        join(dir, "no-existe-a.json"),
        join(dir, "no-existe-b.json"),
      ]);

      expect(r.status).not.toBe(0);
      expect(r.stderr).toContain("No existe la versión");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);
});

describe(".gitignore: se versionan reports/versiones/ y reports/legado/, y nada más (tickets 09 y 10)", () => {
  /**
   * La excepción del `.gitignore` es frágil de una forma que no se ve leyéndola:
   * `reports/` —o `/reports/`— es un patrón de **directorio**, y git no desciende
   * en un directorio ignorado, así que un `!reports/versiones/` posterior nunca
   * llega a evaluarse. Tiene que ser `/reports/*`. Este test corre git de verdad
   * sobre lo que pregunta: qué ficheros vería un `git add`.
   */
  const ignorado = (path: string): boolean => {
    const r = spawnSync("git", ["check-ignore", "--quiet", "--no-index", path], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    return r.status === 0;
  };

  it("el JSON de una versión NO está ignorado (se puede commitar)", () => {
    expect(ignorado(`reports/versiones/${HASH_A}.json`)).toBe(false);
  });

  it("el archivo de legado tampoco: la evidencia versionada se commitea", () => {
    // Ticket 10: el legado se versiona, sin `git add -f`. La segunda negación
    // cuelga de la misma línea `*` que la primera.
    expect(ignorado("reports/legado/README.md")).toBe(false);
    expect(ignorado("reports/legado/suite-2026-10-27/scorecard.json")).toBe(false);
  });

  it("el resto de reports/ sí lo está: Ejecuciones, scorecards de corrida, informes", () => {
    expect(ignorado("reports/suite/ejecuciones/implement-component/boton-primario/1.json")).toBe(true);
    expect(ignorado("reports/suite/scorecard.json")).toBe(true);
    expect(ignorado("reports/ejecuciones/x/y/1.json")).toBe(true);
  });
});

describe("npm run report: el Pin sale de cada Ejecución (ticket 09)", () => {  const ejecucion = (pin: string, fecha: string): ResultadoEjecucion => ({
    skill: "implement-component",
    caso: "boton-primario",
    tipo: "caso-componente",
    pin,
    fecha,
    grade: "EXCELENTE",
    detalle: [],
    flujoObservado: ["preflight-check", "implement-component"],
    artefactos: { "src/boton.njk": "{{ componentButton() }}" },
    entrega: "con-artefacto",
    flujoAlcanzoSkill: true,
    exitCode: 0,
    ultimoPasoDelFlujo: "implement-component",
    arbolHash: HASH_A,
    salida: { stdout: "", stderr: "" },
  });

  function reportar(ejecuciones: ResultadoEjecucion[]): {
    scorecard: Scorecard;
    r: ReturnType<typeof correr>;
  } {
    const dir = mkdtempSync(join(tmpdir(), "report-pin-"));
    try {
      const reports = join(dir, "reports");
      for (const e of ejecuciones) guardarEjecucion(join(reports, "ejecuciones"), e);
      const r = correr(["src/cli.ts", "report", "--reports", reports]);
      expect(r.status, r.stderr).toBe(0);
      const scorecard = JSON.parse(
        readFileSync(join(reports, "scorecard.json"), "utf8"),
      ) as Scorecard;
      return { scorecard, r };
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("un árbol con dos Pins sale como «mixto», nunca con el Pin de la primera Ejecución", () => {
    const { scorecard, r } = reportar([
      ejecucion(PIN_A.commit, PIN_A.fecha),
      ejecucion(PIN_B.commit, PIN_B.fecha),
    ]);

    // Re-etiquetar con el Pin de la primera diría una versión que no es.
    expect(scorecard.pin.commit).toBe("mixto");
    expect(scorecard.pin.fecha).toBe(PIN_B.fecha);
    expect(r.stderr).toContain("no declaran un Pin único");
    expect(r.stdout).toContain("Scorecard — Pin mixto");
  }, 60_000);

  it("un árbol de una sola corrida declara ese Pin, con su fecha y no la de hoy", () => {
    // Control positivo del anterior: con un Pin único no se dice «mixto» (sin
    // esto, el test de arriba pasaría aunque `report` dijera «mixto» siempre).
    const { scorecard, r } = reportar([
      ejecucion(PIN_A.commit, PIN_A.fecha),
      ejecucion(PIN_A.commit, PIN_A.fecha),
    ]);

    expect(scorecard.pin.commit).toBe(PIN_A.commit);
    expect(scorecard.pin.fecha).toBe(PIN_A.fecha);
    expect(r.stderr).not.toContain("mixto");
  }, 60_000);
});
