# desy-skills-test

Proyecto que evalúa los 12 skills de `desy-skills` (los procedimientos canónicos para maquetar con las librerías DESY del Gobierno de Aragón) mediante tests de capacidad. Un caso de test alimenta al agente con un Skill y una entrada, y evalúa la salida contra una rúbrica.

## Language

### Skills y ejecución

**Skill**:
El artefacto `SKILL.md` + sus assets (catálogo, linter) que vive en `vendor/desy-skills/`. Es la unidad versionada.
_Avoid_: usar "skill" para referirse al conocimiento en abstracto o a la unidad de test.

**Invocación**:
Un uso concreto de un Skill por el agente durante una Ejecución. El agente decide invocarlo (o no) al matchear la `description`.
_Avoid_: "llamada", "uso" cuando se refiere a esto.

**SUT** (System Under Test):
El agente opencode headless (`opencode run`) conduciendo la tarea. Es lo que el harness ejercita.
_Avoid_: confundir el SUT con el Skill.

**SUT-skill**:
El Skill concreto que un Caso está evaluando.

**Flujo canónico**:
El orden esperado de invocaciones definido por el repo desy-skills (preflight → recognizer → choose-page-template → implement-* → design-match → validate-accessibility). Es parte de lo que se testea.

**Flujo observado**:
La secuencia real de Invocaciones extraída del transcript de una Ejecución. Los guards lo comparan contra el Flujo canónico.

### Tests

**Caso**:
La unidad de test declarativa: una carpeta con `input/`, `expected/` y `rubric.md`. Es el diseño del test.

**Caso-componente**:
Un Caso cuyo objetivo es el contrato de un componente aislado. No lleva Gold; valida el macro, sus props y sus tokens.

**Caso-página**:
Un Caso cuyo objetivo es una página completa a partir de un Gold. Lleva el Gold (Gold-HTML y Gold-imagen) y añade a los guards base el encadenado, la a11y de página y la fidelidad contra el Gold-HTML.
_Avoid_: mezclar los dos tipos; el tipo determina qué checks aplican.

**Ejecución**:
Un run concreto de un Caso por el SUT. Tiene timestamp y hash del pin; queda en `reports/`. Un Caso tiene N Ejecuciones.
_Avoid_: llamar "caso" a una Ejecución.

**Framework de checks**:
El conjunto base de Checks que aplica a un tipo de Caso (Caso-componente o Caso-página), combinado por el grader con los Checks propios del Caso. Evita repetir los guards comunes en cada `checks.json`.

**Check**:
La aserción declarativa individual dentro de `expected/checks.json`.

**Guard**:
Un Check con `severity: guard`. Su fallo hace que el Grade del Caso sea INACEPTABLE.

**Quality**:
Un Check con `severity: quality`. Puntúa (con `weight`) hacia el Grade.

**Grade**:
El veredicto de un Caso o Ejecución: INACEPTABLE / ACEPTABLE / BUENO / EXCELENTE.

**Scorecard**:
El agregado de Grades por Skill, renderizado a partir del JSON de resultados.

### Referencias DESY

**Gold**:
La página oficial de referencia de desy.aragon.es para un patrón de "Páginas y flujos". Es la fuente de verdad de la maquetación.

**Gold-HTML**:
La forma descargada del Gold: el `patron-pagina-*.html` servido por desy.aragon.es.

**Gold-imagen**:
La Captura de Gold. Es la referencia visual contra la que se compara el output.

**Captura de Gold**:
El screenshot a 1900px de ancho generado con `agent-browser` a partir del Gold-HTML. Es la forma canónica del Gold-imagen.
_Avoid_: usar los SVG/PNG de preview de la doc como referencia visual.

### Pinning

**Pin**:
El commit concreto de desy-skills que se copia a `vendor/desy-skills/` y que se registra en `pin.json`. Todo reporte declara el Pin testeado.

**Bump de pin**:
La actualización manual del Pin a un ref nuevo, vía `npm run bump-pin <ref>`.
