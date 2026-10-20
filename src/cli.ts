import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readPin, type Pin } from "./pin.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR_DIR = join(REPO_ROOT, "vendor", "desy-skills");
const PIN_PATH = join(REPO_ROOT, "pin.json");

function usage(): never {
  console.error(
    [
      "Uso: cli <comando> [args]",
      "",
      "Comandos:",
      "  run      Ejecuta Casos (pendiente de tickets 02+).",
      "  grade    Puntúa artefactos (pendiente de tickets 03+).",
      "  report   Agrega resultados y renderiza el Scorecard (pendiente de ticket 12).",
      "  bump-pin <ref>  Actualiza vendor/ + pin.json al ref dado.",
    ].join("\n"),
  );
  process.exit(2);
}

function bumpPin(ref: string): void {
  if (!ref) usage();

  const url = "https://github.com/minilama2222/desy-skills";
  const commit = execFileSync("git", ["ls-remote", url, ref], {
    encoding: "utf8",
  })
    .trim()
    .split(/\s+/)[0];

  if (!commit) {
    throw new Error(`No se pudo resolver el ref "${ref}" en ${url}`);
  }

  const tmp = join(REPO_ROOT, ".vendor-tmp");
  if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });

  execFileSync("git", ["clone", "--depth", "1", "--branch", ref.replace(/^refs\/heads\//, ""), url, tmp], {
    stdio: "inherit",
  });

  rmSync(VENDOR_DIR, { recursive: true, force: true });
  mkdirSync(dirname(VENDOR_DIR), { recursive: true });
  cpSync(join(tmp, "skills"), join(VENDOR_DIR, "skills"), { recursive: true });
  rmSync(join(tmp, ".git"), { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });

  const fecha = new Date().toISOString().slice(0, 10);
  const pin: Pin = { ref: ref.replace(/^refs\/heads\//, ""), commit, fecha, repo: url };
  writeFileSync(PIN_PATH, JSON.stringify(pin, null, 2) + "\n", "utf8");
  console.log(`Pin actualizado: ${pin.ref} @ ${pin.commit} (${pin.fecha})`);
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "bump-pin":
      bumpPin(rest[0] ?? "");
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
