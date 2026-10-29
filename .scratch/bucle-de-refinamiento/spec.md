# Spec: bucle de refinamiento — de un scorecard a un skill mejorado

Status: ready-for-human

## Problem Statement

El harness ya sabe **medir** los skills: 14 Casos, grader determinista, scorecard, evidencia. Lo que no sabe es **cerrar el bucle**. Medido en el repo, con evidencia en `src/` y `reports/`:

1. **El veredicto fabrica rojos.** El único predicado que saca una Ejecución del denominador limpio es `flujoAlcanzoSkill` (`src/scorecard.ts:77-79`). Una corrida que **llegó al skill y no entregó nada** cuenta como dato y puede forzar SUSPENDE, que bloquea CI (`src/suite.ts:74-76`). Con una tasa de entrega de 0 de 3 en `reports/suite` y 1 de 3 en `estabilidad-v2`, tres corridas sin entrega producen un rojo que no dice nada del skill.
2. **El runner esconde la causa.** El exit code de `opencode run` se calcula (`src/runner.ts:429`) y se descarta (`src/runner.ts:270`). No hay timeout, ni reintento, ni nudge. Un crash y un estancamiento son indistinguibles.
3. **El Pin puede mentir.** `runCaso(caso, pin, deps)` recibe el Pin y **no lo lee** (`grep 'pin\.' src/runner.ts` → 0 coincidencias); el commit del informe sale de `pin.json` (`src/ejecutar.ts:82`). Editar un `SKILL.md` dentro de `vendor/desy-skills/` mide la edición y la reporta como el commit pinchado.
4. **No hay historia.** `reports/` está en `.gitignore:2` (`git ls-files reports` → 0 ficheros) y cada `npm run suite` vacía `reports/suite/ejecuciones` antes de empezar (`src/cli.ts:158`, rationale en ADR-0012). No existe ningún mecanismo que compare dos corridas — la user story 4 de `desy-skills-test-harness/spec.md:18` («Bump de pin y re-ejecutar para comparar») **está sin implementar**.
5. **El bucle no cruza a `desy-skills`.** El único cambio aguas arriba que los HALLAZGOS piden —copiar la página de prueba en vez de editarla, `HALLAZGO-tokens-fichero-de-ejemplo.md:78`, marcado «expectativa del skill, **no de este repo**»— **nunca se aplicó**: `grep pagina-prueba vendor/desy-skills/skills/` → 0 coincidencias. La instrucción existía y nadie la ejecutó, porque no había forma de que llegara ni de comprobarla. Mientras tanto `desy-skills/CONTRIBUTING.md` cierra su revisión con «Test manual (probar el skill en un agente real)», que es justo el hueco que este harness llena.

## Solution

Un **bucle explícito** que convierte un scorecard en un cambio de skill, y el cambio de skill en un scorecard nuevo:

```
editar skill (desy-skills) → checklist «qué Casos toca» → run de esos Casos
  → informe legible → decidir skill vs check → repetir
  → suite completa con PASA sostenido → cerrar el Pin
```

Cinco piezas, cada una resuelve uno de los cinco fallos de arriba:

1. **Veredicto sobre entregas** (fallo 1). N es un presupuesto de **intentos**; el veredicto se calcula sobre las Ejecuciones que **entregaron**, y `sin-artefacto` se cuenta pero no condena. Suelo explícito: cero entregas ⇒ **INDETERMINADO**, nunca SUSPENDE.
2. **Runner observable** (fallo 2). Cada Ejecución registra el exit code del SUT y el último paso del Flujo alcanzado; el presupuesto de intentos es de **entregas**, con tope duro de intentos.
3. **Pin honesto** (fallo 3). Un guardarraíl impide medir un árbol sucio y el scorecard registra un **hash del árbol de skills** que se copió al sandbox; el hash, no el commit, es la identidad de versión.
4. **Historia y diff** (fallo 4). Un scorecard pequeño y versionable por versión (`reports/versiones/<hash>.json`); el árbol de Ejecuciones sigue ignorado por pesado.
5. **Puente a `desy-skills`** (fallo 5). Una **petición** por cambio, versionada en este repo, con evidencia, sección causante, restricciones y el criterio de validación. El agente de `desy-skills` la ejecuta; este repo comprueba que se aplicó.

## User Stories

