# Scaffold pre-hecho y cacheado en el sandbox

Un **Caso-componente** que evalúa `desy-implement-component` necesita un proyecto
DESY ya scaffoldeado en el sandbox: el skill declara como regla fundamental que
**no genera componentes sin un starter DESY clonado** («HTML estático con clases
DESY en proyecto vacío no se compila, no usa macros reales — es "imitación"»).
Y `desy-scaffold-project` prohíbe al agente ejecutar el scaffold por su cuenta:
sus bloques bash son plantillas que el usuario copia y corre él.

La consecuencia, observada en Ejecuciones reales (Pin `b523ca7`), es que el SUT
para en `desy-scaffold-project`, explica los pasos y **no produce artefactos**.
En headless no hay usuario a quien pedir permiso, así que el Caso nunca llega a
`desy-implement-component`. El runner pasa a **pre-scaffoldear el sandbox**:
copia un starter ya preparado a `workDir` antes de lanzar el SUT, de modo que el
agente entre directamente en el skill bajo test con el proyecto listo.

El scaffold se **cachea** (igual que la Captura de Gold): se prepara una vez
(clonar el starter, `npm install`) y se reutiliza, porque el clonado y la
instalación son lentos y dependen de red. La caché vive fuera del control de
versiones (`.scaffold-cache/`), con un script de regeneración; lo que se
versiona es la **receta**, no los 88 MB del starter con `node_modules`.

## Alternativas descartadas

- **Dejar que el SUT haga el scaffold**: es lo que hace hoy y no produce
  artefactos, por la prohibición explícita del propio skill. Testearíamos el
  gate de permiso, no la implementación.
- **Reformular el Caso como guard de decisión** (¿pidió permiso?, ¿no clonó?):
  válido para los skills cuyo output *es* una decisión (`preflight-check`,
  `choose-library`, `scaffold-project`), pero convierte el Slice 1 en un test de
  otra cosa. El Caso-componente debe medir el contrato del componente.
- **Scaffoldear en cada Ejecución**: correcto en aislamiento pero añade clonado
  + `npm install` a cada run, con red y minutos de latencia. La caché da el
  mismo aislamiento (cada sandbox recibe su propia copia) sin el coste.
- **Commitear el starter al repo**: 88 MB con `node_modules`; `node_modules` no
  se commitea.

## Consecuencias

- La reproducibilidad del Slice 1 pasa a depender también de la **versión del
  starter** (`desy-html-starter`), no solo del Pin de `desy-skills`. Esa versión
  se registra en `scaffold-pin.json` y la receta de regeneración la fija por
  defecto a un **commit concreto** (`37748bd`), no a una rama en movimiento.
- El sandbox crece de un `workDir` vacío a una copia del starter por Ejecución.
- **La caché debe prepararse desde un árbol limpio.** El starter viene de un
  `git clone`, así que la caché tiene historial: `git status` dentro de
  `.scaffold-cache/desy-html-starter` debe mostrar solo `.nvmrc` como no
  rastreado. Cualquier fichero de más (p. ej. una página que dejó un SUT) es
  contaminación y se cuela en todas las Ejecuciones siguientes como si fuera
  línea base, falseando el diff de artefactos.
- Queda pendiente decidir si el Caso-página (Slice 2) usa la misma caché; es
  esperable que sí, por la misma razón.
