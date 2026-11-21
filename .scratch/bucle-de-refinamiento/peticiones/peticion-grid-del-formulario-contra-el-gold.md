# Que el grid del formulario tome sus columnas y su gap de la referencia, no de un ejemplo fijo

**Fichero destino:** `skills/desy-implement-layout-patterns/SKILL.md` (ruta dentro de `desy-skills`)

**Origen:** Caso `implement-pattern/patron-pagina-paso-1-nombre-nif`, guard `fidelidad-gap`, Ejecuciones 1, 2 y 4 del árbol `cce1633b…` (suite del 21/11/2026)

**Estado:** aplicada en el PR #38 (pendiente de merge; ver §9)

---

## 1. El cambio, en una frase

Que la sección «Grid responsivo del formulario» deje de presentar
`grid lg:grid-cols-4 gap-x-base` (sin columnas de mobile) como el patrón
canónico, y diga que **las columnas de mobile y el gap salen de la referencia
visual**: `gap-lg` cuando la referencia separa 28 px —el caso del paso 1 del
formulario— y `gap-x-base` cuando separa 16 px.

Y que el ejemplo completo de «Putting it together» **no invente una rejilla para
la intro**: en el gold oficial la intro y los campos comparten la rejilla madre
(`col-span-2 lg:col-span-3`). Una rejilla extra delante pasa a ser la primera de
la página y es la que se mide.

## 2. Por qué (evidencia)

Tres de tres entregas del Caso escribieron el grid así:

```
check:      fidelidad-gap  (fidelidad_estructural → hecho "gap")
evidencia:  <div class="grid lg:grid-cols-4 gap-x-base mb-base">
gold:       <div class="grid grid-cols-2 lg:grid-cols-4 gap-lg">
esperado:   las clases de grid del Gold, sobre el mismo elemento
```

No es una invención del agente: es **el ejemplo literal del skill**, copiado
palabra por palabra. Y el skill lo refuerza en la línea siguiente:

> **Solo `lg:grid-cols-N`** (no `grid-cols-*` mobile explícito). En mobile cada
> item va a su propia fila.
>
> **`gap-x-base`** (1rem horizontal, el token base de `desy-styles-reference`).
> NO `gap-lg` (es para layouts más amplios) ni la escala numérica de Tailwind
> (`gap-x-4`).

El Gold oficial del Caso (`patron-pagina-paso-1-nombre-nif.html`) usa dos
columnas en mobile y 28 px entre columnas. Un SUT que obedece al skill suspende
por obedecerlo.

La contradicción, además, choca con `desy-design-match`, que manda medir la
referencia y llevar el resultado a tokens («Canónico = {8, 16, 28, 32} px»), y
con el propio aviso del repo: cuando un ejemplo de `implement-*` contradice la
referencia, gana la referencia y el ejemplo es el legado que hay que cazar.

### La segunda mitad del defecto (medida el 21/11, 02:05)

Con la sección del grid ya corregida, **1 de 4** Ejecuciones reprodujo el grid
del Gold (`grid grid-cols-2 lg:grid-cols-4 gap-lg`). Las otras 3 copiaron la
rejilla de intro del ejemplo completo:

```
evidencia:  <div class="grid lg:grid-cols-4 gap-x-base mb-base">
gold:       la intro va DENTRO de la rejilla madre, en col-span-2 lg:col-span-3
```

`fidelidad_estructural { hecho: "gap" }` mide la **primera** rejilla de la
página. Si el skill enseña una rejilla de intro con `gap-x-base`, el SUT la escribe
delante del formulario y suspende aunque su formulario esté bien. En el gold
oficial no existe esa rejilla: hay una sola, y envuelve intro y campos.

## 3. La sección que lo causa

`## Grid responsivo del formulario` → `### Grid madre: solo desktop`, con su
bloque de ejemplo y sus dos bullets (el que empieza «Solo `lg:grid-cols-N`» y el
que empieza «**`gap-x-base`**»).

Y en `## Putting it together: estructura de wizard step`, el bloque de la intro:

```html
{# Intro opcional #}
<div class="grid lg:grid-cols-4 gap-x-base mb-base">
  <div class="col-span-2 lg:col-span-3">
```

Ese div no existe en el gold: la intro es un hijo de la rejilla madre. Ahí está
la mitad del fallo.

## 4. Restricciones

- No se cambia `desy-styles-reference`: `gap-lg` (1.75rem) y `gap-x-base`
  (1rem) siguen siendo los tokens; el cambio es **cuál** manda en cada página.
