# 43: El trigger de `implement-component` sigue sin dispararse

**What to build:** que `implement-component` se invoque cuando toca. El PR #36
cambió su `description` (español, verbo al principio, `SIEMPRE`, conjunto
abierto y frontera explícita) y **el hallazgo persiste**: hay Ejecuciones que
entregan un botón EXCELENTE sin invocar el skill.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Diagnosticar por qué no se dispara: leer la `description`, el prompt del
      Caso y las invocaciones de las Ejecuciones que no lo llamaron
- [ ] Proponer el cambio de frontmatter (una petición, no un parche suelto)
- [ ] Medir con el Caso `implement-component/boton-primario`: intentos por
      entrega y hallazgos de trigger
- [ ] Criterio de cierre: 3 entregas en 3 intentos, 0 hallazgos de trigger

## La evidencia

Dos suites sobre el pin `44c27a7`:

| Suite | Intentos | Entregas | Correctas | Hallazgos de trigger |
|---|---|---|---|---|
| 1 | 6 | 3 | 3 | 1 |
| 2 | 6 | 3 | 3 | 1 |

Seis intentos para tres entregas **en las dos**: el Caso aprueba, pero el skill
cuesta el doble de lo que debería porque una Ejecución se resuelve sin él. El
Scorecard lo dice en su cabecera («entrega correcta sin invocar el skill») y
ADR-0007 lo excluye del veredicto a propósito: no mide el skill.

Ojo con el alcance: **no es un rojo del Caso** (`boton-primario` es PASA). Es un
defecto del skill: su `description` no basta para que un agente real lo cargue.
