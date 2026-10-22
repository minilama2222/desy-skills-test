import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import { PIN_PATH } from "../src/bump.js";
import { ejecutarCaso } from "../src/ejecutar.js";
import { readPin } from "../src/pin.js";
import { createSandbox, realCommand, SCAFFOLD_CACHE_DIR } from "../src/runner.js";

/**
 * Experimento de estabilidad (v2): corre el mismo Caso N veces con la caché
 * LIMPIA y registra DOS cosas por Ejecución:
 *   - lo que devuelve el runner hoy (`dist/` nuevo o modificado)
 *   - lo que el SUT escribió de verdad en `src/` (aunque el runner no lo mire)
 *
 * Separa "bug del harness" de "flakiness del SUT": una corrida sin `dist/`
 * puede haber escrito el fuente igualmente.
 *
 * Uso: npx tsx scripts/experimento-estabilidad.ts [n]
 */
const N = Number(process.argv[2] ?? 3);

const CASO_DIR = join(CASOS_DIR, "implement-component", "componente", "boton-primario");
const SALIDA = join(process.cwd(), "reports", "estabilidad-v2");
mkdirSync(SALIDA, { recursive: true });

if (!existsSync(SCAFFOLD_CACHE_DIR)) {
  console.error(`Falta el scaffold cacheado en ${SCAFFOLD_CACHE_DIR} (ver ADR-0005).`);
  process.exit(1);
}

const caso = cargarCaso(CASO_DIR);
const pin = readPin(PIN_PATH);
const resumen: Record<string, unknown>[] = [];

for (let i = 1; i <= N; i++) {
  const inicio = Date.now();
  process.stderr.write(`\n=== Ejecución ${i}/${N} ===\n`);

  const base = createSandbox({ scaffoldDir: SCAFFOLD_CACHE_DIR });
  const antes = new Map<string, number>();
  foto(base.workDir, "", antes);
  // Conservamos el sandbox para inspeccionarlo tras el run.
  const sandbox = { ...base, cleanup: () => {} };

  try {
    const resultado = await ejecutarCaso(caso, pin, {
      sandbox: { create: () => sandbox },
      command: realCommand,
    });

    const despues = new Map<string, number>();
    foto(sandbox.workDir, "", despues);
    const escritos = [...despues.entries()]
      .filter(([p, t]) => antes.get(p) !== t && !p.startsWith("dist/"))
      .map(([p]) => p);
    const distEscritos = [...despues.entries()]
      .filter(([p, t]) => antes.get(p) !== t && p.startsWith("dist/"))
      .map(([p]) => p);
    const fuente = escritos.find((p) => p.startsWith("src/"));
    const contenidoFuente = fuente
      ? leer(join(sandbox.workDir, fuente))
      : undefined;

    const segundos = Math.round((Date.now() - inicio) / 1000);
    const salida = {
      ejecucion: i,
      segundos,
      grade: resultado.grade,
      flujoObservado: resultado.flujoObservado,
      runnerDevuelve: Object.keys(resultado.artefactos),
      fuenteEscrita: escritos.filter((p) => p.startsWith("src/")),
      distEscrito: distEscritos,
      fuenteTieneMacro: contenidoFuente?.includes("componentButton") ?? null,
      fuenteTieneVariante: contenidoFuente?.includes("c-button--primary") ?? null,
      fallos: resultado.detalle.filter((d) => !d.passed).map((d) => d.id),
    };
    resumen.push(salida);

    if (fuente && contenidoFuente) {
      writeFileSync(join(SALIDA, `ejecucion-${i}-fuente.txt`), contenidoFuente, "utf8");
    }
    writeFileSync(join(SALIDA, `ejecucion-${i}.json`), JSON.stringify(resultado, null, 2), "utf8");

    process.stderr.write(
      `grade=${resultado.grade}  runner=${salida.runnerDevuelve.length}  ` +
        `src=[${salida.fuenteEscrita.join(", ")}]  dist=${distEscritos.length}  ${segundos}s\n`,
    );
  } catch (error) {
    resumen.push({ ejecucion: i, error: String(error) });
    process.stderr.write(`ERROR: ${String(error)}\n`);
  } finally {
    base.cleanup();
  }
}

writeFileSync(join(SALIDA, "resumen.json"), JSON.stringify(resumen, null, 2), "utf8");

process.stderr.write("\n=== RESUMEN ===\n");
for (const r of resumen) {
  if (r["error"]) {
    process.stderr.write(`  #${r["ejecucion"]}: ERROR ${r["error"]}\n`);
  } else {
    process.stderr.write(
      `  #${r["ejecucion"]}: grade=${r["grade"]}  ` +
        `runnerDevuelve=${JSON.stringify(r["runnerDevuelve"])}  ` +
        `fuenteEscrita=${JSON.stringify(r["fuenteEscrita"])}  ` +
        `macroEnFuente=${r["fuenteTieneMacro"]}  varianteEnFuente=${r["fuenteTieneVariante"]}\n`,
    );
  }
}

function foto(dir: string, prefijo: string, acc: Map<string, number>): void {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefijo ? `${prefijo}/${e.name}` : e.name;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      foto(full, rel, acc);
    } else if (e.isFile()) {
      acc.set(rel, statSync(full).mtimeMs);
    }
  }
}

function leer(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}
