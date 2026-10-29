import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CasoComponente } from "../src/caso.js";
import { readPin } from "../src/pin.js";
import { createSandbox, datosDirDeHome, runCaso, skillsDirDeConfig, type CommandRunner, type Entorno } from "../src/runner.js";

const pin = readPin(join(process.cwd(), "pin.json"));

const caso: CasoComponente = {
  tipo: "caso-componente",
  skill: "implement-component",
  id: "boton-primario",
  prompt: "Genera un botón primario tamaño estándar con texto 'Enviar'",
  checks: [],
};

describe("runCaso (smoke de integración con sandbox real)", () => {
  it("crea el sandbox, copia los skills del Pin, corre opencode y captura Evidencia, y limpia", async () => {
    let sandboxCreado: ReturnType<typeof createSandbox> | undefined;
    let entornoVisto: Entorno | undefined;
    let cwdVisto: string | undefined;
    let promptVisto: string | undefined;
    let skillsDuranteElRun: boolean | undefined;

    const command: CommandRunner = {
      run: (args, opts) => {
        cwdVisto = opts.cwd;
        entornoVisto = opts.env;
        promptVisto = args[args.length - 1];
        skillsDuranteElRun = existsSync(
          join(skillsDirDeConfig(opts.env.XDG_CONFIG_HOME ?? ""), "desy-preflight-check", "SKILL.md"),
        );
        return {
          stdout: "» skill: preflight-check\n» skill: implement-component\n",
          stderr: "",
          code: 0,
        };
      },
    };

    const sandboxFactory = {
      create: () => {
        sandboxCreado = createSandbox();
        return sandboxCreado;
      },
    };

    const resultado = await runCaso(caso, pin, { sandbox: sandboxFactory, command });

    const sandbox = sandboxCreado;
    if (!sandbox) throw new Error("el sandbox no se creó");
    expect(skillsDuranteElRun).toBe(true);
    expect(cwdVisto).toBe(sandbox.workDir);
    expect(entornoVisto).toEqual({
      HOME: sandbox.home,
      XDG_CONFIG_HOME: sandbox.configDir,
      OPENCODE_HOME: datosDirDeHome(sandbox.home),
    });
    expect(promptVisto).toBe(caso.prompt);

    expect(resultado.transcript.invocaciones).toEqual([
      "preflight-check",
      "implement-component",
    ]);
    expect(resultado.artefactos).toEqual({ files: {} });

    expect(existsSync(sandbox.home)).toBe(false);
    expect(existsSync(sandbox.workDir)).toBe(false);
  });
});
