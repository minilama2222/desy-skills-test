# 20: Señal de progreso de la suite (por dónde va, cuánto lleva, cuánto queda)

**What to build:** Que `npm run suite` diga, mientras corre, **por dónde va**
(Caso i de N), **cuánto lleva** (tiempo transcurrido) y **cuánto queda**
(estimación). Hoy solo anuncia una línea por **intento**, sin total ni tiempo: en
una corrida de 14 Casos eso deja media hora sin señal.

**Blocked by:** —

**Status:** done

- [x] Cada Caso anuncia, al empezar, `[i/N] <skill>/<caso> — empezando ·
      transcurrido <t> · quedan ~<t>` (la estimación solo si ya hay algún Caso
      hecho)
- [x] Al terminar el Caso: `[i/N] <skill>/<caso> — hecho en <t> · quedan ~<t>`
- [x] La línea de intento conserva lo que ya dice (faltan N entregas) y **añade**
      el tiempo transcurrido
- [x] Todo por **stderr**: stdout sigue llevando el Scorecard y tiene que poder
      redirigirse a un fichero
- [x] El resumen final dice cuánto duró la suite
- [x] Reglas puras y probadas: `duracionLegible(ms)` y
      `restoEstimadoMs(transcurrido, completados, total)`, con sus bordes
      (0 Casos hechos ⇒ sin estimación; no falta ninguno ⇒ sin estimación;
      valor imposible ⇒ `—`)

## Por qué

Se midió en la suite del 19/11: pasaron más de veinte minutos sin forma de saber
si iba por la mitad, si se había quedado colgada o cuánto faltaba. El `anunciar`
actual es por intento y no lleva ni índice de Caso ni reloj.

## Forma propuesta (validada a mano, no commiteada)

```ts
// src/progreso.ts — puras, sin reloj ni consola
export function duracionLegible(ms: number): string;
// 900 → "900ms" · 12_000 → "12s" · 184_000 → "3m 04s" · 3_725_000 → "1h 02m"

export function restoEstimadoMs(
  transcurridoMs: number,
  completados: number,
  total: number,
): number | undefined;
// promedio por Caso × los que faltan; undefined si completados = 0 o no falta ninguno
```

Y en el bucle de `src/cli.ts`, envolver `correrCaso` con las líneas de arriba,
midiendo `Date.now()` al empezar la suite y al empezar cada Caso.

## Lo que NO cambia

- El formato de stdout (el Scorecard) ni el exit code.
- El `anunciar` por intento: se conserva y se le añade el reloj.
- Nada de barras animadas ni dependencias: son líneas de texto, una por evento.

## Nota operativa

No se puede implementar **mientras corre una suite**: crear un fichero en el repo
hace saltar al vigilante (ADR-0019) y aborta la Ejecución en curso. Es el fallo
del ticket 17 (`el-vigilante-acusa-una-edicion-del-mantenedor`), todavía abierto.
Mientras siga abierto, esta feature se construye **antes** de lanzar la suite, no
en paralelo.
