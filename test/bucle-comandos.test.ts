import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../src/repo.js";

/**
 * Ticket 26: los documentos del bucle citaban `npm run run <skill>/<caso>`, que
 * imprime la ayuda y sale. Nadie lo vio porque **nada** leía esos ficheros: la
 * prosa del bucle no la valida ningún guardarraíl, así que derivó del CLI sin
 * que un rojo lo dijera.
 *
 * Este test cierra esa puerta por lo barato: cada `npm run <script>` que citan
 * tiene que existir en `package.json`, y el comando del bucle no puede volver a
 * la forma posicional.
 */

const DOCUMENTOS = [
  ".opencode/skills/refinar-skill/SKILL.md",
  ".opencode/skills/refinar-skill/FASES.md",
  ".scratch/bucle-de-refinamiento/peticiones/_plantilla.md",
] as const;

const leer = (ruta: string): string => readFileSync(join(REPO_ROOT, ruta), "utf8");

const scripts = (): Record<string, string> =>
  (JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
    scripts: Record<string, string>;
  }).scripts;

describe("los comandos que cita el bucle existen (ticket 26)", () => {
  it("cada `npm run <script>` de los documentos del bucle está en package.json", () => {
    const disponibles = scripts();
    const citados: { documento: string; script: string }[] = [];

    for (const documento of DOCUMENTOS) {
      for (const m of leer(documento).matchAll(/npm run ([\w:-]+)/g)) {
        citados.push({ documento, script: m[1]! });
      }
    }

    // Si el bucle dejara de citar comandos, este test no estaría probando nada.
    expect(citados.length).toBeGreaterThan(3);
    expect(citados.filter((c) => disponibles[c.script] === undefined)).toEqual([]);
  });

  it("el comando de medir no vuelve a la forma posicional (`npm run run <skill>/<caso>`)", () => {
    for (const documento of DOCUMENTOS) {
      const texto = leer(documento);
      // `npm run run -- --skill …` es la forma buena: después de `run` viene `--`.
      // La mala pone el Caso pegado, y el CLI imprime la ayuda sin medir nada.
      expect(texto, `${documento} cita \`npm run run\` sin \`--\``).not.toMatch(
        /npm run run (?!-)/,
      );
    }
  });
});
