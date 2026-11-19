# 17: Devolver a las rúbricas la prosa de apoyo que el ticket 12 resumió

**What to build:** Que las 13 rúbricas del ticket 12 recuperen su prosa de apoyo
**literal** de `465a071`, con las anclas por Check **añadidas** encima. El ticket
12 pidió que el ancla se sume y no sustituya; se resumió, y la casilla lo dice.

**Blocked by:** 12

**Status:** ready-for-agent

- [ ] Cada `## Anclaje en desy-skills` lleva la prosa de `465a071` **palabra por
      palabra**, con las líneas `- <id>: <skill> → «<sección>»` arriba
- [ ] Ninguna sección citada se pierde (lo comprueba ya `verificar-casos`
      contra `HEAD`)
- [ ] La casilla de prosa del ticket 12 se marca
- [ ] `npm test` y `npm run precommit` en verde

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
