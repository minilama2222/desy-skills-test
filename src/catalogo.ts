import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "./repo.js";

// Fuente de verdad de los params/variantes de cada componente DESY: el catálogo
// del skill `desy-component-recognizer`, copiado a vendor/ con el Pin.
export const CATALOGO_PATH = join(
  REPO_ROOT,
  "vendor",
  "desy-skills",
  "skills",
  "desy-component-recognizer",
  "assets",
  "catalog.json",
);

interface ParamCatalogo {
  name: string;
}

interface EntradaCatalogo {
  params?: ParamCatalogo[];
}

type Catalogo = Record<string, EntradaCatalogo>;

let cache: Catalogo | undefined;

function cargarCatalogo(): Catalogo {
  if (cache) return cache;
  cache = JSON.parse(readFileSync(CATALOGO_PATH, "utf8")) as Catalogo;
  return cache;
}

/**
 * Deriva la clave del catálogo (kebab-case) a partir del nombre del macro.
 * `componentButton` → `button`; `componentDateInput` → `date-input`.
 * Devuelve undefined si el macro no sigue la convención `componentXxx`.
 */
export function componenteDeMacro(macro: string): string | undefined {
  const match = /^component([A-Z].*)$/.exec(macro);
  if (!match) return undefined;
  return match[1]!
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

/**
 * Devuelve la lista de nombres de props válidas del componente que implementa
 * el macro, según `params` del catálogo. Devuelve undefined si el macro no
 * corresponde a ningún componente del catálogo.
 */
export function propsValidasDeMacro(macro: string): string[] | undefined {
  const componente = componenteDeMacro(macro);
  if (!componente) return undefined;
  const entrada = cargarCatalogo()[componente];
  if (!entrada || !Array.isArray(entrada.params)) return undefined;
  return entrada.params.map((p) => p.name);
}
