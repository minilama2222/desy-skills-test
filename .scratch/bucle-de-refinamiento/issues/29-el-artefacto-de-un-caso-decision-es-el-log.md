# 29: El artefacto de un Caso-decisión es el log JSONL, no la prosa: ningún Check de tabla puede pasar

**What to build:** Que un Caso-decisión se gradúe sobre **lo que el SUT dijo**, no
sobre el log de la máquina. Hoy `salida.md` contiene el `stdout` en formato JSON
línea a línea, con la prosa escapada dentro de un campo; los Checks que leen
filas de tabla no ven ni una.

**Blocked by:** —

**Status:** done

- [x] `salida.md` de un Caso-decisión lleva la **prosa decodificada** del `stdout`
      (concatenando los textos del SUT), más el `stderr` como hasta ahora
- [x] El `stdout` crudo no se pierde: sigue en `salida.stdout` de la Evidencia, y
      el Flujo se sigue leyendo de ahí
- [x] Si el `stdout` no es JSONL, el artefacto es el texto tal cual (un doble de
      test no puede romperlo)
- [x] Tests: un `stdout` JSONL produce prosa con sus saltos de línea reales; uno
      plano pasa igual; y `salida.stdout` sigue crudo
- [x] Re-medir `component-recognizer/reconocimiento-login`: de 0 de 6 a 6 de 6

## La evidencia (21/11/2026)

La misma Ejecución, graduada dos veces:

| Artefacto | Grade | Checks que pasan |
|---|---|---|
| `salida.md` tal cual (JSONL) | INACEPTABLE | **0 de 6** |
| la misma salida decodificada a prosa | INACEPTABLE | **4 de 6** |

Y la causa, en una línea: `reconoceComponente` hace

```ts
texto.split("\n").filter((linea) => linea.trim().startsWith("|"))
```

En el log, cada registro es **una** línea JSON y la respuesta del modelo va
dentro, con los saltos escapados (`\n`). No hay ninguna línea que empiece por `|`,
así que la tabla no existe para el grader.

## Por qué es del harness y no del Caso

`docs/adr/0011-caso-decision.md` lo dice: el Artefacto es «el **texto** que el SUT
emitió: la prosa de `stdout` más las Invocaciones de `stderr`. El runner lo
captura como un único fichero (`salida.md`)». El código guarda el log; el ADR
dice la prosa. Es una deriva, no una decisión.

## Qué deja en el aire

Con esto arreglado, `reconocimiento-login` deja de fallar cuatro Checks por
razón mecánica. Los dos que siguen fallando con la prosa —`reconoce-header-mini`
y `no-inventa-header-advanced`— son defectos distintos, en tickets 30 y en una
Petición al skill.

## La re-medida (21/11/2026, 02:10)

`npm run run -- --skill component-recognizer --case reconocimiento-login --n 3 --tope 4`:

| Ejecución | Antes (log) | Después (prosa) |
|---|---|---|
| 1 | INACEPTABLE, 6 fallos | INACEPTABLE, 5 fallos (los nombres iban con tildes de código: ticket 31) |
| 2 | INACEPTABLE, 6 fallos | **EXCELENTE** |
| 3 | INACEPTABLE, 6 fallos | **EXCELENTE** |

El artefacto ahora tiene las filas de la tabla (`salida.md` con 7–18 filas según la
ejecución). `salida.stdout` sigue crudo y el Flujo se sigue leyendo de ahí.
