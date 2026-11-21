# 35: `declara_decision` da por buena la negación del valor

**What to build:** Que un texto que **niega** el valor no cuente como que lo
declara. Hoy `textoDeclara` busca el valor con límites de palabra y no mira lo
que tiene delante, así que «el preflight da `PROYECTO_OK`, **no**
`PROYECTO_NO_EXISTE`» satisface el Guard.

**Blocked by:** —

**Status:** done

- [x] Un valor precedido de `no`, `ni`, `sin` o `nunca` (y de `no es`, `no son`,
      `no hay`, `no existe`) no cuenta como declarado
- [x] «no solo `p-base`, también `gap-base`» sigue contando: es una mención
      positiva, no una negación
- [x] Tests de los dos lados

## La evidencia (20/11/2026, preflight-check)

En la corrida del 20/11, `proyecto-no-existe` dio **2 de 3 EXCELENTE** con esta
respuesta:

> O sea: el preflight da `PROYECTO_OK`, no `PROYECTO_NO_EXISTE`.

El Guard `identifica-no-existe` pasó porque la palabra estaba, no porque la
decisión fuera la correcta. Es un falso positivo que hace que el Scorecard diga
PASA cuando el skill dijo lo contrario. La corrección no cambia el veredicto
bueno: un «declara `PROYECTO_NO_EXISTE`» sin negación sigue pasando.

## La re-medida (suite 7, 21/11/2026)

`preflight-check/proyecto-no-existe` pasa a **PASA** con el fixture: ya no hay ningún «no es PROYECTO_NO_EXISTE» que pueda colarse. Los tests cubren la negación y la mención positiva.
