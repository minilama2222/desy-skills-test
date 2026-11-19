# 21: Un SUT que deja de responder cuelga la suite y se cuenta como fallo del skill

**What to build:** Que una Ejecución cuyo SUT se queda sin respuesta (stream muerto,
`ENOTFOUND`, equipo suspendido) **termine**, y que su resultado se distinga de un
fallo del skill: no es «no entregó», es «no se pudo medir».

**Blocked by:** —

**Status:** ready-for-human
**Status depende de:** el visto bueno a la decisión del último criterio: hoy un corte
por infraestructura **consume intento** (el presupuesto es también de reloj), pero no
cuenta como entrega fallida ni como dato del skill. Construido y verde; lo que falta
es la aceptación.

- [x] `ejecutarConGuardiaDelRepo` pasa `timeout` a `spawnSync`: hoy no hay ninguno,
      así que un proceso que no responde bloquea la suite **para siempre**
- [x] El límite es configurable (`DESY_SUT_TIMEOUT_MS` o equivalente) con un valor
      por defecto documentado y holgado: los intentos normales tardaron 1-6 min y
      el más largo **que entregó algo**, ~12 min
- [x] Un timeout produce una Ejecución **marcada como infraestructura**, no como
      `sin-artefacto` del skill
- [x] Un `provider.transport` / `ENOTFOUND` / `ETIMEDOUT` en la salida se marca
      igual: el SUT existió, pero no hubo medida
- [x] El Scorecard los cuenta aparte y no los suma a `No entregó`
- [x] Tests: un SUT falso que duerme más que el límite (con `DESY_OPENCODE_BIN`,
      como `runner.test.ts` ya hace) y uno que imprime `ENOTFOUND`
- [x] `docs/agents/testing.md` o el ADR que corresponda explica por qué el límite
      es de pared y no de CPU — ver `docs/adr/0021-el-sut-que-no-responde-se-corta.md`
- [ ] Decisión del humano: si un corte por infraestructura **consume intento**.
      Propuesta: sí lo consume (el presupuesto es de reloj también), pero no
      cuenta como entrega fallida ni como dato del skill. **Implementado así**:
      falta aceptarlo o pedir el cambio

## La evidencia (suite del 19/11/2026)

`npm run suite` tardó **3 h 05 min** donde el ritmo normal pedía ~1 h. Dos causas
medidas, las dos con el mismo patrón:

1. **`politicas-privacidad`, intento 2.** El Mac entró en `Idle Sleep` a las
   20:56:26 y despertó a las 20:59:12. La conexión TLS murió con el sueño; el
   proceso siguió 18 min con 0,0 % de CPU, sin escribir en su log y con el socket
   `ESTABLISHED` en el kernel pero mudo. Se mató a mano.
2. **`politicas-privacidad`, intento 4.** Sin suspensión: 20 min con 1,53 s de CPU
   acumulada y dos conexiones `:443` abiertas. Mismo cuadro. Se mató a mano.

Los dos quedaron como `exitCode: 130`, `entrega: sin-artefacto`, `grade:
INACEPTABLE`. Es decir: **la suite los contó como fallo del skill**, y el Caso
necesitó 6 intentos de 6 para llegar a sus 3 entregas.

Antes, en la corrida abortada del mismo día, `fieldset-grid-acciones` falló **6 de
6** por `getaddrinfo ENOTFOUND api.deepinfra.com`: ahí el proceso sí terminaba
solo, pero el resultado también se contaba como fallo del skill.

## Por qué es del harness y no del SUT

El SUT no puede arreglar que su proveedor deje un stream mudo ni que el portátil se
duerma. Lo que sí puede el harness es **poner un techo** y **nombrar la causa**. Hoy
no hace ni lo uno ni lo otro: el único mecanismo que cortó los cuelgues fue una
persona mirando la pantalla, dos veces.
