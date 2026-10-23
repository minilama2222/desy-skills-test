# El artefacto de un Caso-página es la página que el SUT escribió, no todo el `dist/`

El artefacto de un Caso-página (el `dist/` según ADR-0006) se restringe al
`dist/X.html` cuya fuente `src/X.html` es nueva o modificada respecto a la línea
base. El resto del `dist/` (las ~20 páginas de ejemplo del starter, `css/`, `js/`)
es salida del **build**, no del Caso.

## Contexto

ADR-0006 fija que el artefacto del Caso-página es el **compilado** (`dist/`),
porque la página renderizada y su a11y sólo existen ahí. La recolección filtra
por **línea base**: lo que ya venía en el scaffold no cuenta como artefacto.

Ese filtro funciona para `src/` (el starter trae sus ficheros versionados, así
que lo nuevo es del SUT), pero **no para `dist/`**: la caché limpia del scaffold
**no tiene `dist/`** (nadie compiló, ver ADR-0005), así que tras el `npm run
build` del SUT **las ~20 páginas del starter son todas «nuevas»**. El artefacto
salía siendo el `dist/` entero: 20+ páginas, el CSS y el JS.

Consecuencia medida (primera Ejecución real del Caso del ticket 08): los guards
de a11y, tokens y fidelidad escaneaban el boilerplate del header/footer y las
páginas de ejemplo del starter. El Grade era INACEPTABLE por material que no era
el output del Caso.

## Decisión

Una página no se juzga por su `dist/` entero, sino por **la página que el SUT
escribió**. El SUT escribe la página como fuente en `src/X.html` (convención del
propio skill); el build la compila a `dist/X.html`. Así que el artefacto de un
Caso-página es:

> el `dist/X.html` cuya fuente `src/X.html` es nueva o modificada respecto a la
> línea base.

Los assets del build (`css/`, `js/`) y las páginas del starter (fuente intacta)
no son artefactos. Si el SUT modifica una página del starter (`src/index.html`),
su `dist/index.html` sí cuenta: la fuente cambió.

## Alternativas descartadas

- **Compilar sólo la página del SUT** (build aislado): cambia el flujo del
  starter y añade un paso que no es lo que haría una persona. El build normal es
  el comportamiento real.
- **Tomar el `dist/` por prefijo/nombre del Caso**: el Caso no sabe cómo
  nombrará la página el SUT (en la Ejecución real la llamó
  `paso-1-datos-de-identidad.html`, no como el `id` del Caso). La correlación
  `src → dist` no adivina: la lee del disco.
- **Que el Caso-página no compile** (artefacto = `src/`): la a11y y la fidelidad
  se miden sobre la página **renderizada**, no sobre la plantilla Nunjucks sin
  expandir. Es justo lo que ADR-0006 dejó fuera.

## Consecuencias

- El artefacto de un Caso-página pasa a ser **un fichero** (la página), no el
  árbol del build. Los guards miran sólo el output del Caso.
- La correlación vive en el runner (`listarArtefactosDeSalida` para `dir ===
  "dist"`), que ya recibe el directorio; no añade campo al Check ni al Caso.
- Un Caso-página en el que el SUT **no escribe fuente** (escribe sólo el
  compilado, o nada) tiene **cero artefactos**: `sin-artefacto`, que es el eje
  correcto (ver ticket 15), no un INACEPTABLE por boilerplate.
