# 23: Dos corridas del mismo árbol de skills se pisan (no queda historia)

**What to build:** Que medir dos veces la misma versión de skills **no borre la
medida anterior**. Hoy `reports/versiones/<arbolHash>.json` se reescribe entero, así
que la segunda corrida machaca a la primera y no hay forma de comparar dos corridas
seguidas — que es justo el criterio `pasaSostenido` del ADR-0014.

**Blocked by:** —

**Status:** done

- [x] El fichero de versión guarda el **historial de corridas**: por cada una, su
      fecha y el veredicto de cada Caso (`skill/caso` → veredicto)
- [x] `skills` sigue siendo la **última** corrida, para que `diff-versiones` y
      todo lo que lee una versión sigan funcionando sin cambios
- [x] Al escribir se conserva el historial previo y se añade el nuevo, con un
      tope (10) para que el fichero no crezca sin fin
- [x] Un fichero **legado** sin historial se valida y se lee igual: al añadirle una
      corrida, su propia medida entra como primera entrada (con la fecha del Pin,
      la única que guarda) en vez de perderse
- [x] Tests de la regla de fusión, sin reloj: dos corridas dejan dos entradas, el
      tope recorta, el legado se conserva y `corridas` que no es lista se rechaza

## La evidencia (20/11/2026)

Anoche se lanzó la suite completa dos veces sin tocar `vendor/`:

| Hora | Qué queda |
|---|---|
| 19/11 23:54 | **nada**: el fichero se reescribió a las 06:36 |
| 20/11 05:34 → 06:36 | la única medida legible |

Y como el nombre del fichero es el hash del **árbol de skills**, cambiar prompts,
Casos o el runner **no cambia el nombre**: dos corridas del mismo Pin comparten
fichero. La única prueba de que hubo dos corridas fue el historial del shell.

## Por qué importa

`pasaSostenido` exige **dos corridas consecutivas** del mismo Caso para dar por
refinado un skill. Sin historial, esa regla no tiene de dónde leer: la primera
corrida desaparece justo cuando hace falta compararla.
