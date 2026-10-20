import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_REPO, normalizeRef, readPin, type Pin } from "./pin.js";
import { REPO_ROOT } from "./repo.js";

export const VENDOR_DIR = join(REPO_ROOT, "vendor", "desy-skills");
export const PIN_PATH = join(REPO_ROOT, "pin.json");

const SHA_RE = /^[0-9a-f]{7,40}$/i;

export function isSha(ref: string): boolean {
  return SHA_RE.test(ref);
}

export function refCandidates(ref: string): string[] {
  return [`refs/heads/${ref}`, `refs/tags/${ref}`, ref];
}

export interface GitRunner {
  run(args: string[]): string;
}

export const realGit: GitRunner = {
  run(args: string[]): string {
    return execFileSync("git", args, { encoding: "utf8" });
  },
};

export function resolveCommit(git: GitRunner, url: string, ref: string): string {
  for (const candidate of refCandidates(ref)) {
    const out = git.run(["ls-remote", url, candidate]).trim();
    const commit = out.split(/\s+/)[0];
    if (commit) return commit;
  }
  throw new Error(`No se pudo resolver el ref "${ref}" en ${url}`);
}

export interface BumpFs {
  copyVendor(tmp: string, vendorDir: string): void;
  writePin(pinPath: string, pin: Pin): void;
}

export const realFs: BumpFs = {
  copyVendor,
  writePin(pinPath: string, pin: Pin): void {
    writeFileSync(pinPath, JSON.stringify(pin, null, 2) + "\n", "utf8");
  },
};

export interface BumpOptions {
  ref: string;
  url: string;
  fecha: string;
  vendorDir?: string;
  pinPath?: string;
}

export function copyVendor(tmp: string, vendorDir: string): void {
  rmSync(vendorDir, { recursive: true, force: true });
  mkdirSync(vendorDir, { recursive: true });
  for (const entry of readdirSync(tmp)) {
    if (entry === ".git") continue;
    cpSync(join(tmp, entry), join(vendorDir, entry), { recursive: true });
  }
}

export function bumpPin(
  git: GitRunner,
  opts: BumpOptions,
  fs: BumpFs = realFs,
): Pin {
  const shortRef = normalizeRef(opts.ref);
  const commit = isSha(shortRef)
    ? shortRef
    : resolveCommit(git, opts.url, shortRef);

  const vendorDir = opts.vendorDir ?? VENDOR_DIR;
  const pinPath = opts.pinPath ?? PIN_PATH;
  const tmp = join(REPO_ROOT, ".vendor-tmp");
  if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });

  git.run(["clone", "--quiet", opts.url, tmp]);
  git.run(["-C", tmp, "checkout", "--quiet", commit]);
  fs.copyVendor(tmp, vendorDir);
  rmSync(tmp, { recursive: true, force: true });

  const pin: Pin = { ref: shortRef, commit, fecha: opts.fecha, repo: opts.url };
  fs.writePin(pinPath, pin);
  return pin;
}

export function currentRepo(pinPath: string = PIN_PATH): string {
  try {
    return readPin(pinPath).repo ?? DEFAULT_REPO;
  } catch {
    return DEFAULT_REPO;
  }
}
