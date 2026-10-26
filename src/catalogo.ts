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

interface EjemploCatalogo {
  name: string;
}

interface EntradaCatalogo {
  params?: ParamCatalogo[];
  examples?: EjemploCatalogo[];
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

/**
 * Sinónimos de componente que usa el linter del skill (`assets/linter.py`):
 * un nombre coloquial que apunta a la entrada real del catálogo.
 */
const SINONIMOS_COMPONENTE: Record<string, string> = {
  link: "links-list",
  "c-link": "links-list",
  radio: "radios",
  checkbox: "checkboxes",
};

/** Traducciones español↔inglés del linter (frases multi-palabra primero). */
const TRADUCCIONES: Record<string, string> = {
  "por defecto": "default",
  primario: "primary",
  alerta: "alert",
  exito: "success",
  advertencia: "warning",
  informacion: "info",
  transparente: "transparent",
  deshabilitado: "disabled",
  activo: "active",
  pequeno: "small",
  mediano: "medium",
  grande: "large",
  habilitado: "enabled",
  enlace: "link",
  icono: "icon",
  error: "error",
  pista: "hint",
  multiples: "multi",
  actual: "current",
  submenu: "submenu",
  niveles: "level",
  nivel: "level",
};

/** Normaliza como el linter: minúsculas, sin tildes, espacios colapsados. */
function normalizarLinter(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Traduce español→inglés como el linter, para que `primario` y `primary` sean
 * el mismo hecho. Frases multi-palabra primero.
 */
function traducirLinter(s: string): string {
  let out = normalizarLinter(s);
  const claves = Object.keys(TRADUCCIONES).sort(
    (a, b) => b.split(" ").length - a.split(" ").length,
  );
  for (const k of claves) {
    out = out.replace(new RegExp(`\\b${k}\\b`, "g"), TRADUCCIONES[k]!);
  }
  return out;
}

/**
 * ¿El SUT declaró un **componente que existe en el catálogo**? Es la validación
 * del `desy-component-recognizer` contra `catalog.json` (no a ojo): el nombre
 * declarado ha de resolver a una entrada real, con los sinónimos del linter
 * (`link` → `links-list`). Insensible a mayúsculas, tildes y espacios.
 */
export function componenteEnCatalogo(nombre: string): boolean {
  const canonico = normalizarLinter(nombre);
  const clave = SINONIMOS_COMPONENTE[canonico] ?? canonico;
  return Object.hasOwn(cargarCatalogo(), clave);
}

/** Clase CSS usada como variante (`c-button--primary`): el linter la rechaza. */
const CLASE_CSS = /^(c-|ds-|\.c-)/;

/**
 * ¿La variante declarada es un **ejemplo documentado** del componente en el
 * catálogo? Normaliza y traduce español↔inglés como el linter (`primario` ≡
 * `primary`), acepta match exacto o substring, y rechaza una clase CSS usada
 * como variante. Devuelve falso si el componente no existe.
 *
 * No usa el fuzzy `SequenceMatcher` del linter (ratio ≥ 0.65): demasiado
 * permisivo para un Guard. Exacto + substring ya cubren el vocabulario real.
 */
export function varianteEnCatalogo(componente: string, variante: string): boolean {
  if (CLASE_CSS.test(normalizarLinter(variante))) return false;
  const canonico = normalizarLinter(componente);
  const clave = SINONIMOS_COMPONENTE[canonico] ?? canonico;
  const entrada = cargarCatalogo()[clave];
  if (!entrada || !Array.isArray(entrada.examples)) return false;

  const varNorm = normalizarLinter(variante);
  const varEn = traducirLinter(variante);
  for (const ejemplo of entrada.examples) {
    const ejNorm = normalizarLinter(ejemplo.name);
    const ejEn = traducirLinter(ejemplo.name);
    if (varNorm === ejNorm || varEn === ejEn || varNorm === ejEn) return true;
    if (ejNorm.includes(varNorm) || ejEn.includes(varNorm)) return true;
  }
  return false;
}
