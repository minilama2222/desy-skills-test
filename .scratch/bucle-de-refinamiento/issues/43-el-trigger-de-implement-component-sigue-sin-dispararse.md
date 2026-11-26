# 43: El trigger de `implement-component` sigue sin dispararse

**What to build:** que `implement-component` se invoque cuando toca. **No se
reabre la petición anterior**: se continúa.
[`peticion-trigger-implement-component.md`](../peticiones/peticion-trigger-implement-component.md)
se aplicó en el PR #36 y su propia declaración de cierre ya avisaba de que
**no cerraba el trigger** (2 Ejecuciones, 0 invocaciones en el árbol
`a2dfb98…`). Aquello quitó la incoherencia de idioma y el veto; el disparo
sigue fallando.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Diagnosticar por qué no se dispara: leer la `description`, el prompt del
      Caso y las invocaciones de las Ejecuciones que no lo llamaron
- [ ] Escribir una petición **nueva** (la anterior está aplicada; se enlaza, no se reabre)
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
