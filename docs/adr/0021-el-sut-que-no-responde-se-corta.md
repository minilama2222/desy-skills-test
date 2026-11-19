# Un SUT que deja de responder se corta a los 20 minutos, y no es un fallo del skill

Medido el 19/11/2026 en la primera suite con el harness arreglado (Pin `0d6263d`),
cerrando el ticket 21 del bucle de refinamiento.

## El hecho

Dos Ejecuciones de `implement-pattern/politicas-privacidad` se quedaron sin
respuesta del proveedor. La suite no tenía ningún techo, así que no seguía:

- **Intento 2.** El portátil entró en `Idle Sleep` a las 20:56:26 y despertó a las
  20:59:12. La conexión TLS murió con el sueño; el proceso siguió 18 min con 0,0 %
  de CPU, sin escribir en su log y con el socket `ESTABLISHED` en el kernel pero
  mudo.
- **Intento 4.** Sin suspensión: 20 min, 1,53 s de CPU acumulada y dos conexiones
  `:443` abiertas. El mismo cuadro.

Las dos las cortó una persona con `kill`. En la corrida de la mañana, el mismo
proveedor había hecho fallar 6 de 6 intentos con `getaddrinfo ENOTFOUND`, que sí
terminaban solos. En los tres casos la Ejecución quedó como `sin-artefacto`, es
decir: **el Scorecard contaba un fallo de infraestructura como un fallo del skill**.

## La decisión

1. **Techo de pared de 20 minutos por Ejecución** (`TIMEOUT_SUT_MS`), movible con
   `DESY_SUT_TIMEOUT_MS`. Los intentos normales tardan 1-6 min; el más largo que
   llegó a entregar algo, ~12.
2. **Es de pared, no de CPU.** Un proceso colgado también gasta milisegundos
   sueltos (medido: 10 ms cada varios minutos), así que «CPU quieta» no distingue
   un cuelgue de una generación lenta. Un techo de pared sí, y es exactamente lo
   que un humano acaba aplicando a mano.
3. **El corte se nombra.** La Evidencia lleva «no respondió en N ms… No es un
   fallo del skill», y la salida parcial se conserva: se pierde el final, no lo
   andado.
4. **La Ejecución se marca como infraestructura** (`tiempo` o `red`) y el
   Scorecard la cuenta en una columna aparte, «Sin medir». No engorda «No
   entregó», y sus Checks no entran en `fallos`.
5. **Consume intento.** El presupuesto es también de reloj: un intento cortado
   gastó el tiempo de todos. Lo que no hace es contar como entrega fallida ni como
   dato del skill.

## Lo que no entra aquí

Un crash del SUT (`exit ≠ 0` sin marca de transporte) **sí** es suyo, y se sigue
contando como fallo. La marca es estrecha a propósito: sólo el corte por techo y
los errores de transporte del proveedor.

## Consecuencia

La suite ya no puede quedarse colgada para siempre, y una medida contaminada por
la red se ve como lo que es. Lo que sigue sin arreglarse es la causa de fondo: el
proveedor deja streams mudos y nada lo detecta antes de los 20 minutos.