- No se toca el Gold ni el Caso: la verdad del Caso es el HTML oficial.
- No se prohíbe `gap-x-base`: en un formulario denso o en el grid anidado de
  campos cortos, 16 px es la medida correcta. Lo que se prohíbe es **asumirlo
  sin mirar la referencia**.
- No se inventan valores arbitrarios (`gap-[28px]`) ni se vuelve a la escala
  numérica de Tailwind (`gap-x-4`).

## 5. Cómo se valida

- [ ] En `desy-skills-test`, sobre la rama del cambio:
      `npm run run -- --skill implement-pattern --case patron-pagina-paso-1-nombre-nif --skills-local <ruta del checkout> --n 3 --tope 4`
- [ ] **PASA sostenido**: dos corridas consecutivas PASA, entregas contadas por
      separado, y `fidelidad-gap` verde en todas las entregas.
- [ ] Sin regresión en `implement-layout-patterns/fieldset-grid-acciones`
      (su guard sólo exige `grid` + `lg:grid-cols-4` en el mismo elemento).

El diff exacto está en [`adjuntos/grid-del-formulario.patch`](adjuntos/grid-del-formulario.patch);
se aplica sobre `cce1633` (copia de `vendor/desy-skills`).

## 6. Skills sugeridos para el agente

- `desy-implement-layout-patterns`
- `desy-design-match` (para leer la medida de la referencia)

## 7. Lo que no debe hacer

- No re-pinear `desy-skills-test`.
- No editar `vendor/desy-skills/`.
- No añadir evals ni documentación de `desy-skills-test` dentro de `desy-skills`.
- No cambiar el Caso para que acepte `gap-x-base`: eso sería mover la verdad al
  skill en vez de al Gold.

## 8. Declaración de cierre (la rellena el agente que aplica)

**No se cierra.** Medido el 21/11/2026 sobre la rama local
`skill/patron-pagina-gap` (checkout en `$TMPDIR/desy-skills-patron-pagina`,
árbol limpio, `arbolHash` `477acb3…` con el primer cambio y `5675072…` con el
segundo):

- Con el primer cambio (grid madre), **1 de 4** Ejecuciones acertó el grid.
- Con el segundo (la intro dentro de la rejilla madre), **3 de 3** lo acertaron
  (`grid grid-cols-2 lg:grid-cols-4 gap-lg`) y `fidelidad-gap` quedó verde en
  todas.
- Aun así, 2 de 3 Ejecuciones fallan `encadenado-canonico`: invocan
  `design-match` después de `validate-accessibility`. Ese rojo quedó fuera de
  esta petición a propósito, así que no hay PASA sostenido y **no se mergea
  todavía**.

Siguiente paso: abrir el ciclo de `encadenado-canonico` con esta rama puesta y
repetir la medición. El cambio del gap se queda en la rama como base.

## 9. Corrección de la medida (21/11/2026, Ejecuciones 12–17)

La medida anterior decía «3 de 3» y «1 de 4». Con seis Ejecuciones más del mismo
árbol (`a0b29172`), la tasa real es más baja y la lectura cambia:

| Árbol `a0b29172` (esta rama) | `fidelidad-gap` |
|---|---|
| 5, 6, 7, 12–17 | **5 de 9** |

Los cuatro fallos son concretos y no ruido:

- **13, 14, 16**: escriben `grid-cols-1` u **omiten** la columna de mobile; el
  Gold pide `grid-cols-2`. El gap ya es `gap-lg` en las tres.
- **12**: no escribe ninguna rejilla.

Lo que el cambio **sí** consiguió: ninguna rejilla madre usa `gap-x-base` en toda
la muestra. Antes, 2 de 3 Ejecuciones copiaban el ejemplo literal
(`grid lg:grid-cols-4 gap-x-base`); ahora la contradicción «NO `gap-lg`» ya no
está.

Lo que **no** consiguió: que el guard pase siempre. La frase «si los pone a dos,
se escribe `grid-cols-2`» roza la desviación pero no la clava, y tres de cuatro
fallos son esa misma omisión.

**Estado:** aplicada en el PR
[#38](https://github.com/minilama2222/desy-skills/pull/38), pendiente de merge.
No se declara cerrada como «PASA sostenido»: el Caso da 2 verdes de 9 y este
cambio no lo pone verde. La columna de mobile queda como petición aparte.
