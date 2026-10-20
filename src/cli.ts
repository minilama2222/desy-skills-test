import { bumpPin, currentRepo, realGit, PIN_PATH } from "./bump.js";
import { readPin } from "./pin.js";

function usage(): never {
  console.error(
    [
      "Uso: cli <comando> [args]",
      "",
      "Comandos:",
      "  run      Ejecuta Casos (pendiente de tickets 02+).",
      "  grade    Puntúa artefactos (pendiente de tickets 03+).",
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

function main(): void {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "bump-pin":
      runBumpPin(rest[0] ?? "");
      return;
    case "run":
      console.log(
        `run: pendiente (tickets 02+). Pin actual: ${readPin(PIN_PATH).commit}`,
      );
      return;
    case "grade":
      console.log("grade: pendiente (tickets 03+).");
      return;
    case "report":
      console.log("report: pendiente (ticket 12).");
      return;
    default:
      usage();
  }
}

main();
