# 07: Destacar la entrega correcta que no invocó el skill

**What to build:** Cuando una Ejecución entrega un Artefacto correcto **sin** invocar el skill bajo test, el informe lo destaca como hallazgo de **trigger** (frontmatter/descripción), no lo entierra.

**Blocked by:** 06

**Status:** done

- [x] La condición es `entrega === "con-artefacto"` y `grade === EXCELENTE` y `flujoAlcanzoSkill === false`
- [x] El hallazgo aparece en lo alto del informe del Caso y en la cabecera del scorecard
- [x] El veredicto sigue descartando esa Ejecución como dato (no se convierte en PASA), pero la evidencia no se pierde
- [x] Test con el caso real del 27/10 (`HALLAZGO-tokens-fichero-de-ejemplo.md:140-153`)

## Por qué

El 27/10 la única entrega EXCELENTE de la corrida se descartó porque el agente nunca invocó el skill: escribió el fichero correcto sin leerlo. Eso es un problema de **descripción de trigger** y es información sobre el skill, no ruido. Hoy el scorecard lo tira a la basura.

## Notas de implementación

- **El predicado vive junto al veredicto.** `esHallazgoDeTrigger` está en
  `src/scorecard.ts`, al lado de `veredictoDe`, que es quien descarta la
  Ejecución: si la regla de «descarto» y la de «lo destaco» viven separadas,
  pueden divergir y el hallazgo quedarse sin disparar el día que cambie el
  denominador. `src/informe.ts` lo **re-exporta**; la llama el informe del Caso,
  pero la define el módulo que descarta.
- **Se cuenta en el Caso, no se infiere de la tabla.** `CasoScorecard` gana
  `hallazgosDeTrigger` y `triggerConEvidencia`. Se cuentan sobre **todas** las
  Ejecuciones del Caso, no sobre el denominador limpio: es exactamente ahí donde
  el ADR-0007 las deja fuera. La forma es estable —cero, nunca ausente—, como el
  resto del JSON de CI.
- **La evidencia se remite, no se reemplaza.** `ResultadoEjecucion.evidencia`
  guarda la ruta del JSON con el que la Ejecución se persistió. La escribe
  `guardarConSuEvidencia` (`src/cli.ts`) al guardar, no el grader: sólo existe si
  la Ejecución está en disco. De paso, `suite` y `run` guardan cada Ejecución **al
  terminar**, no al acabar el Caso: una suite interrumpida conserva lo medido.
  (`run` ya las guardaba al final; sigue guardándolas, ahora también con su ruta.)
- **Dónde sale.** En el `informe/<skill>/<caso>.md`, entre el H1 y el prompt: una
  cita con el porqué (frontmatter, no Checks) y una línea por Ejecución con su
  Grade, su Flujo, su Artefacto y su Evidencia. En el `scorecard.md`, una sección
  `## ⚠ Hallazgo de trigger` antes de la primera tabla, con la cuenta por Caso y
  el veredicto que lo descarta —para que nadie lea «hallazgo» como «pasó»—.
- **Sigue sin haber juicio.** El texto dice hecho y consecuencia («se arregla en
  el frontmatter»), no culpabilidad del skill ni del check: la regla de «presenta,
  no adivina» del ticket 06 sigue en pie, y un test del informe lo comprueba sobre
  la corrida real.
- **Glosario.** «Hallazgo de trigger» pasa a ser término del dominio
  (`GLOSSARY.md`), con su `_Avoid_`: no es PASA, no es fallo del SUT ni del Check.

## Verificación

- `test/scorecard.test.ts`: 9 casos sobre la corrida del 27/10 —la condición y
  cada término por separado, que el veredicto siga en INDETERMINADO con
  `correctas: 0`, el conteo por Caso, la Evidencia en disco, el cero estable y la
  cabecera antes de la tabla (y su ausencia cuando no hay hallazgo).
- `test/informe.test.ts`: 4 casos con la corrida real de
  `HALLAZGO-tokens-fichero-de-ejemplo.md:140-153` (las dos que no entregan y la
  tercera EXCELENTE que sólo pasó por `preflight-check`): lo alto del informe, la
  línea con Ejecución/Artefacto/Flujo/Evidencia, y el control sin hallazgo.
- `test/suite-cli.test.ts`: proceso real, SUT falso con una entrega `sin-skill`
  (escribe el Artefacto sin anunciar `implement-component`). Fija lo que el CLI
  deja en disco: `SUSPENDE` con `correctas: 0`, los dos contadores del hallazgo,
  la ruta de Evidencia escrita en el JSON, y el hallazgo en lo alto del
  `scorecard.md` y del informe. ~18 s, dentro de `SEGUNDOS_POR_EJECUCION`.
- Comprobado en rojo: con `src/` revertido a `eb7b565`, 10 de los 13 tests
  nuevos fallan (los tres de control siguen verdes a propósito).
