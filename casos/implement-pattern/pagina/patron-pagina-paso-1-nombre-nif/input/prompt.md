Maqueta una página DESY a partir de la referencia visual adjunta (el primer paso
de un formulario por pasos del Gobierno de Aragón).

Contexto:
- Estás en una carpeta de trabajo con un proyecto DESY ya inicializado
  (`desy-html`), así que puedes escribir directamente la página.
- La librería es `desy-html`.
- El objetivo es reproducir la página de la referencia: un formulario de identidad
  con dos campos (nombre y apellidos, y NIF o NIE) y una casilla de política de
  privacidad obligatoria, más las acciones de página.

Fidelidad: usa la captura del Gold adjunta como referencia visual. Mide anchos,
tipografía y márgenes y llévalos a los tokens del sistema; no inventes valores.

Al terminar, valida la accesibilidad (un solo `h1`, `fieldset` con `legend`,
`label` por cada control, skip-link) sobre el HTML generado.

Compila el proyecto con `npm run build` (la caché del starter ya trae
`node_modules`) para que la página quede en `dist/`. La medida se hace sobre el
HTML compilado de `dist/`, no sobre el fuente de `src/`.
