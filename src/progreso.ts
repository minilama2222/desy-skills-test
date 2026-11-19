/**
 * Señal de progreso de una suite (ticket 20). Antes solo se anunciaba una línea
 * por **intento**, sin decir por dónde iba la suite ni cuánto faltaba: en una
 * corrida de 14 Casos eso deja media hora sin señal. Estas dos funciones son
 * puras para que el formato y la estimación se prueben sin reloj ni consola.
 */

/**
 * Una duración en milisegundos como texto corto y legible:
 * `900 → "900ms"`, `12_000 → "12s"`, `184_000 → "3m 04s"`, `3_725_000 → "1h 02m"`.
 * Se corta en la unidad mayor que tenga sentido: los segundos no llevan
 * decimales (una estimación con decimales finge una precisión que no hay).
 */
export function duracionLegible(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const segundosTotales = Math.round(ms / 1000);
  if (segundosTotales < 60) return `${segundosTotales}s`;
  const minutos = Math.floor(segundosTotales / 60);
  if (minutos < 60) return `${minutos}m ${String(segundosTotales % 60).padStart(2, "0")}s`;
  const horas = Math.floor(minutos / 60);
  return `${horas}h ${String(minutos % 60).padStart(2, "0")}m`;
}

/**
 * Lo que falta, estimado con el promedio por Caso ya completado: `transcurrido`
 * repartido entre `completados` Casos, multiplicado por los que faltan. Devuelve
 * `undefined` cuando todavía no hay con qué estimar (ningún Caso hecho) o cuando
 * no falta ninguno: una estimación inventada es peor que no dar estimación.
 */
export function restoEstimadoMs(
  transcurridoMs: number,
  completados: number,
  total: number,
): number | undefined {
  if (completados <= 0 || total <= completados) return undefined;
  const promedioPorCaso = transcurridoMs / completados;
  return promedioPorCaso * (total - completados);
}
