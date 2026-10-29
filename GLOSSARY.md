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
Un Caso cuyo objetivo es una página completa a partir de un Gold. Lleva el Gold (Gold-HTML y Gold-imagen) y añade a los guards base el encadenado, la a11y de página y la fidelidad estructural contra el Gold-HTML.
_Avoid_: mezclar los dos tipos; el tipo determina qué checks aplican.

**Caso-decisión**:
Un Caso cuyo objetivo es una **decisión** del SUT, no maquetar: identificar componentes (`component-recognizer`), elegir plantilla (`choose-page-template`) o recomendar librería (`choose-library`). No lleva Gold ni HTML: su Artefacto es el **texto** que el SUT emitió (su tabla/recomendación) y sus Checks son de decisión (`declara_decision` / `no_declara_decision`). Su Framework de checks es vacío: no hay guards comunes de a11y ni de tokens que aplicar.
_Avoid_: confundirlo con un Caso-componente; un Caso-decisión no produce marcado.

**Assert de decisión**:
Un Check que mira la **decisión** del SUT en su texto: `declara_decision` (el SUT declara un valor de dominio — un componente del catálogo, una plantilla, una librería), `no_declara_decision` (el valor prohibido **no** aparece), `declara_fallo` (el SUT declara el **veredicto** de un hecho — un check que falla en un informe, o la categoría de una discrepancia — en la misma línea que lo nombra) y `reconoce_componente` (identifica un componente que existe en `catalog.json`, y opcionalmente le asigna una variante documentada, normalizada español↔inglés como el linter del skill). La búsqueda es insensible a mayúsculas/tildes/espacios, pero se ancla por límites de palabra. Un `no_declara_decision` como **Guard** es frágil si el SUT puede *mencionar* el valor al descartarlo: en ese caso úsese como Quality.
_Avoid_: usarlo contra HTML suelto; es para el Artefacto textual de un Caso-decisión.

**Assert de no-acción**:
Un Check que mira que el SUT **no declara haber ejecutado** una acción:
`no_declara_ejecucion` (la acción — `git clone`, `scaffoldear` — no aparece
reclamada en pasado). Es el Guard positivo de un Caso cuyo skill prohíbe actuar
sin permiso (`desy-scaffold-project`): la respuesta correcta puede **mostrar el
comando** como plantilla, pero no reclamar haberlo corrido. Falla sólo ante una
reclamación en pasado (`he clonado`, `ya cloné`, `I ran`), no ante la mera
mención del comando.
_Evita_: usar un `no_declara_decision` genérico para esto: no distingue la
plantilla de la ejecución y suspendería una respuesta correcta. Ver ADR-0011 y el
Bloque C.

**Utilidades del Gold**:
Las clases que usa el Gold-HTML de un Caso. En un Caso-página, el guard de tokens
(`tokens-del-sistema`) **las exime**: un SUT que reproduce el Gold hereda sus
clases legadas (`mr-2`, `pt-0.5`…) y eso es fidelidad, no invención. Sólo se exime
lo que el Gold trae; un valor que el Gold no use sigue suspendiendo. Ver ADR-0010.
_Evita_: leer «exime las utilidades del Gold» como «no hay guard de tokens en
páginas»: el guard sigue atrapando lo inventado.

**Fidelidad estructural**:
La comprobación determinista de que la página generada reproduce los hechos de estructura que fija el Gold-HTML — el ancho del container, la escala tipográfica del `h1` y el gap/columnas de la rejilla principal. No es comparación de píxeles (eso es la capa nightly, fuera de v1): la verdad la fija el Gold del Caso, no una lista de clases escrita a mano. Ver `src/fidelidad.ts`.

**Estructura de grid**:
El hecho estructural de que un artefacto declara una **rejilla responsiva**: un elemento con `grid` que lleva `lg:grid-cols-<N>` **en ese mismo elemento** (como en la fidelidad estructural, se mira sobre su elemento, no «en cualquier parte»). Es la regla de `desy-implement-layout-patterns` («Grid responsivo del formulario»: sólo `lg:grid-cols-N`, no columnas fijas en mobile). Se expresa con el assert `estructura_grid` (`columnas` entero ≥ 2), sin anclar la comprobación a una lista literal de clases. Ver `src/grader.ts`.
_Evita_: confundirlo con la fidelidad estructural (esa compara contra un Gold-HTML; ésta es un hecho del propio artefacto, sin Gold).

**Ejecución**:
Un run concreto de un Caso por el SUT. Tiene timestamp y hash del pin; queda en `reports/`. Un Caso tiene N Ejecuciones.
_Avoid_: llamar "caso" a una Ejecución.

