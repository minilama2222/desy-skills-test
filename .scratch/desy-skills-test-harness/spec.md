# Spec: desy-skills-test — harness de tests de capacidad para los skills DESY

Status: ready-for-agent

## Problem Statement

Existe un repo de 12 skills (`desy-skills`) que enseñan a agentes y personas a maquetar con las librerías DESY del Gobierno de Aragón (`desy-html`, `desy-angular`, `desy-ionic`). Los skills evolucionan (hay ~15 ramas `fix/evals-*` históricas), pero **no hay ninguna forma repetible de saber si un skill sigue funcionando**: si el agente elige la librería correcta, si encadena los skills en el Flujo canónico, si el código generado usa los macros y tokens correctos, o si se degradó tras un cambio. Hoy la validación es ad-hoc, manual y no deja rastro. Sin una suite reproducible no se puede detectar una regresión en un skill antes de mergearla, ni comparar dos versiones de los skills.

## Solution

Un proyecto separado, `desy-skills-test`, que evalúa los 12 skills mediante **tests de capacidad**: cada Caso alimenta al SUT (agente opencode headless) con una entrada y una tarea, y evalúa la salida contra una rúbrica declarativa de Checks. El SUT corre contra un Pin (commit concreto de desy-skills) dentro de un sandbox aislado. El resultado es un **Grade** por Caso (INACEPTABLE / ACEPTABLE / BUENO / EXCELENTE) y un **Scorecard** agregado por Skill, en JSON (fuente de verdad) más un reporte legible. Un cambio que rompa un skill produce INACEPTABLE antes de mergear; un Bump de pin permite comparar versiones.

## User Stories

1. Como mantenedor de `desy-skills`, quiero ejecutar la suite entera con un comando, para saber si algún skill se ha degradado.
2. Como mantenedor, quiero ver qué Skill, Caso y Check fallaron, para saber dónde mirar sin leer transcripciones enteras.
3. Como mantenedor, quiero que cada reporte declare el Pin testeado (commit + fecha), para saber exactamente qué versión de los skills se evaluó.
4. Como mantenedor, quiero hacer Bump de pin a un ref nuevo y re-ejecutar, para comparar el comportamiento entre dos versiones.
5. Como autor de un skill, quiero añadir un Caso sin escribir código, para cubrir un comportamiento nuevo con poco esfuerzo.
6. Como autor de un skill, quiero declarar checks con severidad `guard` para marcar lo no-negociable (accesibilidad, props inventados), de modo que su fallo hunda el Grade a INACEPTABLE.
7. Como autor de un skill, quiero declarar checks de `quality` con peso, para matizar el Grade por encima del mínimo aceptable.
8. Como autor, quiero un Framework de checks por tipo de Caso, para no repetir los guards comunes en cada fichero.
9. Como revisor, quiero ver el Flujo observado (secuencia real de Invocaciones) comparado contra el Flujo canónico, para detectar cuándo el agente se salta pasos obligatorios.
10. Como revisor, quiero un Caso-componente que valide el contrato de un componente (macro, props, tokens) sin necesidad de un Gold, para cubrir piezas aisladas.
11. Como revisor, quiero un Caso-página que valide una página completa contra un Gold-HTML, para cubrir el encadenado y la fidelidad estructural.
12. Como revisor, quiero guards de a11y deterministas (un solo `h1`, `fieldset`+`legend`, skip-link, labels visibles) sobre el HTML generado, para atrapar sin navegador los fallos que históricamente aparecieron.
13. Como revisor, quiero que el Caso-página reciba el Gold-imagen en el prompt como referencia visual, para reproducir cómo maqueta una persona desde un diseño.
14. Como revisor, quiero que la verificación visual de v1 sea determinista contra el Gold-HTML, para mantener el Grade estable y sin comparación de píxeles.
15. Como mantenedor, quiero una capa opcional nightly con `agent-browser` + axe-core, para una verificación visual y de accesibilidad más profunda fuera del bucle estable.
16. Como mantenedor, quiero que cada Ejecución corra en un sandbox con `HOME`/config temporal, para no contaminar mi instalación real de skills.
17. Como mantenedor, quiero que el SUT use un modelo fijado (`deepinfra/deepseek-ai/DeepSeek-V4.1-Flash-1017`), para acercarme a la reproducibilidad.
18. Como mantenedor, quiero aserciones sobre hechos estructurales en vez de texto literal, para tolerar variación de wording del modelo.
19. Como mantenedor, quiero que el resultado sea JSON (fuente de verdad) más un Scorecard renderizado, para servir tanto a CI como a lectura humana.
20. Como mantenedor, quiero una suite apta para CI (exit code + JSON), para bloquear un merge con regresión.

