Estructura un grupo de formulario DESY con `desy-implement-layout-patterns`.

Contexto:
- Estás en una carpeta de trabajo con un proyecto DESY ya inicializado
  (`desy-html`), así que puedes escribir directamente la sección.
- La librería es `desy-html`.
- Es un grupo semántico de dos campos (correo electrónico y móvil) más las
  acciones de página al final del formulario.

Requisitos:
- Agrupa los campos en un `fieldset` con su `legend` (el `legend` va oculto con
  `sr-only`; el título visible, si lo hay, va fuera del `fieldset`).
- Dispone los campos en la rejilla responsiva del formulario: una rejilla de
  cuatro columnas en desktop (`lg:grid-cols-4`), sin columnas fijas en mobile
  (cada campo ocupa su fila). Reparte los dos campos con `lg:col-span-2`.
- Cada control lleva su `label` asociado por `for`/`id`.
- Monta las acciones en una `section` con su encabezado oculto («Acciones de
  página») y la lista de botones; la acción principal es «Siguiente paso»
  (primaria) y la secundaria («Volver») usa el botón transparente, no un enlace.
- Usa sólo tokens del sistema para el espaciado (nada de la escala numérica de
  Tailwind ni valores arbitrarios).
