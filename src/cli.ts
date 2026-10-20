import { bumpPin, currentRepo, realGit, PIN_PATH } from "./bump.js";
import { cargarCaso } from "./caso-loader.js";
import type { Assert, Check } from "./caso.js";
import { grado } from "./grader.js";
import { readPin } from "./pin.js";
import { createSandbox, realCommand, runCaso } from "./runner.js";

function usage(): never {
  console.error(
    [
      "Uso: cli <comando> [args]",
      "",
      "Comandos:",
      "  run <skill> <caso> [prompt...]  Ejecuta un Caso por el SUT y muestra la Evidencia.",
      "  grade <id> <severity> <assert> [weight]  Puntúa un Check sobre Evidencia vacía.",
      "  load <ruta>  Carga un Caso desde su carpeta y muestra su JSON.",
      "  report   Agrega resultados y renderiza el Scorecard (pendiente de ticket 12).",
      "  bump-pin <ref>  Actualiza vendor/ + pin.json al ref dado (rama, tag o SHA).",
    ].join("\n"),
  );
  process.exit(2);
}

function runBumpPin(ref: string): void {
  if (!ref) usage();
  const fecha = new Date().toISOString().slice(0, 10);
  const pin = bumpPin(realGit, { ref, url: currentRepo(), fecha });
  console.log(`Pin actualizado: ${pin.ref} @ ${pin.commit} (${pin.fecha})`);
}

async function runCasos([skill = "", id = "", ...promptParts]: string[]): Promise<void> {
  if (!skill || !id) usage();
  const caso = {
    tipo: "caso-componente" as const,
    skill,
    id,
    prompt: promptParts.join(" "),
    checks: [] as Check[],
  };
  const pin = readPin(PIN_PATH);
  const evidencia = await runCaso(caso, pin, {
    sandbox: { create: createSandbox },
    command: realCommand,
  });
  console.log(
    JSON.stringify({ pin: pin.commit, ...evidencia }, null, 2),
  );
}

function parseAssertCli(clase: string): Assert {
  if (clase === "un_solo_h1" || clase === "skip_link" || clase === "fieldset_con_legend") {
    return { kind: clase };
  }
  throw new Error(`assert desconocido: ${clase}`);
}

function runGrade([id, severity, clase, ...rest]: string[]): void {
  if (!id || !severity || !clase) usage();
  if (severity !== "guard" && severity !== "quality") {
    throw new Error(`severity desconocida: ${severity}`);
  }
  const check: Check = {
    id,
    severity,
    weight: severity === "quality" ? Number(rest[0] ?? 1) : 0,
    assert: parseAssertCli(clase),
  };
  const resultado = grado(
    { artefactos: { files: {} }, transcript: { invocaciones: [] } },
    { tipo: "caso-componente", checks: [check] },
  );
  console.log(JSON.stringify(resultado, null, 2));
}

function runLoad([ruta = ""]: string[]): void {
  if (!ruta) usage();
  console.log(JSON.stringify(cargarCaso(ruta), null, 2));
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "bump-pin":
      runBumpPin(rest[0] ?? "");
      return;
    case "run":
      void runCasos(rest);
      return;
    case "grade":
      runGrade(rest);
      return;
    case "load":
      runLoad(rest);
      return;
    case "report":
      console.log("report: pendiente (ticket 12).");
      return;
    default:
      usage();
  }
}

main();