## Implementation Decisions

### Alcance y composición
- Se cubren **los 12 skills**, priorizados por los patrones de "Páginas y flujos" de la doc DESY.
- Los tests son de **capacidad/benchmark** (evaluar la salida del SUT contra rúbrica) con una capa fina de **conformidad mecánica**.
- Stack: **Node + TypeScript + vitest**.

### SUT y conducción
- El SUT es **`opencode run` no-interactivo**, en **OpenCode V2 con `--standalone`**, el mismo harness donde viven los skills reales (ver ADR-0001 y ADR-0013).
- Modelo fijo: **`deepinfra/deepseek-ai/DeepSeek-V4.1-Flash-1017`**, temperatura por defecto.
- Las aserciones son sobre **hechos estructurales** (¿usó `componentXxx`? ¿la utility es `mb-base`? ¿hay un solo `h1`?), no comparación literal de texto.
- Evidencia por Ejecución: **transcript** (Flujo observado) **y** artefactos generados.

### Seams
- **Seam canónico: el grader.** Función pura `{artefactos, transcript} + Framework de checks del tipo + checks.json del Caso → Grade + detalle por Check`. Sin red, sin navegador. La suite testea los skills a través de este seam.
- **El runner del SUT es un adapter** por debajo del grader (sandbox, `opencode run`, copia de vendor, captura de Gold), cubierto con un puñado de tests de integración (smoke), no con un test por Caso.

### Aislamiento y pinning (ver ADR-0001, ADR-0003)
- Cada run crea un sandbox: `HOME`/config temporal con los skills del Pin copiados, y un working dir limpio.
- El repo canónico de los skills es `https://bitbucket.org/sdaragon/desy-skills` (antes en GitHub; mismo historial, mismo commit pinneado).
- `vendor/desy-skills/` es una **copia** del commit pinneado (no submódulo); el Pin efectivo se registra en `pin.json`.
- `npm run bump-pin <ref>` actualiza vendor + pin.json manualmente; el reporte incluye siempre el commit.

### Modelo de evaluación (ver ADR-0002, ADR-0004)
- Una única lista de **Checks tipados** `{severity: guard|quality, weight, assert}`.
- Cualquier **Guard** que falle ⇒ Grade **INACEPTABLE**. Los **Quality** puntúan hacia ACEPTABLE/BUENO/EXCELENTE.
- **Dos tipos de Caso**: `Caso-componente` (contrato de componente, sin Gold) y `Caso-página` (página completa desde Gold). Cada tipo define un **Framework de checks** base que el grader combina con los checks propios.

### Casos y datos (ver ADR-0004)
- Un Caso = una carpeta con `input/` (prompt, gold, mockups), `expected/` (`checks.json`) y `rubric.md`.
- Datos: **golds oficiales** de `desy.aragon.es` (Gold-HTML descargado) más **micro-fixtures** a mano para componentes.

### Gold y design-match
- **Captura de Gold**: screenshot a 1900px de ancho vía `agent-browser` a partir del Gold-HTML. **Pre-capturada y cacheada** como fixture, con invalidación al cambiar Gold-HTML o viewport (no se regenera en cada Ejecución).
- En v1, el Gold-imagen **viaja en el prompt** del Caso-página como referencia visual; la **verificación** sigue siendo determinista contra el Gold-HTML (ancho de container, escala tipográfica, gaps).
- La comparación pixel-a-pixel queda **fuera de v1** (capa nightly).

