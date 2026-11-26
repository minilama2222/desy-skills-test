# Que el grid del formulario escriba `grid-cols-2`, no `grid-cols-1` ni lo omita

**Fichero destino:** `skills/desy-implement-layout-patterns/SKILL.md` (ruta dentro de `desy-skills`)

**Origen:** Caso `implement-pattern/patron-pagina-paso-1-nombre-nif`, guard
`fidelidad-gap`, Ejecuciones 12–17 del árbol `a0b29172…` (26/11/2026)

**Estado:** propuesta

---

## 1. El cambio, en una frase

Que la regla del grid madre diga, para este patrón, **`grid-cols-2` explícito**
—no `grid-cols-1`, no omitirlo—, porque el Gold oficial del paso 1 del
formulario pone los campos a dos columnas en mobile.

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

## 3. La sección que lo causa

En «Grid responsivo del formulario» → «Grid madre: las columnas y el gap salen
de la referencia». Texto propuesto:

> **En este patrón, `grid-cols-2`.** El paso 1 del formulario de identidad pone
> los campos a dos columnas en mobile: se escribe `grid-cols-2`, no
> `grid-cols-1` ni se omite. Omitir o poner una columna deja la página a una
> columna en mobile y no reproduce el Gold.

## 4. Restricciones

- No se toca el Gold ni el Caso: la verdad es el HTML oficial.
- No se cambia el guard ni su implementación: mide las clases del Gold.
- No se prohíbe `grid-cols-1` como concepto: en una página cuya referencia
  apile los campos, omitir es correcto. Lo que se fija es **este patrón**.

## 5. Cómo se valida

- [ ] `npm run run -- --skill implement-pattern --case patron-pagina-paso-1-nombre-nif --skills-local <checkout> --n 4 --tope 6`
- [ ] `fidelidad-gap` verde en todas las entregas contadas
- [ ] Sin regresión en `implement-layout-patterns/fieldset-grid-acciones`

## 6. Lo que no debe hacer

- No re-pinear `desy-skills-test` ni editar `vendor/`.
- No cambiar el prompt del Caso para que diga la clase.
- No dar por bueno `grid-cols-1` porque «en mobile es lo mismo»: el guard
  compara con el Gold, y el Gold dice dos.

## 7. Declaración de cierre (la rellena el agente que aplica)

**Pendiente.** Sin medir. No se cierra con una corrida.
