import { bumpPin, currentRepo, realGit, PIN_PATH } from "./bump.js";
import { CASOS_DIR, cargarCaso } from "./caso-loader.js";
import type { Assert, Check, TipoCaso } from "./caso.js";
import { ejecutarCaso } from "./ejecutar.js";
import { grado } from "./grader.js";
import { readPin } from "./pin.js";
import { createSandbox, realCommand, SCAFFOLD_CACHE_DIR } from "./runner.js";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function usage(): never {
  console.error(
    [
      "Uso: cli <comando> [args]",
      "",
      "Comandos:",
      "  run --skill <skill> --case <caso>  Ejecuta un Caso por el SUT y emite Evidencia + Grade.",
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

function opcion(args: string[], nombre: string): string | undefined {
  const i = args.indexOf(nombre);
  if (i === -1) return undefined;
  return args[i + 1];
}

/** Localiza la carpeta del Caso dentro de CASOS_DIR: <skill>/<tipo>/<id>. */
function localizarCaso(skill: string, id: string): string {
  const skillDir = join(CASOS_DIR, skill);
  if (!existsSync(skillDir)) {
    throw new Error(`No existe el skill "${skill}" en el árbol de Casos (${skillDir})`);
  }
  for (const tipo of readdirSync(skillDir, { withFileTypes: true })) {
    if (!tipo.isDirectory()) continue;
    const candidato = join(skillDir, tipo.name, id);
    if (existsSync(candidato)) return candidato;
  }
  throw new Error(
    `No se encontró el Caso "${id}" para el skill "${skill}" bajo ${skillDir}`,
  );
}

async function runCasos(args: string[]): Promise<void> {
  const skill = opcion(args, "--skill");
  const id = opcion(args, "--case");
  if (!skill || !id) usage();

  const caso = cargarCaso(localizarCaso(skill!, id!));
  const pin = readPin(PIN_PATH);
  const resultado = await ejecutarCaso(caso, pin, {
    sandbox: {
      create: () =>
        createSandbox(
          existsSync(SCAFFOLD_CACHE_DIR) ? { scaffoldDir: SCAFFOLD_CACHE_DIR } : {},
        ),
    },
    command: realCommand,
  });
  console.log(JSON.stringify(resultado, null, 2));
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
    { tipo: "caso-componente" as TipoCaso, checks: [check] },
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
