# 31: Los Checks de tabla no reconocen un nombre envuelto en tildes de código

**What to build:** Que una celda `` `header-mini` `` cuente como `header-mini`. Hoy
`celdaNombraComponente` exige coincidencia exacta, así que el markdown de la
propia tabla invalida el nombre: en la corrida del 21/11, la única ejecución del
Caso que envolvía los componentes en tildes de código suspendió 5 de 6 Checks.

**Blocked by:** —

**Status:** done

- [x] Una celda se compara **sin la decoración markdown** de los bordes
      (tildes de código, asteriscos, comillas), también para la variante
- [x] `` `header-mini` `` y `header-mini` son el mismo hecho
- [x] Tests: nombre con tildes de código pasa, y un nombre distinto sigue sin
      casar (no se vuelve un «contiene» laxo)
- [x] Re-medir `component-recognizer/reconocimiento-login`: 3 de 3 EXCELENTE

## La evidencia (21/11/2026)

Tres ejecuciones del mismo Caso, con el artefacto ya en prosa:

| Ejecución | Cómo escribe el nombre | Grade |
|---|---|---|
| 1 | `` `header-mini` `` | INACEPTABLE (5 Checks) |
| 2 | `header-mini` | **EXCELENTE** |
| 3 | `header-mini` | **EXCELENTE** |

El contenido es el mismo; lo que cambia es si el agente decoró la celda. Un Check
no debería decidir por eso: la tabla es markdown y las tildes de código son cómo
se escribe un identificador en markdown.

## Cuidado con el alcance

Se limpia **la decoración de los bordes**, no se pasa a «contiene»: `header`
sigue sin casar con `header-mini`, y `mini` dentro de una frase de notas sigue sin
ser un nombre de componente.

## La re-medida (21/11/2026, 02:30)

| Ejecución | Antes del ticket | Después |
|---|---|---|
| 1 (nombres con tildes de código) | INACEPTABLE, 5 fallos | **EXCELENTE** |
| 2 | EXCELENTE | **EXCELENTE** |
| 3 | EXCELENTE | **EXCELENTE** |

`component-recognizer/reconocimiento-login` queda en **PASA** tras seis meses de
SUSPENDE. Y no hubo que tocar el skill: los tres defectos eran del harness y del
Caso.
