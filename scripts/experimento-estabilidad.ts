import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CASOS_DIR, cargarCaso } from "../src/caso-loader.js";
import { PIN_PATH } from "../src/bump.js";
import { ejecutarCaso } from "../src/ejecutar.js";
import { readPin } from "../src/pin.js";
import { createSandbox, realCommand, SCAFFOLD_CACHE_DIR } from "../src/runner.js";

/**
 * Experimento de estabilidad: corre el mismo Caso N veces con el harness actual
 * y deja un JSON por Ejecución en reports/estabilidad/. Sirve para decidir la
 * política de N Ejecuciones por Caso (ver decisión pendiente del ticket 05).
 *
 * Uso: npx tsx scripts/experimento-estabilidad.ts [n]
 */
const N = Number(process.argv[2] ?? 3);

const CASO_DIR = join(CASOS_DIR, "implement-component", "componente", "boton-primario");
const SALIDA = join(process.cwd(), "reports", "estabilidad");
mkdirSync(SALIDA, { recursive: true });

if (!existsSync(SCAFFOLD_CACHE_DIR)) {
  console.error(`Falta el scaffold cacheado en ${SCAFFOLD_CACHE_DIR} (ver ADR-0005).`);
  process.exit(1);
}

const caso = cargarCaso(CASO_DIR);
const pin = readPin(PIN_PATH);

const resumen: unknown[] = [];

for (let i = 1; i <= N; i++) {
  const inicio = Date.now();
  process.stderr.write(`\n=== Ejecución ${i}/${N} ===\n`);
  try {
    const resultado = await ejecutarCaso(caso, pin, {
      sandbox: { create: () => createSandbox({ scaffoldDir: SCAFFOLD_CACHE_DIR }) },
      command: realCommand,
    });

    const segundos = Math.round((Date.now() - inicio) / 1000);
    const salida = {
      ejecucion: i,
      segundos,
      grade: resultado.grade,
      flujoObservado: resultado.flujoObservado,
      nArtefactos: Object.keys(resultado.artefactos).length,
      artefactos: Object.keys(resultado.artefactos),
      detalle: resultado.detalle.filter((d) => !d.passed).map((d) => d.id),
    };
    resumen.push(salida);
    writeFileSync(join(SALIDA, `ejecucion-${i}.json`), JSON.stringify(resultado, null, 2), "utf8");
    process.stderr.write(
      `grade=${resultado.grade}  artefactos=${salida.nArtefactos}  ` +
        `flujo=[${resultado.flujoObservado.join(", ")}]  ${segundos}s\n`,
    );
  } catch (error) {
    resumen.push({ ejecucion: i, error: String(error) });
    process.stderr.write(`ERROR: ${String(error)}\n`);
  }
}

writeFileSync(join(SALIDA, "resumen.json"), JSON.stringify(resumen, null, 2), "utf8");

process.stderr.write("\n=== RESUMEN ===\n");
for (const r of resumen as Record<string, unknown>[]) {
  if (r["error"]) {
    process.stderr.write(`  #${r["ejecucion"]}: ERROR ${r["error"]}\n`);
  } else {
    process.stderr.write(
      `  #${r["ejecucion"]}: grade=${r["grade"]} artefactos=${r["nArtefactos"]} ` +
        `flujo=${JSON.stringify(r["flujoObservado"])} fallos=${JSON.stringify(r["detalle"])}\n`,
    );
  }
}
