# Caso-decisión: un tercer tipo de Caso para los skills que deciden, no maquetan

Se añade un tercer tipo de Caso, **Caso-decisión**, para los skills cuyo output no
es HTML sino una **decisión** en texto (identificar componentes, elegir plantilla,
recomendar librería). Su Artefacto es el texto que emitió el SUT y sus Checks son
**de decisión**.

## Contexto

Los skills `component-recognizer`, `choose-page-template` y `choose-library` no
producen marcado: su salida es una tabla/recomendación en prosa. El harness de
v1 sólo tenía dos tipos (ADR-0004), ambos anclados a HTML: el Caso-componente
mide el contrato de un macro en el `src/`, el Caso-página mide una página
renderizada en el `dist/`. Ninguno puede graduar «eligió bien la librería»: no
hay HTML que grep-ear y el runner, además, **descartaba la prosa del SUT**
(conservaba sólo las Invocaciones del transcript).

La spec ya anticipaba la necesidad (Further Notes): «los skills cuyo output no es
HTML se gradúan con guards propios de decisión». El ticket 09 concreta los tres
del Bloque A (reconocimiento y elección).

## Decisión

Un **Caso-decisión**:

- vive en `casos/<skill>/decision/<id>/` con `input/prompt.md`,
  `expected/checks.json` y `rubric.md`; un mockup opcional en
  `input/mockup.png` (con su fuente `input/mockup.html`) se adjunta al prompt;
- **no lleva Gold** ni HTML; su Framework de checks es **vacío** (no hay guards
  comunes de a11y ni de tokens que aplicar);
- su **Artefacto** es el **texto** que el SUT emitió: la prosa de `stdout` más
  las Invocaciones de `stderr`. El runner lo captura como un único fichero
  (`salida.md`) en vez de recolectar del `workDir` (`dirArtefactoDeCaso` devuelve
  `null` para este tipo);
- sus Checks son **de decisión**: `declara_decision` (el SUT declara un valor de
  dominio) y `no_declara_decision` (el valor prohibido no aparece).

## Alternativas descartadas

- **Reusar el Caso-componente con asserts de prosa**: mezcla dos cosas que
  ADR-0004 quiso separar (el tipo hace explícito qué se mide) y arrastraría el
  guard de tokens, que no aplica a un texto sin clases.
- **Que el SUT escriba su decisión a un fichero** (`decision.md`) y graduarlo:
  añade ingeniería de prompt que ningún skill define; el skill ya emite su tabla
  por la salida normal, que es lo que hay que medir.
- **Guardar sólo la prosa y no las invocaciones**: el Flujo observado sigue
  viviendo en el mismo texto; separarlos obligaba a dos capturas y rompía
  `alcanzoSkill`, que lee las Invocaciones.

## Consecuencias

- Un `no_declara_decision` como **Guard** es frágil: el SUT puede *mencionar* el
  valor prohibido al descartarlo («no es un `header-advanced`»), y el guard
  hundiría un output correcto. La convención es: un valor que el SUT puede
  nombrar al rechazarlo va como **Quality**, no como Guard. El Guard
  no-negociable de un Caso-decisión es el **positivo** (`declara_decision` del
  valor correcto): si la decisión es errónea, ese guard cae.
- El `agregarScorecard` no distingue tipos: un Caso-decisión entra en el
  veredicto agregado igual (PASA/SUSPENDE/INDETERMINADO) y su denominador limpio
  es «alcanzó el skill», que para estos skills exige que el SUT lo invocara.
- El mockup de un Caso-decisión es una **fixture versionada** que se genera con
  `npm run capturar-mockup` (mismo patrón que la Captura de Gold, ADR-0008); no
  se regenera en cada Ejecución.
