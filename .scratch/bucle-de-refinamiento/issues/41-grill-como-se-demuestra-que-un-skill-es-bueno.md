# 41: Grill-with-docs sobre cómo se demuestra que un skill es bueno

**What to build:** una sesión de `/grill-with-docs` que convierta esta pregunta
en vocabulario y una decisión escrita: **¿qué evidencia permite decir que un
skill está bien, y no sólo que pasó una vez?** El resultado esperado es una
entrada en `GLOSSARY.md` y un ADR que extienda o sustituya al ADR-0014, no un
cambio de código.

**Blocked by:** —

**Status:** ready-for-human

**Status depende de:** la entrevista. Es un grill: las preguntas las conduce el
agente, las decisiones son del mantenedor. El material de partida está abajo,
literal.

- [ ] Grill con el mantenedor sobre el material de abajo
- [ ] Decidir si `pasaSostenido` sigue siendo el criterio de cierre o pasa a ser
      un caso particular de una regla de tasa
- [ ] Escribir el término en `GLOSSARY.md` («skill bueno», «refinado», «tasa»)
- [ ] ADR que fije el criterio, el umbral y con cuántas Ejecuciones se mide
- [ ] Si el criterio cambia, abrir el ticket de harness que lo implemente

## El material (literal, 26/11/2026)

> 1. Cómo se demuestra que un skill es bueno
> Hoy no se demuestra: se constata que pasó. La diferencia es una tasa con
> incertidumbre y un umbral fijado de antemano.
>
> Lo que hace falta:
>
> 1. Una tasa por Caso sobre N Ejecuciones, no un binario por suite. «14 PASA»
>    dice «hubo al menos una entrega correcta en cada Caso». La tasa es
>    correctas / ejecuciones, y el harness ya la calcula por suite (la tabla que
>    te enseñé), pero el fichero de versión sólo guarda el veredicto de cada
>    corrida: entre suites no puedes reconstruir cuántas Ejecuciones acertaron.
> 2. Un intervalo, no un porcentaje suelto. 3 de 3 es un 100 % con intervalo del
>    44 % al 100 %: no distingue un skill bueno de uno mediocre. 12 de 15 es un
>    80 % con intervalo 55–93 %. Sin intervalo, «va bien» es una impresión.
> 3. Un umbral decidido antes de mirar el número. Si lo eliges después, siempre
>    gana el resultado. Hoy el umbral escrito es «dos suites PASA», que es un
>    guardarraíl contra la suerte, no una definición de calidad.
> 4. El eje del trigger. Que el skill se invoque. boton-primario: 6 intentos
>    para 3 entregas. patron-pagina: en una de cinco ni se invocó. Un skill que
>    no se dispara no se mide, por bueno que sea su texto.
> 5. Comparación entre versiones con el mismo N. Es lo único que dice «este
>    cambio mejoró algo» en vez de «esta vez salió».
>
> La letra pequeña honesta: todo esto mide este modelo, en este harness, con
> estos prompts. Es evidencia sobre el skill tal como se consume, no una
> garantía de que un humano u otro modelo lo usen igual.
>
> Lo concreto que yo propondría (y es trabajo de harness, no del skill): que el
> fichero de versión guarde por corrida y Caso correctas/entregas, y un comando
> `npm run tasa` que imprima la tasa, su intervalo de Wilson y cuántas
> Ejecuciones faltan para el objetivo. Entonces pasaSostenido pasa a ser un caso
> particular de algo que se puede leer.

## Por qué ahora (la evidencia que lo destapó)

Dos suites consecutivas sobre el pin `44c27a7`, árbol `a0b29172`:

| Corrida | Veredictos | `patron-pagina` | `preflight/proyecto-no-existe` | `validate-accessibility` |
|---|---|---|---|---|
| 1 | 14 PASA | 2/3 | 2/3 | **1/3** |
| 2 | 14 PASA | **1/3** | **1/3** | 3/3 |

`pasaSostenido` diría **refinado para los 14 Casos** — y el mismo Caso que lo
satisfizo acertó **una entrega de tres** en la corrida 2. Y
`validate-accessibility` osciló de 1/3 a 3/3 sin que su skill cambiara: ese 1/3
era varianza, no defecto.

Ninguna de las dos columnas se puede leer hoy del fichero de versión: sólo
guarda el veredicto de cada corrida, no `correctas/entregas`.
