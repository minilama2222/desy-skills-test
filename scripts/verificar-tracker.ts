import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
  problemasDelTracker,
  type Ticket,
} from "../src/guardarrail-tracker.js";
import { REPO_ROOT } from "../src/repo.js";

/**
 * Guardarraíl del tracker (ver el retro del ticket 08): un ticket `done` no puede
 * tener casillas sin marcar. `done` significa «hecho de verdad»; un criterio que
 * depende de trabajo no construido deja el ticket en `ready-for-human`
 * (`CODING_STANDARDS.md`). Corre en el pre-commit. `npm run verificar-tracker`.
 *
 * Recorre **todas** las features de `.scratch/`, no una: antes miraba sólo
 * `desy-skills-test-harness`, y los 13 tickets de `bucle-de-refinamiento` —con
 * casillas y `Status`— iban sin vigilar. Una feature nueva no se queda fuera por
 * olvido.
 */
const SCRATCH_DIR = join(REPO_ROOT, ".scratch");

function tickets(): Ticket[] {
  const tickets: Ticket[] = [];
  for (const feature of readdirSync(SCRATCH_DIR, { withFileTypes: true })) {
    if (!feature.isDirectory()) continue;
    const issuesDir = join(SCRATCH_DIR, feature.name, "issues");
    let ficheros: string[];
    try {
      ficheros = readdirSync(issuesDir).filter((f) => f.endsWith(".md"));
    } catch {
      continue; // una feature sin `issues/` (sólo spec, o sólo peticiones)
    }
    for (const f of ficheros) {
      tickets.push({
        path: relative(REPO_ROOT, join(issuesDir, f)).split("\\").join("/"),
        contenido: readFileSync(join(issuesDir, f), "utf8"),
        raiz: REPO_ROOT,
      });
    }
  }
  return tickets;
}

const revisados = tickets();
const hallazgos = problemasDelTracker(revisados);

if (hallazgos.length === 0) {
  console.log(
    `OK: ninguno de los ${revisados.length} tickets tiene el Status o las casillas mintiendo.`,
  );
  process.exit(0);
}

console.log(`El tracker tiene ${hallazgos.length} hallazgo/s:`);
for (const h of hallazgos) console.log(`  - ${h}`);
process.exit(1);
