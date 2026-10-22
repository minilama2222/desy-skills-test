# Hallazgo: los guards de macro leen el artefacto equivocado

El runner devuelve **sólo el `dist/` compilado** (ADR-0005), pero los guards de
contrato de macro (`macro_presente`, `macro_con_clase`, `macro_sin_clase`,
`sin_props_inventados`) buscan la **llamada al macro** — que vive en el fuente
(`.njk`), no en el HTML compilado, donde el macro ya se expandió a
`<button class="c-button c-button--primary">`.

## Evidencia

Experimento de estabilidad, 3 Ejecuciones del Caso `boton-primario` (Pin
`b523ca7`, harness con scaffold cacheado). La Ejecución 2 produjo un artefacto
correcto —`dist/pagina-boton-enviar.html`, con
`<button type="submit" class="c-button c-button--primary">Enviar</button>`— y el
harness le dio **tres fallos, ninguno imputable al skill**:

1. `usa-macro-boton` — busca `componentButton` en el HTML compilado, donde ya no
   existe.
2. `variante-primaria` — igual: el macro ya se expandió.
3. `tokens-del-sistema` — marca `text-6xl`, `w-8`, `h-8`, `p-2`… que son del
   **header y footer del starter**, no del botón generado.

Las 3 Ejecuciones dieron INACEPTABLE, y la 2 es un falso negativo puro.

## Consecuencia

El Grade del Slice 1 hoy no mide lo que dice medir. Antes de decidir la política
de N Ejecuciones (criterio 5 del ticket 05), hay que arreglar esto — si no,
cualquier agregación agrega ruido.

## Opciones de arreglo

- **Devolver también el fuente** en `listArtefactos` (p. ej. `src/` nuevo o
  modificado, además de `dist/`), y que los guards de macro miren el fuente
  mientras los de HTML/a11y miran el `dist/`. Requiere que los Checks declaren
  sobre qué miran.
- **Que los guards de macro acepten ambas formas**: la llamada al macro en el
  fuente *o* el `<button class="...">` resultante en el compilado.
- **Que el Caso-componente no compile**: pedir el `.njk` como artefacto y no
  pasar por `dist/`, dejando el `dist/` para el Caso-página.

Relacionado: ticket 08 (Caso-página) también mide artefactos, así que la decisión
le afecta.

## Respuesta a «¿dónde escribe el SUT?» (sonda, 22/10)

Sonda con el sandbox conservado, diff del árbol antes/después de la Ejecución:

```
[MODIFICADO] src/botones.html     ← el SUT escribe aquí el fuente
[MODIFICADO] dist/botones.html    ← el build lo compila aquí
[MODIFICADO] dist/css/styles.css
[MODIFICADO] dist/index.html (y ~20 páginas más del starter, recompiladas)
```

**El SUT sí escribe el fuente.** Lo escribe en `src/`, como `.html` (no `.njk`),
siguiendo la convención que el propio skill documenta: «las páginas son ficheros
`.html` en `src/` que extienden las plantillas `.njk`». Contenido real:

```njk
{% from "components/button/_macro.button.njk" import componentButton %}
...
{{ componentButton({ "text": "Enviar", "type": "submit", "classes": "c-button--primary" }) }}
```

La llamada al macro está en el fuente, correcta. El runner no la recogía porque
solo miraba `dist/`.

## Respuesta a «¿es bug del harness o flakiness del SUT?» (experimento v2, 22/10)

3 Ejecuciones con la caché **limpia**, registrando a la vez lo que devuelve el
runner y lo que el SUT escribió de verdad:

| # | Runner devuelve | Fuente escrita | Grade |
|---|---|---|---|
| 1 | `dist/boton-enviar.html` | **`src/boton-enviar.html`** | INACEPTABLE |
| 2 | — | **—** | INACEPTABLE |
| 3 | — | **—** | INACEPTABLE |

**Son dos problemas distintos, y ahora están separados:**

- **#1 es bug del harness, no del SUT.** El SUT produjo una respuesta de manual
  (`componentButton` con `c-button--primary`, texto «Enviar», `type: submit`,
  `preventDoubleClick: true` — las cuatro props válidas en el catálogo) y el
  harness la suspendió. Su fuente solo usa `pb-lg` y `c-h1`: **cero utilities de
  la escala Tailwind**, así que sobre el fuente `tokens-del-sistema` también
  habría pasado. Los tres fallos de #1 desaparecen moviendo el artefacto al
  fuente.
- **#2 y #3 sí son flakiness del SUT, y de dos tipos distintos**: #2 llegó a
  `implement-component` pero no entregó nada; **#3 ni siquiera pasó de
  `preflight-check`**, así que se paró antes de entrar al skill bajo test. Los
  tres fallos de ambas son "no hay artefacto que gradúe", no una valoración del
  trabajo.

## Hallazgo colateral: la caché estaba contaminada

`src/botones.html` y `dist/botones.html` **también estaban en la caché** del
scaffold, porque la caché se creó copiando un directorio donde un SUT ya había
corrido. Efecto: esas páginas entraban en la **línea base**, así que el diff las
daba por pre-existentes y el runner devolvía `dist/botones.html` como si fuera
output del SUT cuando en realidad era el de una corrida anterior.

La caché tiene `.git` (es un `git clone` en `37748bd`), así que se detecta con
`git status` dentro de `.scaffold-cache/desy-html-starter`: debe salir solo
`.nvmrc`. Corregido: la caché se limpió y la receta fija el commit del starter en
`scaffold-pin.json`.

## Opciones de arreglo
