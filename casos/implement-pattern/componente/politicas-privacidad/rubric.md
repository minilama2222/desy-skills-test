# Rúbrica — politicas-privacidad (Caso-componente, Bloque B)

Petición: «Implementa el patrón atómico DESY "Aceptar políticas de privacidad"»
(la verificación legal previa al envío de un formulario: una casilla de
consentimiento con la política de privacidad).

Es un **Caso-componente** (fragmento, sin Gold). El artefacto es el **fuente**
que el SUT escribe en `src/`: lo que se juzga es la **llamada al macro**, que se
expande al compilar y por eso no vive en el `dist/` (ver ADR-0006). Por eso sus
guards son de **macro y de tokens**, no de HTML renderizado.

## Guards (su fallo ⇒ INACEPTABLE)

- **usa-macro-checkboxes**: la sección usa el macro `componentCheckboxes` de la
  librería DESY. HTML suelto con `c-checkboxes` copiado a mano no cuenta: el
  macro es quien aplica las clases, el `fieldset`/`legend` y el ARIA.
- **sin-props-inventados**: ninguna prop de la llamada al macro sale del catálogo
  de `componentCheckboxes` del Pin (`desy-component-recognizer/assets/catalog.json`).
  Inventar props (`variante`, `color`…) es el error histórico que el skill
  `desy-implement-component` declara como típico.

## Quality (puntúan hacia el Grade)

- **legend-sr-only** (peso 1): el grupo declara un `legend` oculto (`sr-only`).
  El patrón exige que el `legend` no se vea (el título visible, si lo hay, va
  fuera del `fieldset`).
- **texto-politica** (peso 1): la etiqueta menciona la «política de privacidad»:
  es el hecho de contenido del patrón.
- **espaciado-del-sistema** (peso 2): **fidelidad de tokens**. El espaciado del
  patrón usa la escala canónica de DESY (`mt-base`, `py-base`, `mx-sm`…), no la
  escala numérica de Tailwind (`mt-3`, `py-2`) ni valores arbitrarios
  (`p-[13px]`). El guard de tokens del Framework (`tokens-del-sistema`) sigue
  cazando utilidades por defecto y valores arbitrarios; este Quality mide además
  que el espaciado declarado rendonde el token correcto.

## Anclaje en `desy-skills`

- Patrón atómico: `desy-implement-pattern` → «Cómo pedimos información» →
  «Aceptar políticas de privacidad»; anti-pattern «eliminar el
  `<fieldset><legend class="sr-only">` "porque no se ve"».
- Macro y props: `desy-implement-component` → «`componentCheckboxes` /
  `componentRadios` — similar a input-group».
- Group semántico y legend sr-only: `desy-implement-layout-patterns` → «Patrón de
  un único checkbox (privacidad, términos)».
- Tokens: `desy-styles-reference` (escala de espaciado `xs/sm/base/lg/xl/2xl/3xl`).

## Fuera de alcance de este Caso

No se compara contra un Gold (es un Caso-componente, sin Gold) ni se evalúa el
encadenado de skills. La a11y sobre el HTML renderizado se mide en el Caso de
layout del mismo Bloque, que sí escribe marcado.
