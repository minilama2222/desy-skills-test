# 12: Reporte — JSON + Scorecard

**What to build:** El agregado de Grades por Skill, con el hash del Pin testeado, en JSON (fuente de verdad) y renderizado a un Scorecard legible (tabla por Skill: casos, guards, Grade). El JSON es lo que consume CI.

**Blocked by:** 05

**Status:** done

- [x] El reporte JSON agrega Grades por Skill e incluye el hash del Pin
- [x] Se renderiza un Scorecard legible desde ese JSON
- [x] El Scorecard muestra qué Caso/Check falló sin leer transcripciones
- [x] El formato JSON es estable y apto para CI
- [x] Test unitario del agregado a partir de Grades de ejemplo

## Cómo quedó

- **Agregado puro** (`src/scorecard.ts`): `agregarScorecard(ejecuciones, pin)`
  agrupa por Skill y Caso, y aplica el ADR-0007 (`veredictoDe`): descarta las
  Ejecuciones con `flujoAlcanzoSkill: false` y basta con que una de las que quedan
  sea correcta. Tercer estado **INDETERMINADO** cuando ninguna alcanzó el skill.
  El JSON declara siempre el Pin (ref + commit + fecha + repo).
- **La forma es estable**: todas las claves se emiten siempre (un reporte de CI no
  puede tener campos que aparezcan o desaparezcan según los datos).
- **Separa «no entregó» de «entregó mal»** (criterio 3 del ticket 15): cada Caso
  lleva `sinArtefacto` (con dato, sin Artefacto) y `entregoMal` (con Artefacto,
  sin EXCELENTE) como cuentas distintas.
- **Guards OK + Grade de calidad** (criterio 5 del ticket 08): el resumen apunta a
  la mejor Ejecución que alcanzó el skill (más guards pasados, a igualdad mejor
  Grade); el Caso indeterminado queda en `0/0` porque no hubo Ejecución que juzgar.
- **Persistencia** (`src/reportes.ts`): `run` guarda cada Ejecución en
  `reports/ejecuciones/<skill>/<caso>/<n>.json` (numeradas, sin pisarse) y `report`
  las lee, escribe `reports/scorecard.json` (fuente de verdad) + `reports/scorecard.md`
  y muestra el markdown en stdout (las rutas, por stderr, para no ensuciar la
  salida que consume CI). `reports/` está gitignored.
- **Todas las cuentas del Caso se miden sobre el denominador limpio** (las
  Ejecuciones que alcanzaron el skill): `correctas + entregoMal + sinArtefacto ==
  alcanzaronSkill`. Así un Caso INDETERMINADO sale a cero en las tres y no se
  contradice con su veredicto (el bug que cazó la review: `correctas` contaba
  todas las EXCELENTE aunque ninguna alcanzara el skill).
- **Tests**: 18 en `test/scorecard.test.ts` (agregado: veredicto, denominador
  limpio, separación de entregas, forma del JSON, guards/calidad; render: pin,
  tabla, fallos, indeterminado) + 5 en `test/reportes.test.ts` (round-trip,
  árbol de varios Skill/Caso, N Ejecuciones, vacío). 301 en total.

## Notas

- El comando que corre **todos** los Casos y devuelve exit code para CI es el
  ticket 13 (Bloqueado por este); aquí queda el agregado + render + la
  persistencia que ese comando consumirá.


## Notas

- **Aplicar el ADR-0007 al agregar**: un Caso se corre 3 veces; se descartan las
  Ejecuciones que no alcanzaron el skill (`flujoAlcanzoSkill: false`), y **basta
  con que una** de las que quedan sea correcta. El scorecard debe poder
  representar el tercer estado, **Caso indeterminado** (ninguna Ejecución alcanzó
  el skill), que **no** es un suspenso del skill.
- Los dos ejes del ticket 15 (`entrega`, `flujoAlcanzoSkill`) son lo que hace
  agregable el resultado: sin ellos, «no entregó» y «entregó mal» contarían igual.


