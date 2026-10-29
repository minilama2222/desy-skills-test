# 02: Runner observable — exit code y último paso del Flujo

**What to build:** Cada Ejecución registra el **exit code** del SUT y el **último paso** del Flujo alcanzado, para que el informe distinga un crash de un estancamiento.

**Blocked by:** —

**Status:** done

- [x] `realCommand.run` deja de descartar `code` (`src/runner.ts:270`, `:429`)
- [x] `ResultadoEjecucion` gana `exitCode: number` y `ultimoPasoDelFlujo: string | null`
- [x] Una Ejecución con exit ≠ 0 no se confunde con una que terminó bien y no entregó
- [x] Tests: exit 0 sin artefacto, exit ≠ 0 sin artefacto, exit 0 con artefacto, flujo vacío ⇒ `ultimoPasoDelFlujo: null`
- [x] `guardarEjecucion`/`leerEjecuciones` conservan los campos nuevos (el test de round-trip los cubre)

## Notas de implementación

- **Dos campos, no una causa enumerada.** `exitCode` y `ultimoPasoDelFlujo` son
  hechos; la causa («crasheó», «se perdió») se deriva de ellos en el informe
  (ticket 06), igual que el ticket 15 eligió dos ejes ortogonales sobre un enum.
- **El exit code viaja por la `Evidencia`.** `runCaso` ya recibía el `code` del
  `CommandRunner` y solo lo usaba para construir el resultado del comando; ahora
  lo eleva en `Evidencia.exitCode`. `ultimoPasoDelFlujo` es una regla pura en
  `src/ejecutar.ts` sobre el Flujo observado, no un campo del runner.
- **Test de forma actualizado, no código adaptado:** `test/runner.test.ts:204`
  fija las claves exactas de `Evidencia` con `toEqual`. Al añadir `exitCode` el
  test falló, que es su trabajo; se actualizó la expectativa.
- Las tres fixtures que construían `ResultadoEjecucion` a mano
  (`reportes`, `scorecard`, `suite`) declararon los campos nuevos.
- +5 tests, 511 en total. `npm run precommit` en verde.

