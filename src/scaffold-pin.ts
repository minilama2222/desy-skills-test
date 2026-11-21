import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./repo.js";

/**
 * La versión del **starter** DESY cacheado (ADR-0005). El Grade de un Caso
 * depende de ella tanto como del Pin de `desy-skills`, así que la medida tiene
 * que decir con cuál se hizo (ticket 39).
 */
export interface PinDelStarter {
  ref: string;
  commit: string;
  fecha: string;
  repo?: string;
}

/** El pin del starter que se versiona en el repo. */
export const SCAFFOLD_PIN_PATH = join(REPO_ROOT, "scaffold-pin.json");

/**
 * Lee el pin del starter. Un fichero ausente o malformado **no se inventa**: el
 * llamador decide (hoy, dejar la medida sin el dato y decirlo). A diferencia del
 * pin de skills, este no lo escribe ningún comando del harness: es una
 * declaración del mantenedor que se actualiza al regenerar la caché.
 */
export function readScaffoldPin(path: string = SCAFFOLD_PIN_PATH): PinDelStarter | undefined {
  if (!existsSync(path)) return undefined;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<PinDelStarter>;
    if (
      typeof raw.ref !== "string" ||
      typeof raw.commit !== "string" ||
      typeof raw.fecha !== "string"
    ) {
      return undefined;
    }
    return {
      ref: raw.ref,
      commit: raw.commit,
      fecha: raw.fecha,
      ...(typeof raw.repo === "string" ? { repo: raw.repo } : {}),
    };
  } catch {
    return undefined;
  }
}
