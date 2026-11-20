# Fases del bucle

Cada fase tiene un **criterio de salida** claro y comprobable. No se pasa a la siguiente sin él. Los **gates** son preguntas al humano: se presenta la evidencia, se da una recomendación, se espera.

```
0. Registrar versión base
1. Diagnosticar el scorecard        → gate: qué cambios entran en la agenda
2. Escribir la petición             → gate: aprobar la petición
3. [fuera de este repo] aplicar en desy-skills
4. Medir                            → gate: ¿PASA sostenido?
5. Cerrar y comparar versiones
```

Las fases 0, 1, 2, 4 y 5 ocurren en `desy-skills-test`. La 3 ocurre en el repo `desy-skills`, en otra sesión: aquí solo se prepara y se espera.

---

## Fase 0 — Registrar la versión base

**Qué haces:** compruebas que hay una línea base reciente y anotas con qué versión estás trabajando.

- Lee `reports/suite/scorecard.md` y el `arbolHash` que declara.
- Si no hay scorecard, o es anterior a la regla de veredicto sobre entregas, pide al humano que lance `npm run suite` y **espera**. Es cara (la del 20/11/2026: 38 minutos) y **no se toca el repo mientras corre** (ticket 17).
- Crea el ciclo en `.scratch/bucle-de-refinamiento/ciclos/<slug>.md`; si la carpeta no existe, créala. Que no exista todavía no es un error: es que este es el primer ciclo.
- **El slug nombra el trabajo, no la fecha.** Un solo skill: `<skill>-<qué>` (`scaffold-permiso`). Varios: `<tema>` (`bucle-20-11`).
- El fichero de versión guarda el historial de sus corridas (`corridas`, ticket 23): si el ciclo mide dos veces el mismo árbol, la medida anterior no se pierde.

**Criterio de salida:** el ciclo existe y declara `base: <arbolHash>`.

---

## Fase 1 — Diagnosticar el scorecard

**Qué haces:** conviertes el scorecard en una **agenda de cambios**. Recorre los Casos en este orden, y descarta antes de proponer:

1. **«Sin medir» > 0** ⇒ falló la infraestructura (el SUT no respondió en 20 min, el build del harness no encontró `npm`…). **No es el skill**: se apunta como ticket de harness y no entra en la agenda. Es la columna que separa «no hay dato» de «el skill lo hizo mal» (ADR-0021).
2. **Cero entregas con «Sin medir» = 0** ⇒ el SUT corrió y no entregó el Artefacto que el Caso pide. El veredicto es INDETERMINADO: no hay dato para juzgar el skill. **No se escribe petición a ciegas**, pero tampoco se archiva: es lo primero que se mira, porque puede ser del artefacto (el skill no dice dónde escribir) o del Caso (lo pide en un sitio donde no se puede).
3. **Entregas incorrectas** ⇒ abre el informe del Caso: ahí están los cambios de verdad. Antes de proponer nada, comprueba que el rojo **se puede atribuir**:
   - **¿El SUT pudo leer lo que el skill le manda?** Un `Permission denied`, un `command not found` o una herramienta que no tiene no son del skill: ticket de harness.
   - **¿El Check tiene sección?** Si el informe dice «el Check no declara de qué sección depende», distingue: un **Guard del Framework** (`un-solo-h1`, `skip-link`, `fidelidad-*`) no ancla **por diseño** (ticket 17: anclarlo duplicaría la fuente y la graduación), así que ese rojo no se atribuye a un skill; un Check del Caso sin ancla es un hueco de su `rubric.md`, y eso se arregla en el Caso.
   - **¿El Check mide lo que dice medir?** Si el artefacto hace lo correcto y el Check lo tumba por una palabra, el rojo es **falso positivo**: se arregla el Caso, no el skill. Un Caso-decisión se juzga por su respuesta.
4. **Entrega correcta sin invocar el skill** ⇒ problema de trigger en el frontmatter. Cambio distinto, no lo mezcles con los anteriores.

**Gate — la agenda.** Presenta una tabla: Caso, qué falló, qué skill toca, y tu recomendación de si es cambio de skill, de check o de nada (con el ticket que lo recoge). **Espera** a que el humano recorte, añada o reordene. Lo que no entre en la agenda no se trabaja — y lo que salga de ella por no ser atribuible se queda escrito con su motivo, para que no vuelva a colarse.