1. Como mantenedor, quiero que un Caso sin ninguna entrega diga INDETERMINADO, para no tener que distinguir a ojo un rojo del SUT de un rojo del skill.
2. Como mantenedor, quiero que una corrida diga si el SUT crasheó o se perdió, para saber si toca arreglar el harness o el skill.
3. Como autor de un skill, quiero que editar un skill no pueda generar un informe con un Pin falso, para confiar en lo que leo.
4. Como autor, quiero que la suite se niegue a medir un árbol sucio, para que «lo medí con este Pin» sea verdad.
5. Como mantenedor, quiero un identificador de versión basado en el contenido de los skills, para comparar dos versiones aunque una no esté commiteada.
6. Como mantenedor, quiero iterar sobre un skill sin re-pinear por cada frase que toco, para que el bucle sea barato.
7. Como mantenedor, quiero que el informe diga qué Casos depende de la sección que acabo de editar, para re-correr solo esos.
8. Como mantenedor, quiero leer un informe por Caso con el check fallido, la línea que lo tumba y la sección del skill, para decidir yo si es skill o check.
9. Como mantenedor, quiero que una entrega correcta **sin invocar el skill** se destaque, para detectar problemas de trigger en vez de perder la evidencia.
10. Como mantenedor, quiero que dos corridas se puedan diffear, para saber si un refactor de skill mejoró o empeoró.
11. Como mantenedor, quiero un criterio de cierre (PASA sostenido) para no decir «refinado» tras una tirada con suerte.
12. Como autor de skill, quiero una petición de cambio con evidencia y criterio de validación, para que un agente en `desy-skills` la ejecute sin inventarse el contexto.
13. Como mantenedor, quiero comprobar que una petición se aplicó, para que no vuelva a pasar lo de `pagina-prueba`.

## Implementation Decisions

### Veredicto (ver ADR-0014)

- `n` sigue siendo el número de **intentos** por Caso; el veredicto se calcula sobre las Ejecuciones con `entrega === "con-artefacto"`.
- `sin-artefacto` se **cuenta y se muestra**; **nunca** fuerza SUSPENDE.
- **Cero entregas ⇒ INDETERMINADO** (no bloquea CI, ADR-0012). Entregar-mal ⇒ SUSPENDE (bloquea).
- Extiende el ticket 15 (`desy-skills-test-harness/issues/15-…`), que añadió los dos ejes pero **no** cambió el veredicto. No lo reabre: lo usa.
- **Criterio de cierre del bucle:** una versión de skill está «refinada» cuando el Caso pasa **PASA sostenido** — dos corridas consecutivas dan PASA, con las entregas de cada corrida contadas por separado.

### Presupuesto de intentos (ver ADR-0014)

- El presupuesto es de **entregas**: se intenta hasta tener `n` entregas o agotar un tope duro de intentos (`n * 2` por defecto), lo que antes llegue.
- **Cómo se leen las dos N mientras el ticket 03 no esté construido.** Esta sección y la de arriba dicen cosas distintas a propósito: allí `n` cuenta **intentos** (lo que se corre), aquí cuenta **entregas** (lo que se consigue). Hoy el runner sólo cuenta intentos, así que `--n 3` son tres Ejecuciones y puede haber menos de tres entregas. Cuando el 03 aterrice, `n` pasará a ser presupuesto de entregas con tope `n * 2`; hasta entonces, un scorecard que diga «Ejecuciones» está contando intentos, y `resumen().ejecuciones` también.
- Rechazado a propósito: **nudge en el prompt** (haría que el Caso mida un prompt inventado, no el skill) y **cambiar de modelo o variante** (rompe comparabilidad, ADR-0001/0013).

### Runner observable

- `ResultadoEjecucion` gana `exitCode` y `ultimoPasoDelFlujo`. El exit code deja de descartarse.
- El informe distingue «crasheó» (exit ≠ 0) de «se quedó sin entregar» (exit 0 y sin artefacto).

### Pin honesto (ver ADR-0015)

- **Guardarraíl:** `suite` se niega a correr si `vendor/desy-skills/` tiene cambios sin commitear, siguiendo el patrón de `scripts/verificar-*.ts`. Salida explícita, no silenciosa.
- **Hash del árbol**: el scorecard registra el hash del contenido de `skills/**` copiado al sandbox. **Excluye `assets/catalog.json`** a propósito: cambia por razones ajenas al texto de los skills y ensuciaría el diff.
- **Pin local:** el runner puede tomar los skills de un checkout local declarado; el informe lo marca en línea como `local (sin commit)`. Canónico sigue siendo upstream por SHA (ADR-0003).

### Historia y diff (ver ADR-0016)

