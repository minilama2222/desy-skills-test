import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_REPO, normalizeRef, readPin, type Pin } from "./pin.js";

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
      "  bump-pin <ref>  Actualiza vendor/ + pin.json al ref dado (rama, tag o SHA).",
    ].join("\n"),
  );
  process.exit(2);
}

function currentRepo(): string {
  try {
    return readPin(PIN_PATH).repo ?? DEFAULT_REPO;
  } catch {
    return DEFAULT_REPO;
  }
}

const SHA_RE = /^[0-9a-f]{7,40}$/i;

function resolveCommit(url: string, ref: string): string {
  const candidates = [`refs/heads/${ref}`, `refs/tags/${ref}`, ref];
  for (const candidate of candidates) {
    const out = execFileSync("git", ["ls-remote", url, candidate], {
      encoding: "utf8",
    }).trim();
    const commit = out.split(/\s+/)[0];
    if (commit) return commit;
  }
  throw new Error(`No se pudo resolver el ref "${ref}" en ${url}`);
}

function copyVendor(tmp: string): void {
  rmSync(VENDOR_DIR, { recursive: true, force: true });
  mkdirSync(VENDOR_DIR, { recursive: true });
  for (const entry of readdirSync(tmp)) {
    if (entry === ".git") continue;
    cpSync(join(tmp, entry), join(VENDOR_DIR, entry), { recursive: true });
  }
}

function bumpPin(ref: string): void {
  if (!ref) usage();

  const url = currentRepo();
  const shortRef = normalizeRef(ref);

  const tmp = join(REPO_ROOT, ".vendor-tmp");
  if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });

  const isSha = SHA_RE.test(shortRef);
  const commit = isSha ? shortRef : resolveCommit(url, shortRef);

  execFileSync("git", ["clone", "--quiet", url, tmp], { stdio: "inherit" });
  execFileSync("git", ["-C", tmp, "checkout", "--quiet", commit], {
    stdio: "inherit",
  });

  copyVendor(tmp);
  rmSync(tmp, { recursive: true, force: true });

  const fecha = new Date().toISOString().slice(0, 10);
  const pin: Pin = { ref: shortRef, commit, fecha, repo: url };
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
