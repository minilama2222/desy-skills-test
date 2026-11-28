# Que el grid del formulario escriba `grid-cols-2 lg:grid-cols-4`, no una rejilla distinta

**Fichero destino:** `skills/desy-implement-layout-patterns/SKILL.md` (ruta dentro de `desy-skills`)

**Origen:** Caso `implement-pattern/patron-pagina-paso-1-nombre-nif`, guard
`fidelidad-gap`, Ejecuciones 12–17 del árbol `a0b29172…` (26/11/2026) y medida
del 27/11/2026 en la rama `improve/columna-mobile-grid`.

**Estado:** PR #40 mergeado; la regla general se completa en el PR #41 (abierto). Gap 4/4 con #41 (ver §11).

---

## 1. El cambio, en una frase

Que la regla del grid madre diga, para este patrón, **`grid-cols-2 lg:grid-cols-4`**
explícito —no `grid-cols-1`, no omitir la columna de mobile y no cambiar la de
desktop por una rejilla de 12—, porque el Gold oficial del paso 1 del formulario
usa las tres clases `grid grid-cols-2 lg:grid-cols-4 gap-lg`.

## 2. Por qué (evidencia)

El cambio del PR #38 quitó la contradicción del gap: ninguna rejilla madre usa
ya `gap-x-base`. Pero `fidelidad-gap` no pide sólo el gap: pide las tres clases
del Gold (`grid-cols-2 lg:grid-cols-4 gap-lg`).

De los cuatro fallos del guard en el árbol `a0b29172`:

| # | Rejilla escrita | Qué falta |
|---|---|---|
| 13 | `grid grid-cols-1 lg:grid-cols-4 gap-lg` | `grid-cols-2` |
| 14 | `grid lg:grid-cols-4 gap-lg` | `grid-cols-2` |
| 16 | `grid grid-cols-1 lg:grid-cols-4 gap-lg` | `grid-cols-2` |
| 12 | *(ninguna)* | toda la rejilla |

**Tres de cuatro son la misma desviación.** El skill ya dice «si los pone a dos
—el paso 1 del formulario de identidad—, se escribe `grid-cols-2`»; la frase
está, y no basta: escriben `grid-cols-1` o lo omiten.

Y la cuarta no escribió rejilla, que es otra cosa (fidelidad de estructura) y
quizá no se arregle con esta frase.

### Primera medida (27/11/2026) — `grid-cols-2` sí, `lg:grid-cols-4` no

Con el cambio de `grid-cols-2` en la rama `improve/columna-mobile-grid`,
`--n 4 --tope 6`, 5 intentos y 5 entregas: `fidelidad-gap` verde en **4 de 5**.
La que falla ya escribe `grid-cols-2`, pero usa **`lg:grid-cols-12`**:

| # | Rejilla escrita | `fidelidad-gap` |
|---|---|---|
| 1 | `grid-cols-2 lg:grid-cols-4 gap-lg` | ✅ |
| 2 | `grid-cols-2 lg:grid-cols-4 gap-lg` | ✅ |
| 3 | `grid-cols-2 lg:grid-cols-4 gap-lg` | ✅ |
| 4 | `grid-cols-2 lg:grid-cols-12 gap-lg` | ❌ |
| 5 | `grid-cols-2 lg:grid-cols-4 gap-lg` | ✅ |

Por eso esta petición no se queda en la columna de mobile: fija también la de
desktop. Los otros dos INACEPTABLE de la corrida son `encadenado-canonico`, que
no es de este cambio.

### Segunda medida (27/11/2026) — con `lg:grid-cols-4` en la regla

Con la rama ya ampliada, `--n 4 --tope 6`: **6 intentos, 5 entregas**, 1 sin
artefacto. `fidelidad-gap` verde en **4 de 5** entregas:

| # | Entrega | `fidelidad-gap` | Rejilla |
|---|---|---|---|
| 1 | sí | ✅ | `grid-cols-2 lg:grid-cols-4 gap-lg` |
| 2 | sí | ✅ | `grid-cols-2 lg:grid-cols-4 gap-lg` |
| 3 | sí | ✅ | `grid-cols-2 lg:grid-cols-4 gap-lg` |
| 4 | no | ❌ | sin artefacto |
| 5 | sí | ✅ | `grid-cols-2 lg:grid-cols-4 gap-lg` |
| 6 | sí | ❌ | `grid-cols-2 gap-lg` (omite `lg:grid-cols-4`) |