- `reports/` sigue ignorado (árbol de Ejecuciones pesado y ruidoso).
- Se versiona **solo el scorecard** en `reports/versiones/<hash>.json` — pequeño, es la conclusión, `git diff` entre dos versiones sin infraestructura nueva.
- El diff empieza **vacío**; lo previo se archiva como legado (ver abajo).
- `npm run report` deja de re-etiquetar: usa el campo `pin` de cada Ejecución, no `pin.json` del momento.

### Legado

- `reports/legado/` guarda la evidencia previa a la regla nueva, **fuera** del mecanismo de comparación, con una cabecera que declara con qué regla se midió.
- Sirve para conservar el *porqué* (los dos HALLAZGOS, las notas del 27/10), nunca como corrida de referencia ni en un diff.

### Informe por Caso

- Por cada check fallido: la aserción, la línea del artefacto que la tumba, y la sección del skill que el Caso nombra. **Sin veredicto automático de culpabilidad** (skill vs check): presenta, no adivina.
- Excepción que sí se destaca: **entrega correcta con cero invocaciones del skill** ⇒ hallazgo de trigger (frontmatter). Ocurrió de verdad el 27/10 y el scorecard lo descartó.

### Tier rápido

- (a) **Replay del grader:** artefactos commiteados → `grader.ts`, afirmar los mismos grades. Protege frente a deriva del grader.
- (b) **Checklist skill → Casos:** afirma el contenido de `SKILL.md` del que depende cada Caso (tabla de tokens, `gap-x-4` legacy, instrucción de copiar la página de prueba…) y dice **qué Casos hay que re-correr**. **No** es un gate duro: fallará cada vez que se mejore un skill legítimamente.

### Puente a `desy-skills` (ver ADR-0017)

- **Una petición por cambio**, en `.scratch/bucle-de-refinamiento/peticiones/<slug>.md`, nombrada por el cambio y no por la fecha.
- El repo `desy-skills` **nunca** recibe documentación de este harness: recibe cambios de skill por PR, siguiendo su `CONTRIBUTING.md` (worktree, rama `skill/*` o `improve/*`, anatomía de `SKILL.md`).
- El `/handoff` de Matt (`~/.agents/skills/handoff`) es el **único objeto que cruza**: escribe en `%TEMP%` un puntero a la petición más los skills sugeridos. No duplica contenido.
- **Cierre:** la misma checklist del tier rápido (b) comprueba, al cambiar de versión, si el texto que la petición pedía ya está en el skill.

## Out of Scope

Heredado de `desy-skills-test-harness/spec.md:95-102` — **no se reabre**:

1. Comparación píxel-a-píxel contra el Gold-imagen (solo nightly).
2. axe-core o un servidor en el bucle estable (solo nightly).
3. Matriz multi-modelo.
4. Scaffold real de un proyecto DESY.
5. CI remoto / GitHub Actions.
6. Tracker remoto.

Y además:

7. **Tocar `desy-skills` desde este repo.** Este repo produce peticiones; el cambio se hace allí.
8. **Reabrir el ticket 14 (nightly).** Sigue `ready-for-agent` y **bloqueado** hasta que la tasa de entrega esté medida con la regla nueva, como ya pide `HALLAZGO-tokens-fichero-de-ejemplo.md:131-133`.
9. **Juez LLM.** El grading sigue siendo determinista.

## Testing Decisions

- Se testea comportamiento externo: el veredicto sobre entregas, el presupuesto de intentos, el guardarraíl de árbol sucio, el hash, el diff entre versiones, el informe. Nunca los internos del grader.
- Cada regla nueva es una **función pura** en su módulo (`src/scorecard.ts`, `src/pin-arbol.ts` o equivalente), con tests densos de borde: 0/1/n entregas, tope de intentos agotado, árbol limpio y sucio, hash estable e inestable.
- El runner sigue cubierto por smoke con `RunDeps` inyectado; nada nuevo abre un proceso real salvo `test/suite-cli.test.ts`, que ya tiene su doble por preludio.
- Un test que toca un proceso real lleva su presupuesto de tiempo con la base medida en comentario (CODING_STANDARDS).

## Further Notes

- Vocabulario: **Petición** (de cambio de skill), **Versión de skills** (identificada por hash de árbol), **Presupuesto de intentos**, **PASA sostenido**, **Legado**. Se añaden a `GLOSSARY.md` en el ticket de documentación.
- Relación con la spec del harness: `desy-skills-test-harness/spec.md` describe **medir**; esta describe **cerrar el bucle**. Un ticket que toque el veredicto (01) explica en su cuerpo por qué cambia un comportamiento que aquella spec fijó.
