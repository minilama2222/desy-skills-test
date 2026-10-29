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

## Retro (29/10): lo que el propio 07 destapó en el entorno

El retro de este ticket no cambió el harness: cambió los check que **dicen**
cuidarlo. Los cuatro candidatos salieron de leer el código de los guardarraíles,
no la prosa, y el más grave estaba vivo en el árbol.

- **`verificar-tracker` tenía media regla.** Sólo cazaba `done` + casilla
  abierta. El 05 —construido, commiteado en `9042bdc`— seguía en
  `ready-for-human` con todas las casillas hechas: el mismo engaño, al revés.
  Ahora la contradicción se mira en las **dos** direcciones, y la excepción no se
  deduce: se declara con `**Status depende de:**`, que es lo que el 05 ya lleva.
  Se actualizaron `docs/agents/issue-tracker.md` y `CODING_STANDARDS.md`, que
  prometían «siempre falla».
- **`PENDIENTES_DE_ANCLAR` toleraba por ruta.** Progreso 11 de 12 en un Caso
  pendiente y la lista callaba igual. `deudaDeAnclaje` **mide** por Check y
  `verificar-casos` imprime, por Caso, cuántos faltan y **cuáles**: la deuda se ve
  disminuir sin abrir el Caso a mano, que es lo que el 12 necesita. Sigue **sin
  ser un rojo**: el 06 decidió tolerar la deuda mientras el Caso esté en la lista,
  y esta función no cambia esa decisión, sólo la hace legible. Lo que sí garantiza
  es que la tolerancia y la medida no discrepen: las dos salen de `checksSinAncla`.
- **«Ejecuciones» decía una cosa y la política otra.** `N_POR_DEFECTO` decía «3
  Ejecuciones» mientras el ADR-0014 dice que la N es de **entregas**. No se
  construye el 03 aquí: se nombra la diferencia en el código, el glosario
  (`Presupuesto de intentos`, `Ejecución`) y `CODING_STANDARDS.md`, y se reconcilia
  en `spec.md` («Cómo se leen las dos N mientras el ticket 03 no esté construido»),
  para que quien lo construya no tropiece con el mismo error que el test del 07.
- **Una Evidencia que no está donde se reporta.** `npm run report --reports
  <copia>` remitía a rutas que sólo existen donde se corrió; el adaptador descarta
  la ruta fantasma —sin mutar la Ejecución leída— y el hallazgo sale sin ella.
- **Un INDETERMINADO se leía como verde.** En CI sale con exit 0 y sólo la consola
  lo decía; la cabecera del `scorecard.md` lo dice ahora también, con la
  definición del glosario (sin dato para juzgar: ninguna alcanzó el skill **con** un
  Artefacto que graduar).
- **El hook del pre-commit**, una línea en `AGENTS.md`: llama al gate entero, así
  que un paso se añade en `package.json`.

Tests nuevos: 11 — 4 de `deudaDeAnclaje` y su control de la tolerancia por ruta,
4 del tracker (la dirección nueva, su control positivo, `done` + declaración, y el
`Status` leído sólo de la cabecera), 2 de la cabecera del scorecard y 2 de proceso
real (`report --reports`: una Evidencia fuera del árbol y otra dentro). Comprobado
en rojo contra `a32f3ed`: sin `src/` fallan los 10 tests del tracker (el import
mismo del módulo) y **8 más** de comportamiento; los de `deudaDeAnclaje` no
compilan sin la función nueva, y son el 11 y 12 del cambio.