La columna de mobile está resuelta en **5 de 5** entregas; la de desktop falla
en 1 de 5. La regresión `fieldset-grid-acciones` sigue en **3/3 EXCELENTE**.
Queda pendiente decidir si se acepta el 4/5 o se itera otra vez.

## 3. La sección que lo causa

En «Grid responsivo del formulario» → «Grid madre: las columnas y el gap salen
de la referencia». Texto propuesto:

> **En este patrón, `grid-cols-2 lg:grid-cols-4`.** El paso 1 del formulario de
> identidad usa `grid grid-cols-2 lg:grid-cols-4 gap-lg`: se escriben las tres
> clases, no `grid-cols-1`, no se omite `grid-cols-2` y no se cambia
> `lg:grid-cols-4` por una rejilla de 12. Omitir o cambiar una de las tres deja
> la página fuera del Gold.

## 4. Restricciones

- No se toca el Gold ni el Caso: la verdad es el HTML oficial.
- No se cambia el guard ni su implementación: mide las clases del Gold.
- No se prohíbe `grid-cols-1` como concepto: en una página cuya referencia
  apile los campos, omitir es correcto. Lo que se fija es **este patrón**.

## 5. Cómo se valida

- [x] `npm run run -- --skill implement-pattern --case patron-pagina-paso-1-nombre-nif --skills-local <checkout> --n 4 --tope 6`
- [ ] `fidelidad-gap` verde en todas las entregas contadas: con la prosa genérica, **3/5**
- [x] Sin regresión en `implement-layout-patterns/fieldset-grid-acciones` (EXCELENTE × 2)

## 6. Lo que no debe hacer

- No re-pinear `desy-skills-test` ni editar `vendor/`.
- No cambiar el prompt del Caso para que diga la clase.
- No dar por bueno `grid-cols-1` porque «en mobile es lo mismo», ni
  `lg:grid-cols-12` porque «da más flexibilidad»: el guard compara con el Gold,
  y el Gold dice `grid-cols-2 lg:grid-cols-4`.

## 7. Declaración de cierre (la rellena el agente que aplica)

Medida el 2026-11-27 en dos pasos:

1. Prosa que nombraba el Caso y su «Gold»: `fidelidad-gap` 10/10. **Se descarta
   como sobreajuste**: el skill decía las clases exactas del eval.
2. Prosa genérica (`3644f7e`, 5 entregas): `fidelidad-gap` **3/5**. Dos fallos
   reales —`gap-base` en vez de `gap-lg`, y `lg:grid-cols-5`— y dos falsos
   negativos del harness, ya corregidos: `un-solo-h1` sumaba documentos
   (`a2787ce`) y el gap solo miraba `<div>` (`de8a117`).

No se declara PASA sostenido. El PR #40 se mergeó como corrección (el skill ya
no se acopla al Caso ni a su Gold), con el 3/5 como hallazgo de capacidad:
https://github.com/minilama2222/desy-skills/pull/40

El pin de `desy-skills-test` se bumpeó a `bd51f4f` (2026-11-28).

## 11. Iteración con la retícula del sistema (2026-11-28)

La doc oficial [Retícula — DESY](https://desy.aragon.es/estilos-reticula.html)
da la regla general que faltaba: **4 columnas en `lg`, 2 en móvil, `gap-lg`**, y
el reparto se hace con `col-span-*`, no cambiando `lg:grid-cols-N`.

Rama `skill/reticula-4-columnas` (`a125fed`), PR #41:

- 6 ejecuciones: **4 entregas con página y `fidelidad-gap` verde 4/4**.
- 2 `sin-artefacto` (una no escribió página, otra agotó el techo de 20 min), fuera
  del cómputo del gap.
- Regresión `implement-layout-patterns/fieldset-grid-acciones`: `EXCELENTE` × 4.

Los rojos restantes de las entregas válidas son `encadenado-canonico`, ya
descartado como cambio de skill. El gap queda resuelto; el PR #41 está pendiente
de merge.
