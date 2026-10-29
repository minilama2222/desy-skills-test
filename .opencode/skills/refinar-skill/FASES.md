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
- Si no hay scorecard, o es anterior a la regla de veredicto sobre entregas, pide al humano que lance `npm run suite` y **espera**.
- Crea el fichero de estado en `.scratch/bucle-de-refinamiento/ciclos/<slug>.md`.

**Criterio de salida:** el ciclo existe y declara `base: <arbolHash>`.

---

## Fase 1 — Diagnosticar el scorecard

**Qué haces:** conviertes el scorecard en una **agenda de cambios**. Lee los Casos en este orden y no en otro:

1. **Cero entregas** ⇒ INDETERMINADO. No es el skill. Anótalo como "no medible hoy" y no lo metas en la agenda.
2. **Entregas incorrectas** ⇒ abre el informe del Caso: check fallido, línea del artefacto que lo tumba, sección del skill. Están aquí los cambios de verdad.
3. **Entrega correcta sin invocar el skill** ⇒ problema de trigger en el frontmatter. Cambio distinto, no lo mezcles con los anteriores.

**Gate — la agenda.** Presenta una tabla: Caso, qué falló, qué skill toca, y tu recomendación de si es cambio de skill o de check. **Espera** a que el humano recorte, añada o reordene. Lo que no entre en la agenda no se trabaja.

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

- Con pin local (ticket 05) apunta a la ruta del worktree. Sin ticket 05, el apaño es copiar a `vendor/` a mano: **dilo en voz alta**, porque el scorecard dirá un commit que no es.
- `npm run run <skill>/<caso>` dos veces.
- Cuenta entregas por separado en cada corrida.

**Gate — ¿PASA sostenido?** Dos corridas consecutivas PASA, cada una con al menos una entrega. Si una sí y otra no: **no está refinado**. Presenta las dos y pregunta si se itera (volver a fase 1 con la rama puesta) o se descarta.

Si el check falló pero el skill sí decía lo correcto: la petición estaba mal planteada. Se reescribe **el Caso**, no el skill, y eso es otro gate.

**Criterio de salida:** PASA sostenido confirmado por el humano.

---

## Fase 5 — Cerrar y comparar

**Qué haces:** propones la regresión y el diff, sin lanzar nada caro por tu cuenta.

- Propón `npm run suite` con la rama puesta (lo lanza el humano).
- Propón `npm run diff-versiones <base> <nuevo>`.
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
**Skill en foco:** <skill>
**Casos:** <caso>, <caso>

## Agenda

| Caso | Qué falló | Cambio | Petición |
|---|---|---|---|

## Corridas

| Fecha | Versión | Caso | Entregas | Veredicto |
|---|---|---|---|---|
```
