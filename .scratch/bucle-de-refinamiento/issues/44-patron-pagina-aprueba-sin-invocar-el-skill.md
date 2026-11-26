# 44: `patron-pagina` aprueba sin invocar el skill que dice medir

**What to build:** decidir qué hace un Caso cuando el SUT entrega un Artefacto
EXCELENTE **sin invocar el skill bajo test**. Hoy no es un rojo (ADR-0007: no
midió el skill, así que no lo aprueba) y va a la sección de hallazgos de trigger
del Scorecard. Pero si eso pasa de forma repetida en el Caso que existe para
medir `implement-pattern`, la pregunta es si el Caso mide lo que dice medir.

**Blocked by:** —

**Status:** ready-for-human

**Status depende de:** una decisión de diseño del Caso. No se toca el Check para
que pase: el hallazgo no es un rojo, es una señal de que el estímulo no fuerza
el skill.

- [ ] Decidir entre: (a) reforzar el prompt para que la página exija el patrón,
      (b) re-anclar el Caso a otro skill, (c) aceptarlo y documentar que el Caso
      también se resuelve con `implement-layout-patterns`
- [ ] Si es (a): escribir la petición del Caso y medir
- [ ] Comprobar si el mismo patrón aparece en `implement-component/boton-primario`
      (ticket 43): son dos hallazgos del mismo tipo

## La evidencia

Dos suites sobre el pin `44c27a7`, con **una Ejecución cada una** que entregó
EXCELENTE sin invocar `implement-pattern`:

| Suite | Ejecución | Flujo | Grade |
|---|---|---|---|
| 1 | 4.ª | preflight → recognizer → choose-page → **implement-layout-patterns** → design-match → **implement-component** → styles → validate | EXCELENTE |
| 2 | 2.ª | preflight → choose-page → styles → recognizer → **implement-layout-patterns** → **implement-component** → design-match → validate | EXCELENTE |

En las dos, el skill que sí se invocó es `implement-layout-patterns` (y
`implement-component`). Es decir: una página de formulario se puede construir
con la estructura y los componentes sueltos, sin el skill de patrones.

Consecuencia práctica: el Caso puede salir PASA con menos Ejecuciones que midan
de verdad su skill. En la suite 2, `patron-pagina` dio **1 de 3** entregas
correctas; una de las otras dos fue este hallazgo.