**Framework de checks**:
El conjunto base de Checks que aplica a un tipo de Caso (Caso-componente o Caso-página), combinado por el grader con los Checks propios del Caso. Evita repetir los guards comunes en cada `checks.json`.

**Artefacto** (de una Ejecución):
El fichero que el SUT escribió en el sandbox y sobre el que se pasa el Grade. De qué fichero se trata **depende del tipo de Caso**: el fuente (`src/`) para el Caso-componente, el compilado (`dist/`) para el Caso-página. En el Caso-página el Artefacto es **la página que el SUT escribió** (el `dist/X.html` cuya fuente `src/X.html` cambió), no el `dist/` entero del build. Ver ADR-0006 y ADR-0009.
_Avoid_: llamar "artefacto" al `SKILL.md` (eso es el Skill) en el contexto de una Ejecución; confundir el artefacto con el `dist/` entero del starter.

**Artefacto de un Caso-decisión**:
El **texto** que el SUT emitió (su tabla de identificación, su recomendación: la prosa de stdout más las invocaciones de stderr). No vive en el `workDir` (un Caso-decisión no escribe ficheros): lo captura el runner del transcript. Ver ADR-0011.

**Entrega**:
Qué produjo una Ejecución: `con-artefacto` (hay al menos un Artefacto que graduar) o `sin-artefacto` (no produjo ninguno). Es un eje **distinto** del Grade: `sin-artefacto` no es «lo hizo mal», es «no hubo nada que juzgar» — el skill ni llegó a producir. El scorecard agrega las Ejecuciones `sin-artefacto` aparte, para no contarlas como fallos del skill. Ver el ticket 15.
_Avoid_: leer `sin-artefacto` como un Grade; contar las Ejecuciones `sin-artefacto` como suspensos del skill.

**Alcanzó el skill**:
Si el Flujo observado contiene el paso del skill bajo test: es el punto hasta donde llegó el SUT. **Ortogonal** a la Entrega — se puede llegar al skill y no entregar, o no llegar siquiera. Cuando es falso, un INACEPTABLE **no evalúa el skill**: el agente ni lo invocó, así que esa Ejecución no cuenta para medir el skill (sí para medir el agente). Ver el ticket 15.
_Avoid_: confundirlo con «entregó mal»; meterlo dentro de la Entrega (son ejes distintos).

**Caso indeterminado**:
El veredicto agregado de un Caso cuando **ninguna** de sus N Ejecuciones alcanzó el skill bajo test. No es suspenso: no hay dato para juzgar el skill (el agente no arrancó ninguna vez). Es un tercer estado además de aprobado/suspendido, y el scorecard debe representarlo. Ver ADR-0007.
_Avoid_: contarlo como suspenso del skill.

**Check**:
La aserción declarativa individual dentro de `expected/checks.json`.

**Assert de contrato de macro**:
Un Check que mira *dentro* de la llamada al macro, no sólo su presencia:
`macro_con_clase` (el macro lleva una clase, típicamente la variante),
`macro_sin_clase` (el macro **no** lleva una clase: así se expresa el tamaño
base) y `sin_props_inventados` (las props usadas existen en el catálogo).
_Evita_: usarlos contra HTML suelto; miden la llamada al macro.

**Scaffold cacheado**:
El starter DESY pre-hecho (clonado + `npm install`) que el runner copia al
`workDir` de cada sandbox antes de lanzar el SUT. Necesario porque
`desy-scaffold-project` prohíbe al agente scaffoldear sin permiso del usuario.
Vive en `.scaffold-cache/` (fuera de control de versiones). Ver ADR-0005.

**Guard**:
Un Check con `severity: guard`. Su fallo hace que el Grade del Caso sea INACEPTABLE.

**Quality**:
Un Check con `severity: quality`. Puntúa (con `weight`) hacia el Grade.

**Grade**:
El veredicto de una **Ejecución**: INACEPTABLE / ACEPTABLE / BUENO / EXCELENTE. El
de un **Caso** no es el de una Ejecución, sino su agregación (ver Veredicto de un
Caso).
_Avoid_: hablar del «Grade del Caso» cuando se quiere decir su veredicto.

