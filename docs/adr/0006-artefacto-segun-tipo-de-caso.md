# El artefacto depende del tipo de Caso

El directorio del sandbox del que el runner recolecta el **artefacto** a graduar lo determina el tipo de Caso: `src/` para el Caso-componente y `dist/` para el Caso-página. La decisión se toma en el runner (`dirArtefactoDeCaso`), que ya recibe el `Caso`; el Check no declara nada.

Alternativas descartadas: un campo `sobre: fuente | compilado` en cada Check (generaliza un caso que no existe: ningún Check quiere el compilado dentro de un Caso-componente ni al revés, así que el tipo de Caso ya lo determina), y devolver **siempre** ambas cosas (fuente y compilado) en `listArtefactos` (deja que cada Check elija, pero mete en la Evidencia el `dist/` entero del starter recompilado y obliga a que los guards de tokens decidan sobre cuál de las dos formas miran).

## Contexto

El bug que origina esta decisión: el runner recolectaba **sólo** el `dist/`. Un Caso-componente mide el **contrato del macro** (`macro_presente`, `macro_con_clase`, `sin_props_inventados`), y el contrato sólo existe en el **fuente**: al compilar, Nunjucks expande el macro y con él desaparecen el nombre del macro y sus props. El `dist/` no contiene nada de lo que esos guards miden, así que un Caso-componente correcto daba INACEPTABLE. Evidencia completa en `.scratch/desy-skills-test-harness/issues/HALLAZGO-guards-macro-artefacto.md`.

El Caso-página, en cambio, mide la **página renderizada** (h1 único, skip-link, fieldset+legend, labels, tokens), y eso sólo existe compilado. Por eso los dos tipos no pueden compartir directorio.

## Consecuencias

- El artefacto del Caso-componente es el **fuente**, que el SUT escribe en `src/` como `.html` (convención del propio skill: las páginas son `.html` en `src/` que extienden las plantillas `.njk`). El Caso-componente **no necesita compilar**.
- `tokens-del-sistema` en el Caso-componente deja de escanear el `dist/` del starter recompilado, que traía el boilerplate del header/footer (`text-6xl`, `w-8`, `p-2`) y lo marcaba como si fuera output del SUT. Sobre el `src/` sólo está el fichero que escribió el SUT.
- El `listArtefactos` del sandbox pasa a exigir el directorio: no hay un "directorio por defecto" honesto, porque depende del Caso. Lo elige el runner, no el sandbox.
- Un `dist/` sin `src/` correspondiente ya no puede colarse como artefacto de un Caso-componente (era el caso de la caché contaminada: ver ADR-0005).
- Queda pendiente (fuera de esta decisión) distinguir «no hay artefacto» de «artefacto incorrecto»: hoy ambos son INACEPTABLE y no se pueden separar en el reporte.

## Quién compila el Caso-página (ticket 22, 20/11/2026)

El SUT escribe el **fuente** en `src/`; **el harness compila** con `npm run build`
dentro del sandbox y recoge el `dist/`. No se le pide al SUT que compile.

La primera versión de este ticket pidió la compilación al SUT, en el prompt. No
salió bien, y no por falta de instrucciones: **el SUT no tiene herramienta de
shell**. Sus
permisos son `read`, `edit`, `glob`, `grep`, `list` y `skill` (ADR-0013), y todo lo
demás se deniega. Medido en la suite del 20/11: en **47 Ejecuciones, cero usos de
`bash`**, y el propio agente escribió «no shell tool is available in this session,
so I cannot run `npm run build`». Peor que inútil: gastaba pasos y en dos corridas
llegó a decir «compilo» sin compilar nada.

Compila el harness **siempre**, no como reacción a un fallo del SUT: no hay señal
fiable de «lo intentó», y condicionar el paso a que el agente lo confiese mete la
parte menos fiable del sistema en la receta.

- El build tiene su propio techo (`TIMEOUT_BUILD_MS`, 5 min) y su propio motivo de
  infraestructura (`entorno`): que falte `npm` o que se pase del techo no es un
  juicio sobre el skill.
- El build corre con el **`PATH` del harness**, no con el entorno cerrado del
  sandbox (ticket 25): el entorno del SUT es cerrado a propósito y sin `PATH`
  `spawnSync("npm")` moría con `ENOENT` antes de compilar. Que el build necesite
  un binario no ensancha el entorno del SUT; el `PATH` se añade solo a la
  compilación.
- Un build que falla **compilando el fuente** no lleva esa marca: el artefacto no
  compila, y eso sí es del SUT.
- El prompt no menciona el harness ni la compilación: es el encargo de un usuario,
  no la ficha de un examen. Saber que se le mide invita a escribir para el examen.
