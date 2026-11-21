# 32: Un comentario HTML no declara una decisión

**What to build:** Que `declara_decision` / `no_declara_decision` no lean dentro
de un comentario HTML. Hoy `textoDeclara` recibe el artefacto crudo, y un SUT que
documenta la traducción de una macro en un `<!-- … -->` se tumba a sí mismo.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] `textoDeclara` ignora lo que va dentro de `<!-- … -->`, igual que ya ignora
      los comentarios Nunjucks `{# … #}`
- [ ] Un artefacto que sólo nombra `componentButton` dentro del comentario pasa
      `no_declara_decision`
- [ ] Nombrado fuera del comentario sigue fallando (no se afloja el hecho)

## La evidencia (suites 4 y 5, 21/11/2026)

`angular-translator/boton-primario-angular` da **BUENO 3 de 3** y su único rojo
es `no-declara-decision "componentButton"`. El artefacto es correcto: traduce la
macro a `<desy-button>` y, para explicarlo, deja el origen en un comentario:

```html
<!--
  Origen (Nunjucks):
    {{ componentButton({ "text": "Enviar", "classes": "c-button--primary" }) }}
-->
<desy-button [text]="text" [classes]="classes">{{ text }}</desy-button>
```

El skill pide justo esa trazabilidad; el Check la castiga. Es el mismo género que
el ticket 31, pero sobre comentarios HTML en vez de celdas de tabla. En la
corrida 3 del mismo árbol el Caso pasó: el agente no incluyó el comentario. Un
Check no debería decidir por eso.