### a11y
- v1: guards deterministas por grep sobre el HTML generado (un solo `h1`, `fieldset`+`legend`, skip-link, labels visibles).
- Nightly (opcional): `agent-browser` + axe-core sobre la página servida.

### Entregable
- Salida = **JSON** (fuente de verdad) + **Scorecard** renderizado (tabla por Skill: casos, guards, Grade, hash del Pin).
- Apt para CI: exit code + JSON.

### Arranque por slices
- **Slice 1**: Caso-componente (`implement-component` → botón primario) para validar el harness con superficie mínima.
- **Slice 2**: Caso-página contra Gold (`patron-pagina-paso-1-nombre-nif`) para validar el encadenado y `design-match`.

## Testing Decisions

- **Qué hace bueno a un test aquí**: solo se testea **comportamiento externo**. Para el grader, comportamiento externo = dado un par `{artefactos, transcript}` y unos Checks, ¿emite el Grade y el detalle correctos? Nunca se asserta sobre la estructura interna del grader (funciones privadas, orden de evaluación). Para el runner, comportamiento externo = dado un Caso y un Pin, ¿devuelve `{artefactos, transcript}` con la forma esperada? Nunca sobre cómo invoca opencode por dentro.
- **Módulos bajo test**:
  - **Grader** (seam principal, tests unitarios densos, fixtures de `{artefactos, transcript}` escritos a mano). Cubre: guards que hunden el Grade, pesos de quality, combinación Framework+caso, parsing de checks.json, y comparación Flujo observado vs canónico.
  - **Runner/adapter** (tests de integración, pocos): un smoke por tipo de Caso que confirme que el sandbox se crea, opencode corre, y se capturan artefactos + transcript. No uno por cada Caso de la suite.
  - **Captura de Gold** (test de integración acotado): que la invalidación de caché se dispara al cambiar el viewport/HTML.
- **Prior art**: el repo `desy-skills` incluye `skills/desy-component-recognizer/assets/linter.py`, un validador determinista post-reconocimiento — mismo espíritu que los guards (checks deterministas, data-driven). Los Casos reutilizan el catálogo (`catalog.json`) como fuente de variantes válidas.
- **Determinismo**: el grader es puro y offline, así que sus tests no dependen de red ni del modelo. Los tests del runner son los únicos que tocan el SUT real y se mantienen pequeños y tolerantes al wording.

## Out of Scope

- **Comparación visual pixel-a-pixel** contra el Gold-imagen (queda como capa nightly opcional, no en v1).
- **axe-core / servidor** en el bucle estable de v1 (nightly).
- **Matriz de modelos**: v1 usa un único modelo fijado; la robustez multi-modelo es fase futura.
- **Scaffold real de proyectos DESY** (clonar starters de Bitbucket, `npm install`) — los Casos de `scaffold-project` se gradúan por guards de decisión, no ejecutando el scaffold completo.
- **CI remoto / GitHub Actions**: v1 produce salida apta para CI (`npm run suite`: JSON + exit code), pero el pipeline concreto se define aparte.
- **Migrar a issue tracker remoto** (GitHub/GitLab): se usa local markdown.

## Further Notes

- El vocabulario (Skill, Invocación, SUT, Caso, Caso-componente, Caso-página, Check, Guard, Quality, Grade, Scorecard, Gold, Gold-HTML, Gold-imagen, Captura de Gold, Pin, Bump de pin, Flujo canónico, Flujo observado, Framework de checks) está canonizado en `GLOSSARY.md`; úsese tal cual.
- Decisiones de arquitectura registradas en `docs/adr/0001`–`0004`.
- Los skills cuyo output no es HTML (`preflight-check`, `choose-library`, `scaffold-project`) se gradúan con guards propios de decisión (p. ej. "identificó PROYECTO_NO_EXISTE", "recomendó la librería correcta", "no scaffoldea sin permiso").
- La captura de Gold introduce `agent-browser` como dependencia **necesaria** en v1 (aunque cacheada); no es solo nightly.
