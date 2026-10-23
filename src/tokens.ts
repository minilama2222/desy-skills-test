export const ESCALA_ESPACIADO: Record<string, string> = {
  xs: "0.25rem",
  sm: "0.5rem",
  base: "1rem",
  lg: "1.75rem",
  xl: "2.5rem",
  "2xl": "5rem",
  "3xl": "10rem",
};

export const FAMILIAS_COLOR = [
  "primary",
  "neutral",
  "warning",
  "success",
  "info",
  "alert",
] as const;

export type FamiliaColor = (typeof FAMILIAS_COLOR)[number];

const FAMILIAS_COLOR_SET = new Set<string>(FAMILIAS_COLOR);

const CLASES_TIPOGRAFICAS = [
  "c-h1",
  "c-h2",
  "c-h3",
  "c-h4",
  "c-paragraph-base",
  "c-paragraph-lg",
  "c-paragraph-sm",
] as const;

const CLASES_TIPOGRAFICAS_SET = new Set<string>(CLASES_TIPOGRAFICAS);

const PREFIJOS_UTILITY = "bg|text|border|ring|from|to|via|fill|stroke";
const PREFIJOS_SPACING = "p|m|gap|space";

const COMBINADOR_UTILITY = new RegExp(
  `^(?:${PREFIJOS_UTILITY})-[a-z-]+(?:-(?:base|dark|light|lighter))?$`,
);

const ARBITRARIA_RE = /-\[[^\]]+\]/;

/**
 * Los sufijos que **no** son una paleta de color, sino un modificador de la
 * utility: alineación y tamaño de texto (`text-center`, `text-sm`), lados y
 * grosores de borde (`border-b`, `border-2`)… Mirarlos como «color» era un falso
 * positivo del guard: `border-b` no es un color fuera del sistema, es el borde
 * de abajo.
 */
const MODIFICADORES_NO_COLOR = new Set([
  "left",
  "center",
  "right",
  "justify",
  "start",
  "end",
  "top",
  "bottom",
  "middle",
  "baseline",
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "t",
  "b",
  "l",
  "r",
  "x",
  "y",
  "s",
  "e",
  "collapse",
  "separate",
  "hidden",
  "solid",
  "dashed",
  "dotted",
  "double",
  "none",
]);

/**
 * Una utility de color: `text-blue-700`, `bg-primary-base`, `border-neutral-dark`.
 * El segmento tras el prefijo debe ser una **paleta** (`blue`, `primary`…), no un
 * modificador (`center`, `sm`, `b`). El segundo segmento, si lo hay, es un tono
 * (`base`, `700`) — pero `primary` a secas también cuenta.
 */
export function esUtilityColor(clase: string): boolean {
  const match = new RegExp(`^(?:${PREFIJOS_UTILITY})-([a-z]+)(?:-([a-z0-9]+))?$`).exec(clase);
  if (!match) return false;
  const paleta = match[1]!;
  if (MODIFICADORES_NO_COLOR.has(paleta) && match[2] === undefined) return false;
  return true;
}

const SPACING_UTILITY_RE = new RegExp(
  `^(?:${PREFIJOS_SPACING})[trblxy]*(?:-[xy])?-(.+)$`,
);

export function esTokenEspaciado(token: string): boolean {
  return Object.prototype.hasOwnProperty.call(ESCALA_ESPACIADO, token);
}

export function esClaseTipografica(clase: string): boolean {
  return CLASES_TIPOGRAFICAS_SET.has(clase);
}

export function tiposDeClaseTipografica(): string[] {
  return [...CLASES_TIPOGRAFICAS];
}

export function familiaColor(clase: string): FamiliaColor | undefined {
  const match = new RegExp(`^(?:${PREFIJOS_UTILITY})-([a-z]+)(?:-[a-z]+)?$`).exec(clase);
  if (!match) return undefined;
  const familia = match[1]!;
  return FAMILIAS_COLOR_SET.has(familia) ? (familia as FamiliaColor) : undefined;
}

export function esUtilityArbitraria(clase: string): boolean {
  return ARBITRARIA_RE.test(clase);
}

export function esColorDelSistema(clase: string): boolean {
  return familiaColor(clase) !== undefined;
}

export function esUtilitySpacing(clase: string): boolean {
  return SPACING_UTILITY_RE.test(clase);
}

/**
 * ¿Es una utility con un valor de la escala por defecto de Tailwind (prohibida
 * por el sistema) en vez de un token DESY?
 *
 * Matices anclados en el propio Gold oficial (`desy-styles-reference`):
 * - **`0` no es un valor de escala inventado**: `mb-0`, `p-0` son *resets* a cero
 *   (quitar el margen que puso el sistema), no un espaciado a ojo. El sistema no
 *   tiene un token «0» porque no es espaciado, es ausencia de él.
 * - **`black` y `white` son neutros del sistema**: el Gold los usa (`border-black`
 *   en los inputs, `text-black`). No son familias de Tailwind ajenas.
 */
export function esUtilityTailwindPorDefecto(clase: string): boolean {
  const spacing = SPACING_UTILITY_RE.exec(clase);
  if (spacing) {
    const valor = spacing[1]!;
    if (valor === "0") return false;
    return /^[0-9]+(?:[0-9.]*)?$/.test(valor);
  }

  if (esNeutroBasico(clase)) return false;
  if (esUtilityColor(clase) && !esColorDelSistema(clase)) return true;

  return false;
}

/** `black`/`white` en cualquier utility de color (`border-black`, `text-white`). */
function esNeutroBasico(clase: string): boolean {
  return /^(?:bg|text|border|ring|from|to|via|fill|stroke)-(?:black|white)$/.test(clase);
}

export function esUtilityTokenValido(clase: string): boolean {
  if (esUtilityArbitraria(clase)) return false;
  if (esUtilityTailwindPorDefecto(clase)) return false;

  const spacing = SPACING_UTILITY_RE.exec(clase);
  if (spacing) return spacing[1] === "0" || esTokenEspaciado(spacing[1]!);

  return COMBINADOR_UTILITY.test(clase) && familiaColor(clase) !== undefined;
}
