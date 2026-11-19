# 17: Devolver a las rúbricas la prosa de apoyo que el ticket 12 resumió

**What to build:** Que las 13 rúbricas del ticket 12 recuperen su prosa de apoyo
**literal** de `465a071`, con las anclas por Check **añadidas** encima. El ticket
12 pidió que el ancla se sume y no sustituya; se resumió, y la casilla lo dice.

**Blocked by:** 12

**Status:** done

- [x] Cada `## Anclaje en desy-skills` lleva la prosa de `465a071` **palabra por
      palabra**, con las líneas `- <id>: <skill> → «<sección>»` arriba
- [x] Ninguna sección citada se pierde (lo comprueba ya `verificar-casos`
      contra `HEAD`)
- [x] La casilla de prosa del ticket 12 se marca
- [x] `npm test` y `npm run precommit` en verde

## Qué se perdió

El retro del ticket 12 midió el daño a mano y quedó corto; la revisión de código
encontró más:

- `patron-pagina-paso-1-nombre-nif`: se perdió `desy-choose-page-template` y la
  cita a «Medidas canónicas» pasó a prosa sin la forma `skill → «sección»`.
- `token-espaciado`: la prosa cita ahora «Anti-patterns»/«Ejemplos», pero el
  original citaba «`p-4` → `p-base`» y «`gap-4` → `gap-base`», que **no son
  títulos** de sección: eran texto de apoyo con flechas que no son citas.
  Resumirlos perdió el emparejamiento bueno/malo con el que el Caso enseña.
- `validate-accessibility`: el mapeo `grep` por `grep` quedó en una línea.

## Cómo hacerlo sin volver a romperlo

Por cada rúbrica:

1. `git show 465a071:<ruta>` y copia el bloque del epígrafe **entero**.
2. Pega las anclas **encima** del bloque; no toques el bloque.
3. `npm run verificar-casos` (títulos y pérdidas) y `npm test`.

El tell: el diff de la rúbrica solo debe **añadir** líneas. Si borra alguna, no
es este ticket.

## Por qué no lo hizo el 12

Se resumió para que la rúbrica no dijera dos veces lo mismo que el ancla. Es una
decisión defendible —y ahora una regla de revisión en `CODING_STANDARDS.md`—, pero
la decisión no estaba tomada: el ticket pedía conservar, y se cambió el criterio
por la puerta de atrás.

## Cómo quedó

Las 10 rúbricas que **tenían** prosa en `465a071` la recuperan palabra por
palabra, con la intro y las anclas **encima**. El diff contra `465a071` de esas 10
sólo añade líneas. Las 3 que no tenían epígrafe (choose-library,
choose-page-template, component-recognizer) no se tocan: su prosa la escribió el
ticket 12 y no hay original al que volver.

El invariante queda fijado en `test/secciones-citadas.test.ts`: **cada línea de
prosa de `465a071` sigue en la rúbrica de hoy**, y un test hace de control con el
texto resumido que el 12 dejó, comprobado rojo al reponerlo.

## La decisión que el 17 destapó: `fieldset-grid-acciones`

Devolver la prosa chocó con el paso 4 del retro del 12, que había **quitado** el
ancla de `fieldset-con-legend` y `labels-visibles`. La premisa era falsa: no son
Guards del Framework de un Caso-componente —que sólo recibe `tokens-del-sistema`—,
sino Checks que el Caso **declara** en su `checks.json` porque los mide. Sin ancla,
el informe decía de dos Checks medidos «no declara de qué sección depende».

Decidido: **se anclan**, y la regla general se afina en lugar de ignorarse.

- `GUARDS_DEL_FRAMEWORK` (un-solo-h1, skip-link, el trío de fidelidad) es lo único
  que `verificar-casos` rechaza al anclar. `IDS_DEL_FRAMEWORK` se queda como el
  vocabulario de ids (para `problemasDeRubric`).
- `checksSinAncla` cuenta **todos** los Checks declarados. El filtro anterior
  escondía un Check medido: un Caso-componente con los dos Guards sin anclar decía
  «sin ancla ninguno».
- `CODING_STANDARDS.md` sustituye la regla «un Framework Check nunca se ancla» por
  el test que sí distingue: *¿lo ejecuta el Framework sin que el Caso lo declare?*
- Lo fija `test/ancla-framework-negocio.test.ts`, y `test/ancla-framework.test.ts`
  conserva el rechazo para los Guards de verdad.