**Criterio de salida:** la agenda está aprobada y escrita en el fichero de estado.

---

## Fase 2 — Escribir la petición

**Qué haces:** una petición por cambio de la agenda, con `peticiones/_plantilla.md`.

- Sección 2 (evidencia): números, no impresiones. El check, la línea, la Ejecución.
- Sección 3 (la sección que lo causa): texto literal del skill.
- Sección 5 (cómo se valida): el Caso concreto y **PASA sostenido**.
- Sección 7: no tocar el Pin, no editar `vendor/`, no meter evals en `desy-skills`.

**Gate — aprobar la petición.** Antes de escribirla en disco, muestra el borrador completo. **Espera.** El humano puede editar el texto, el alcance o el criterio.

**Criterio de salida:** la petición está en `peticiones/` y su estado es `propuesta`.

---

## Fase 3 — Aplicar en `desy-skills` (fuera de aquí)

**Qué haces:** nada. Avisas al humano de que esta fase vive en el otro repo y le das su parte:

1. El path de la petición.
2. El recordatorio de que allí siguen su `CONTRIBUTING.md` (worktree, rama `skill/*` o `improve/*`).
3. Que la validación se hace **volviendo aquí**, no allí.

Si el humano va a cambiar de sesión o de repo y quiere un sobre portátil, ofrece `handoff`. La petición es el contenido; el sobre solo la señala.

**Criterio de salida:** el humano confirma que la rama existe en `desy-skills`.

---

## Fase 4 — Medir

**Qué haces:** pones la rama del cambio delante del Caso y miras.

- Mide el checkout local, sin copiar nada:
  `npm run run -- --skill <skill> --case <caso> --skills-local <ruta del repo desy-skills>`
  Copiar a `vendor/` está vetado: ensucia el árbol que dice qué Pin se midió.
- Dos corridas, una detrás de otra. Cuenta entregas por separado.
- Cada Ejecución tiene **techo de 20 minutos** (ticket 21). Si una se corta, la Evidencia lo dice: esa corrida no cuenta como «no entregó», cuenta como «no se pudo medir».

**Gate — ¿PASA sostenido?** Dos corridas consecutivas PASA, cada una con al menos una entrega. Si una sí y otra no: **no está refinado**. Presenta las dos y pregunta si se itera (volver a fase 1 con la rama puesta) o se descarta.

Si el check falló pero el skill sí decía lo correcto: la petición estaba mal planteada. Se reescribe **el Caso**, no el skill, y eso es otro gate.

**Criterio de salida:** PASA sostenido confirmado por el humano.

---

## Fase 5 — Cerrar y comparar

**Qué haces:** propones la regresión y el diff, sin lanzar nada caro por tu cuenta.

- Propón `npm run suite` con la rama puesta (lo lanza el humano, y no se toca el repo mientras corre).
- Propón `npm run diff-versiones <base> <nuevo>`.
- `pasaSostenido` es una regla de `src/scorecard.ts` que **todavía ningún comando lee**: el PASA sostenido se comprueba a mano sobre `corridas` en `reports/versiones/<arbolHash>.json`.
- Rellena la sección 8 de la petición: **declaración de cierre**.
- Recuerda que el merge del PR y el `bump-pin` los firma el humano.

**Criterio de salida:** el fichero de estado pasa a `cerrado` y la petición a `aplicada`.

---

## Formato del fichero de estado

`.scratch/bucle-de-refinamiento/ciclos/<slug>.md` — pequeño a propósito: guarda **estado y punteros**, nunca copia el scorecard ni la petición.

```markdown
# Ciclo: <slug>

**Estado:** abierto | midiendo | pendiente-merge | cerrado
**Fase:** 0 | 1 | 2 | 3 | 4 | 5
**Base:** <arbolHash>
**Skills en foco:** <skill>, <skill>
**Casos:** <caso>, <caso>

## Agenda

| Caso | Qué falló | Cambio | Petición |
|---|---|---|---|

## Corridas

| Fecha | Versión | Caso | Entregas | Veredicto |
|---|---|---|---|---|
```

`Skills en foco` va en plural porque una agenda puede abarcar varios skills (la del 20/11, seis); la regla de «nunca dos ciclos para el mismo skill» se cumple con no abrir dos ciclos cuyos focos se solapen.
