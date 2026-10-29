# 03: Presupuesto de intentos hasta la entrega, con tope duro

**What to build:** El presupuesto por Caso es de **entregas**, no de Ejecuciones: se intenta hasta tener `n` entregas o agotar `n * 2` intentos, lo que antes llegue.

**Blocked by:** 01, 02

**Status:** done

- [x] `correrCaso` (`src/cli.ts`) sigue intentando mientras no haya `n` entregas y queden intentos
- [x] Tope duro configurable, por defecto `n * 2`; al agotarlo se para y el veredicto lo refleja (cero entregas ⇒ INDETERMINADO)
- [x] El scorecard muestra intentos usados además de entregas
- [x] Tests con `CommandRunner` inyectado: entrega a la primera (1 intento), entrega a la tercera, nunca entrega y topa
- [x] Un test que toca un proceso real, si hace falta, lleva su presupuesto de tiempo medido en comentario — no hizo falta: los dos dobles de `correrCaso` bastan, y `test/suite-cli.test.ts` conserva el suyo

## Comments

- 29/10 — Construido. `limiteDeIntentos` (`src/suite.ts`) es la regla pura del
  tope (`n * 2` por defecto); `correrCaso` se exporta y recibe sus `RunDeps`, para
  probar el bucle con un `CommandRunner` y un sandbox inyectados
  (`test/caso-presupuesto-correr-caso.test.ts`) sin abrir un proceso. `--tope` lo
  declara `run` y `suite`, y su frontera con la línea de órdenes tiene su propio
  test (`test/caso-presupuesto-tope-cli.test.ts`).
- El campo `ejecuciones` del scorecard pasa a **`entregas` + `intentos`**, y
  `resumen()` hace lo mismo: con el presupuesto en entregas, un nombre que dice
  «Ejecuciones» donde la regla cuenta entregas es lo que el glosario marca como
  hallazgo. La tabla y la consola muestran los dos.
- Al enchufar el presupuesto salió una contradicción que estaba callada: el
  veredicto descartaba las entregas que no alcanzaron el skill (ADR-0007), pero
  las cuentas las incluían (2 correctas con 3 intentos). Ahora `entregas`,
  `correctas` y `entregoMal` salen del mismo predicado que decide
  (`cuentaComoEntrega`, en `src/ejecutar.ts`), y el **bucle usa el mismo
  predicado**: un Artefacto escrito sin invocar el skill no cierra el presupuesto
  —si lo hiciera, un Caso terminaría sin haberse medido ni una vez—, y se cuenta
  aparte en `hallazgosConArtefacto`.
- Los contract tests de `test/suite-cli.test.ts` se ajustan al contrato nuevo.
  El guion del SUT falso deja de entregar «bueno» por defecto cuando se acaba su
  lista: repetir la última entrega es lo que evita que una lista corta cambie a
  mitad de corrida lo que el SUT entrega. `vistas` pasa a leerse de las marcas en
  disco (los intentos hechos), no de la lista de entregas, que desde este ticket
  ya no dice cuántos hubo. El diagnóstico que hubo aquí antes —«el `opencode`
  real pisa al preludio»— era **falso**: el preludio sí se imponía; el guion
  entregaba `bueno` al agotarse la lista y el contrato viejo de `vistas` no lo
  contemplaba.
- Revisado (dos ejes). Del eje Standards: `hallazgosConArtefacto` contaba
  `hallazgosDeTrigger` (no la clase que documenta), `leerTope` usaba
  `limiteDeIntentos` sólo para lanzar, y las citas a un «CODING_STANDARDS» que no
  dice eso. Del eje Spec: `--tope` no tenía test en su frontera (añadido) y
  `resumen()` seguía diciendo `ejecuciones` (renombrado). Todo corregido.
- `npm run precommit` en verde: los 9 guardarraíles y la suite entera.

## Rechazado a propósito

- **Nudge en el prompt** (recordar «escribe el fichero» al final): haría que el Caso mida un prompt inventado, no el skill.
- **Cambiar de modelo o variante**: rompe la comparabilidad (ADR-0001, ADR-0013).
