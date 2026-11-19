import { resolve } from "node:path";
import { lectorDeSkillMd, checklist, AFIRMACIONES_DEL_REPO } from "../src/tier-rapido.js";
import { REPO_ROOT } from "../src/repo.js";
import { VENDOR_SKILLS_DIR } from "../src/runner.js";
import { skillsDeCheckout } from "../src/guardarrail-pin.js";

/**
 * (b) **Checklist Skill → Casos** (ticket 08 del bucle de refinamiento): `npm run
 * checklist-casos`.
 *
 * Para cada hecho de un `SKILL.md` del que un Caso depende, dice si sigue
 * vigente, y —cuando algo cambió— **qué Casos hay que re-correr**. Es la
 * respuesta a «acabo de editar esta sección, ¿qué mido?», en segundos y sin
 * gastar una sola corrida.
 *
 * **No es un gate.** Falla cada vez que un Skill se mejora de forma legítima: un
 * verde de hoy no dice que el Skill esté bien, dice que su texto sigue donde el
 * Caso lo espera. Por eso **nunca** está en `precommit`; se lanza a mano y sale
 * con `1` cuando hay algo que re-correr, que es su resultado normal mientras se
 * itera. Lo que sí es guardarraíl es la lista de hechos en sí:
 * `test/tier-rapido.test.ts` afirma que cada uno cita una sección que existe
 * y que nombra un Caso que existe.
 *
 * Mira el mismo árbol que la suite: `vendor/` o el `--skills-local` que se va a
 * medir. Uso: npm run checklist-casos [-- --skills-local <ruta>]
 */

function argumento(args: string[], nombre: string): string | undefined {
  const i = args.indexOf(nombre);
  return i === -1 ? undefined : args[i + 1];
}

function main(argv: string[]): number {
  const local = argumento(argv, "--skills-local");
  const arbol =
    local === undefined ? VENDOR_SKILLS_DIR : skillsDeCheckout(resolve(REPO_ROOT, local));
  const etiqueta = local === undefined ? "vendor/desy-skills" : `local (sin commit) ${local}`;
  const leerSkill = lectorDeSkillMd(arbol);
  const { queReCorrer, vigentes, cambiadas } = checklist(
    AFIRMACIONES_DEL_REPO,
    leerSkill,
  );

  console.log(`# Checklist Skill → Casos — ${etiqueta}`);
  console.log("");
  for (const r of vigentes) {
    console.log(`✓ vigente  ${r.skill} → «${r.seccion}»: ${r.resumen}`);
  }
  if (cambiadas.length > 0) console.log("");
  for (const r of cambiadas) {
    console.log(`✗ cambiada ${r.skill} → «${r.seccion}»: ${r.resumen}`);
    if (r.motivo !== undefined) console.log(`           ${r.motivo}`);
    if (r.caso !== undefined) console.log(`           Caso: ${r.caso} — ${r.efecto ?? ""}`);
  }
  console.log("");
  if (queReCorrer.length === 0) {
    console.log(
      "Nada que re-correr: los hechos de los que dependen los Casos siguen donde el repo los espera.",
    );
    return 0;
  }
  console.log(
    `Re-corre ${queReCorrer.length} Caso/s:\n` +
      queReCorrer.map((c) => `  npm run run -- --skill ${c.split("/")[0]} --case ${c.split("/")[1]}`).join("\n"),
  );
  return 1;
}

process.exitCode = main(process.argv.slice(2));
