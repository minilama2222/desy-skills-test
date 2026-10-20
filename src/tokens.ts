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

const COLOR_UTILITY_RE = new RegExp(
  `^(?:${PREFIJOS_UTILITY})-[a-z]+(?:-[a-z0-9]+)?$`,
);

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

export function esUtilityColor(clase: string): boolean {
  return COLOR_UTILITY_RE.test(clase);
}

export function esUtilityTailwindPorDefecto(clase: string): boolean {
  const spacing = SPACING_UTILITY_RE.exec(clase);
  if (spacing) return /^[0-9]+(?:[0-9.]*)?$/.test(spacing[1]!);

  if (esUtilityColor(clase) && !esColorDelSistema(clase)) return true;

  return false;
}

export function esUtilityTokenValido(clase: string): boolean {
  if (esUtilityArbitraria(clase)) return false;
  if (esUtilityTailwindPorDefecto(clase)) return false;

  const spacing = SPACING_UTILITY_RE.exec(clase);
  if (spacing) return esTokenEspaciado(spacing[1]!);

  return COMBINADOR_UTILITY.test(clase) && familiaColor(clase) !== undefined;
}
