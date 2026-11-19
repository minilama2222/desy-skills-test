# Un id del Framework se ancla si el Caso lo declara; un Guard del tipo de Caso no

`IDS_DEL_FRAMEWORK` mezcla dos clases de Check, y sólo una es intocable para el
ancla. Un **Guard del tipo de Caso** (`un-solo-h1`, `skip-link`, el trío de
fidelidad, `tokens-del-sistema`) lo aporta `frameworkDeChecks` y se gradúa aunque
la rúbrica no lo nombre: anclarlo es una segunda fuente y, en un Caso-página que
además lo declarase, un doble Grade. Un **id que el Framework también usa y el
Caso declara** (`fieldset-con-legend` y `labels-visibles` en un Caso-componente,
cuyo Framework es sólo `tokens-del-sistema`) es un Check de negocio: el Caso lo
mide porque está en su `checks.json`, así que **se ancla** como cualquier otro.
La lista de ids del Framework se queda como vocabulario; lo que
`problemasDeAnclaDeFramework` rechaza es `GUARDS_DEL_FRAMEWORK`.

## Contexto

El ticket 12 ancló cada Check de los trece Casos pendientes. Su retro sacó el
ancla de los dos Checks de `fieldset-grid-acciones` que llevaban id del
Framework, con el argumento de que «lo aporta el tipo de Caso». El argumento no
se comprobó contra el tipo: los Guards de un Caso-componente son sólo
`tokens-del-sistema`, y esos dos están en el `checks.json` del Caso porque lo que
se mide es su decisión de maquetar. Sacarles el ancla dejó **dos Checks medidos
sin sección** en el informe, y además destapó que `checksSinAncla` filtraba los
ids del Framework al contar: un Caso-componente con los dos sin anclar decía
**«sin ancla ninguno»**. Es decir, el guardarraíl no podía ver la deuda justo
cuando estaba.

Al devolver la prosa de `465a071` (ticket 17) hubo que decidir qué había
ganado: la prosa literal o el ancla de menos. Las dos cosas no caben —la prosa
literal vuelve a citar esas secciones, y el ancla solo tiene sentido si el Check
es del Caso—, así que se revisó la premisa en vez de elegir por costumbre.

## Alternativas descartadas

- **Mantener la regla del ticket 12 (ningún id del Framework se ancla)**: deja
  dos Checks medidos sin sección y necesita una prosa especial que explique por
  qué el Check no la tiene. El informe dice «no declara de qué sección depende»
  de un Check que sí depende de una.
- **Sacar `fieldset-con-legend` y `labels-visibles` de `IDS_DEL_FRAMEWORK`**: la
  lista no es sólo una regla de anclaje; es el **vocabulario de ids** que
  `problemasDeRubric` usa para distinguir un id de un valor de dominio en
  negrita. Quitarlos haría que la rúbrica de otro Caso citando `labels-visibles`
  en prosa se leyera como un id obsoleto.
- **Anclarlos y no avisar**: el id sigue siendo compartido, y el aviso es lo que
  hace visible que dos Casos podrían citar secciones distintas para el mismo
  string.

## Consecuencias

- `GUARDS_DEL_FRAMEWORK` (`src/guardarrail-casos.ts`) es lo único que
  `problemasDeAnclaDeFramework` rechaza; el aviso lo dice con esas palabras.
- `checksSinAncla` cuenta **todos** los Checks declarados, sin filtrar. La deuda
  y el rojo dejan de poder discrepar.
- La declaración de un Guard sigue siendo un rojo para el Caso que lo ancla, y la
  de un Check de negocio con id compartido no lo es: `test/ancla-framework.test.ts`
  prueba lo primero con `un-solo-h1` y `fidelidad-gap`, y
  `test/ancla-framework-negocio.test.ts` fija lo segundo.
- El test que decide la clase no es «¿está en la lista?» sino **¿lo ejecuta el
  Framework sin que el Caso lo declare?** Está en `CODING_STANDARDS.md`.
