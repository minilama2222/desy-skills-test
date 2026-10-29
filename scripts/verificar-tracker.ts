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
 */
const ISSUES_DIR = join(REPO_ROOT, ".scratch", "desy-skills-test-harness", "issues");

function tickets(): Ticket[] {
  return readdirSync(ISSUES_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({
      path: relative(REPO_ROOT, join(ISSUES_DIR, f)).split("\\").join("/"),
      contenido: readFileSync(join(ISSUES_DIR, f), "utf8"),
    }));
}

const hallazgos = problemasDelTracker(tickets());

if (hallazgos.length === 0) {
  console.log("OK: ningún ticket `done` tiene casillas sin marcar.");
  process.exit(0);
}

console.log(`El tracker tiene ${hallazgos.length} hallazgo/s:`);
for (const h of hallazgos) console.log(`  - ${h}`);
process.exit(1);