**Veredicto de un Caso**:
El resultado agregado de las N Ejecuciones de un Caso (ADR-0007 y ADR-0014):
**PASA** (al menos una de las Ejecuciones que **entregaron** Artefacto fue
EXCELENTE), **SUSPENDE** (hubo entregas y ninguna fue correcta) o
**INDETERMINADO** (ninguna alcanzó el skill, o ninguna entregó). Llegar al skill y
no escribir nada no condena: sin nada que graduar no hay juicio. Lo calcula el
scorecard (`src/scorecard.ts`).
_Avoid_: usar «Grade» para este agregado; llamar «suspenso» al indeterminado.

**PASA sostenido**:
Dos corridas **consecutivas** del mismo Caso, contadas por separado, y las dos
PASA. Es el criterio para declarar un skill **refinado** (ADR-0014): una sola
corrida PASA con una entrega de tres significa «acertó una vez». Lo calcula
`pasaSostenido` (`src/scorecard.ts`).
_Avoid_: llamar «refinado» a un Caso que pasó una vez; contar los INDETERMINADO
como aprobados blandos.

**Scorecard**:
El agregado de Grades por Skill, renderizado a partir del JSON de resultados. Es
el consumidor de la política de N (ADR-0007): da el Veredicto de un Caso y separa
las Ejecuciones «no entregó» de «entregó mal». Ver `src/scorecard.ts`.

**Informe por Caso**:
El documento legible que `npm run suite` y `npm run report` escriben en
`reports/informe/<skill>/<caso>.md`: por cada Check fallido, su aserción, la línea
del Artefacto que la tumba (o dónde debería estar, si falla por ausencia) y la
sección del Skill de la que el Caso dice depender, citada por título. **Presenta,
no adivina**: no emite veredicto de «culpa del skill» o «culpa del check»; eso lo
decide quien lo lee. Ver `src/informe.ts` y el ticket 06 del bucle de refinamiento.
_Avoid_: llamarlo «scorecard» (el Scorecard es el agregado por Skill, no el
detalle por Check); leerlo como un juicio del Skill.

**Ancla de skill**:
La sección concreta de un `SKILL.md` de la que un Caso declara depender para un
Check, escrita en su `rubric.md` bajo `## Anclaje en desy-skills` como
`- <id-del-check>: <skill> → «<título de la sección>»`. Se cita por **texto**
(el título de la sección), nunca por número de línea, para que sobreviva a las
ediciones del Skill. `npm run verificar-casos` comprueba que la sección existe.
_Avoid_: anclar por número de línea o por ruta de fichero; inventar el ancla
cuando el Check no la declara.

### Referencias DESY

**Gold**:
La página oficial de referencia de desy.aragon.es para un patrón de "Páginas y flujos". Es la fuente de verdad de la maquetación.

**Gold-HTML**:
La forma descargada del Gold: el `patron-pagina-*.html` servido por desy.aragon.es.

**Gold-imagen**:
La Captura de Gold. Es la referencia visual contra la que se compara el output.

**Captura de Gold**:
El screenshot a 1900px de ancho generado con `agent-browser` a partir del Gold-HTML. Es la forma canónica del Gold-imagen. Se guarda como **fixture versionada** junto al Gold-HTML del Caso (`input/gold.png`), con un manifiesto (`input/gold.captura.json`) que registra el ancho y una clave (hash del Gold-HTML + ancho): si el HTML o el viewport cambian, la clave caduca y se recaptura. No se regenera en cada Ejecución. Ver ADR-0008.
_Avoid_: usar los SVG/PNG de preview de la doc como referencia visual.

### Pinning

**Pin**:
El commit concreto de desy-skills que se copia a `vendor/desy-skills/` y que se registra en `pin.json`. Todo reporte declara el Pin testeado. Su identidad real, sin embargo, es el `arbolHash` de lo que se copió al sandbox: el commit no verifica que `vendor/` coincida con él (ticket 04).

**Pin local**:
El Pin de una corrida que mide los skills de un **checkout del usuario** (`.scratch/…`, un clon propio) en vez de `vendor/`, para iterar sobre un skill sin re-pinear por cada frase. Se declara como `local (sin commit)` —en el JSON, en el H1 del Scorecard y por consola— y nunca escribe en `vendor/`. Se activa con `--skills-local <ruta>`; el árbol que se mide `<ruta>/skills/` pasa por el mismo guardarraíl de árbol sucio. Canónico sigue siendo upstream por SHA (ADR-0003): es comodidad declarada, no una segunda vía de verdad. Ver el ticket 05.
_Avoid_: llamarlo «Pin de mentira» o darle un SHA; decir `local` cuando se quiere decir «el último commit».

**Bump de pin**:
La actualización manual del Pin a un ref nuevo, vía `npm run bump-pin <ref>`.
