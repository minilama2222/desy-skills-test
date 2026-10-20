import { describe, expect, it, vi } from "vitest";
import {
  bumpPin,
  isSha,
  refCandidates,
  resolveCommit,
  type GitRunner,
} from "../src/bump.js";

describe("isSha", () => {
  it("reconoce un SHA de 40 caracteres", () => {
    expect(isSha("b523ca7df8594532f5fd47376894c16bc8f1b5df")).toBe(true);
  });

  it("reconoce un SHA corto", () => {
    expect(isSha("b523ca7")).toBe(true);
  });

  it("rechaza un nombre de rama", () => {
    expect(isSha("main")).toBe(false);
  });
});

describe("refCandidates", () => {
  it("prueba rama, tag y el ref desnudo, en ese orden", () => {
    expect(refCandidates("v1.0")).toEqual([
      "refs/heads/v1.0",
      "refs/tags/v1.0",
      "v1.0",
    ]);
  });
});

describe("resolveCommit", () => {
  const runnerReturning = (outputs: string[]): GitRunner => {
    const run = vi.fn(() => outputs.shift() ?? "");
    return { run } as unknown as GitRunner;
  };

  it("devuelve el commit del primer candidato que resuelve", () => {
    const git = runnerReturning(["abc123\trefs/heads/main"]);
    expect(resolveCommit(git, "url", "main")).toBe("abc123");
  });

  it("cae al siguiente candidato si el primero no resuelve", () => {
    const git = runnerReturning(["", "def456\trefs/tags/v1"]);
    expect(resolveCommit(git, "url", "v1")).toBe("def456");
  });

  it("lanza si ningún candidato resuelve", () => {
    const git = runnerReturning(["", "", ""]);
    expect(() => resolveCommit(git, "url", "nope")).toThrow(/nope/);
  });
});

describe("bumpPin", () => {
  const stubFs = () => {
    const copyVendor = vi.fn();
    const writePin = vi.fn();
    return { fs: { copyVendor, writePin }, copyVendor, writePin };
  };

  const makeGit = (resolved: Record<string, string>) => {
    const run = vi.fn((args: string[]) => {
      if (args[0] === "ls-remote") {
        return resolved[args[args.length - 1] ?? ""] ?? "";
      }
      return "";
    });
    return { run } as unknown as GitRunner;
  };

  it("con un SHA crudo no consulta ls-remote y usa el SHA como commit", () => {
    const git = makeGit({});
    const { fs } = stubFs();
    const sha = "b523ca7df8594532f5fd47376894c16bc8f1b5df";
    const pin = bumpPin(git, { ref: sha, url: "url", fecha: "2026-10-20" }, fs);

    expect(pin.commit).toBe(sha);
    const lsRemoteCalls = (git.run as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c) => (c[0] as string[])[0] === "ls-remote",
    );
    expect(lsRemoteCalls).toHaveLength(0);
  });

  it("con una rama resuelve el commit vía git y persiste el pin", () => {
    const git = makeGit({ "refs/heads/main": "abc123\trefs/heads/main" });
    const { fs, writePin } = stubFs();
    const pin = bumpPin(git, { ref: "main", url: "url", fecha: "2026-10-20" }, fs);

    expect(pin.commit).toBe("abc123");
    expect(pin.ref).toBe("main");
    expect(writePin).toHaveBeenCalledOnce();
  });
});
