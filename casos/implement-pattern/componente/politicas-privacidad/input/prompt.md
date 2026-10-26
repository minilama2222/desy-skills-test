Implementa el patrón atómico DESY «Aceptar políticas de privacidad».

Contexto:
- Estás en una carpeta de trabajo con un proyecto DESY ya inicializado
  (`desy-html`), así que puedes escribir directamente la sección.
- La librería es `desy-html`.
- El patrón es la verificación legal previa al envío de un formulario: una única
  casilla de consentimiento con la política de privacidad.

Requisitos:
- Es un grupo semántico: envuélvelo en un `fieldset` con su `legend` (el `legend`
  va oculto visualmente con `sr-only`; el título visible, si lo hay, va fuera).
- Usa el macro de la librería para el grupo de casillas (`componentCheckboxes`),
  no HTML suelto: el macro es quien aplica las clases y el ARIA.
- La casilla es obligatoria y su etiqueta menciona la «política de privacidad»
  enlazada.
- La sección se separa del resto del formulario con el espaciado del sistema:
  envuélvela en un elemento con su utilidad de margen (`mt-base mb-base` o la que
  corresponda), no en HTML desnudo.
- No añadas props que el macro no acepte y usa sólo tokens del sistema (nada de la
  escala numérica de Tailwind ni valores arbitrarios).
