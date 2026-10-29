# 06: Informe por Caso — check, línea del artefacto, sección del skill

**What to build:** Un informe legible por Caso que ponga lado a lado la aserción del Check fallido, la línea del Artefacto que la tumba y la sección del skill que el Caso nombra. **Presenta, no adivina** la culpabilidad.

**Blocked by:** 02, 04

**Status:** done

- [x] Cada Caso produce un bloque con: prompt, artefactos entregados, Flujo observado, exit code, y por cada Check ✓/✗ con la línea que falla
- [x] El Caso puede nombrar la sección del skill de la que depende (campo en el Caso o en `rubric.md`); el informe la cita por **texto**, no por número de línea
- [x] El informe **no** emite veredicto automático de «culpa del skill» o «culpa del check»
- [x] Sin invocación del skill no hay sección que citar; el bloque lo dice explícitamente

## Criterio de aceptación

Leyendo solo este informe, alguien que no conoce el harness puede decidir si toca editar el skill o el check.

## Notas

`test/caso-boton-primario-aceptacion.test.ts` y `HALLAZGO-*` tienen el material para la primera versión del informe: son exactamente los documentos que costó escribir a mano.

## Notas de implementación

- **`renderInformeCaso`** (`src/informe.ts`) es **pura**: recibe las Ejecuciones ya
  graduadas y un `ContextoDelCaso` (prompt, anclas, lector de secciones) y devuelve
  markdown. El adaptador está en `src/cli.ts` (`escribirInformesPorCaso`), que lo
  escribe en `reports/<árbol>/informe/<skill>/<caso>.md` en `suite` y en `report`.
  El árbol de informes se vacía en cada corrida, como el Scorecard: un informe de
  un Caso que ya no existe describiría algo que nadie midió.
- **La aserción viaja en la Ejecución.** `DetalleCheck` gana `assert` y `ancla`
  (opcionales), puestos por el grader. El informe se lee sin depender de que el
  Caso siga en `casos/` ni de que no haya cambiado desde que se midió: una
  Ejecución antigua (antes de este ticket) no trae `assert` y el informe lo dice.
- **La sección se ancla en `rubric.md`**, no en el Caso: el epígrafe
  `## Anclaje en desy-skills` con `- <id>: <skill> → «<título>»`. `anclajesDeRubric`
  (`src/caso.ts`) lo lee; el loader lo pega a cada `Check` (`Check.ancla`).
  `problemasDeAnclaje` (`src/guardarrail-casos.ts`) exige, en `npm run
  verificar-casos`, que el id exista en el Caso y que la sección exista en el
  `SKILL.md` de `vendor/` — el árbol canónico que el repo versiona.
- **Por texto, no por línea.** `seccionDeSkill` (`src/seccion-skill.ts`) extrae la
  sección por su **título**; el lector lee del árbol **que se midió** (el `vendor/`
  de un Pin remoto, el `<checkout>/skills` de un Pin local, vía `pinRepo` en la
  Ejecución), para no citar las secciones de otro árbol.
- **La línea que tumba**, con su número, sale del artefacto entregado: se busca el
  **valor** que la aserción nombra (`c-button--primary`, no el id del Check). Si el
  Check falla por **ausencia** —el caso de un Guard, y el modo en que falla el
  artefacto real del 27/10— no se inventa una línea culpable: se dice que falla
  por ausencia y, si se localiza, se muestra la **llamada al macro** como el sitio
  donde debería estar (no el `{% from … import %}`, que no es el que hay que editar).
- **Presenta, no adivina.** No hay campo ni frase de culpabilidad; el informe lo
  dice de sí mismo y un test lo afirma (`/culpa/i` no aparece). El único énfasis es
  el **hallazgo de trigger** (entrega EXCELENTE sin invocar el skill): es un hecho
  del Flujo, no una atribución, y el ticket 07 lo llevará a la cabecera del
  Scorecard.
- **Sin sección ni línea, se dice.** Un Check sin ancla: «el Check no declara de qué
  sección depende». Una Ejecución sin invocación: «no se invocó ningún skill, así
  que no hay sección que leer». Un Check de Flujo: «mira el Flujo, no el artefacto».
- **Los Casos existentes pueden empezar sin anclas** (el informe sigue legible);
  `boton-primario`, el Caso del 27/10 que motivó el ticket, queda anclado como
  ejemplo. Retro (29/10): se midió que **10 de los 11** Casos con epígrafe de
  anclaje lo escriben como prosa de apoyo («Macros y props: … → «…»»), que no dice
  a qué Check corresponde cada sección; el parser, correcto, los ignoraba y
  `verificar-casos` no podía avisar, porque sólo valida lo que encontró. Ahora cada
  Check debe tener su ancla, y los 13 Casos pendientes están en
  `PENDIENTES_DE_ANCLAR` con el ticket 11: el check falla para un Caso nuevo sin
  ancla, enumera la deuda al pasar, y falla si la lista miente (un pendiente
  fantasma o ya anclado). Anclarlos exige juicio sobre qué sección cubre cada
  Check, así que se hace Caso a Caso, al tocar cada skill.

## Verificación

`npm run precommit` en verde. Tests nuevos: `test/informe.test.ts` (20, sobre el
Caso real `boton-primario`: bloque por Check, cita por título, ausencia, trigger,
falta de invocación y la regla de «presenta, no adivina»), `test/informe-cli.test.ts`
(proceso real: `report` deja `informe/<skill>/<caso>.md` y borra el informe de una
corrida anterior), más casos en `test/caso.test.ts` (parser del ancla),
`test/caso-loader.test.ts` (ancla pegada al Check) y `test/guardarrail-casos.test.ts`
(id inexistente, sección inexistente, skill fuera del árbol).

## Retro (29/10): lo que la revisión y la retro destaparon

La primera versión tenía un fallo de criterio que **su propio test tapaba**: el
test de «sin invocación no se cita la sección» inyectaba un lector vacío, que
ocultaba que `seccionDe` consultaba el árbol **antes** de mirar la invocación.
Cazado por `/code-review` y arreglado en `5b07a57`, con el test reescrito sobre el
árbol real y comprobado en rojo contra el código anterior. La lección está en
`CODING_STANDARDS.md` → «A test of a "must not" is written with the adverse
scenario whole».

De la retro salieron, además, dos agujeros del entorno (`5b07a57` y el commit de
retro): el hook de pre-commit enumeraba los pasos a mano y no corría
`verificar-pin`, y los acentos aplanados —el fallo de este mismo ticket— no tenían
check. Ahora el hook llama a `npm run precommit` y `npm run verificar-acentos` caza
las palabras españolas que sin tilde no existen.

