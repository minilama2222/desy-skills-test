# 21: Cambiar el fixture de `component-recognizer` del login al perfil de usuario

**What to build:** Sustituir el mockup hecho a mano del Caso
`component-recognizer/decision/reconocimiento-login` por la página oficial
[`patron-pagina-perfil-de-usuario.html`](https://desy.aragon.es/patron-pagina-perfil-de-usuario.html),
capturada **con su CSS aplicado**, y reescribir el Caso para reconocer los
componentes de esa página.

El fixture actual es un `mockup.html` de 1,7 KB con estilos inventados (`banda`,
`campo`, `boton`), no una página DESY real. La página oficial trae los bloques
delimitados por comentarios HTML (`<!-- header -->`, `<!-- input -->`,
`<!-- select -->`, `<!-- button -->`, `<!-- footer -->`), que son la verdad de
qué componente es cada bloque.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Aprobar el alcance y los Checks nuevos (gate humano)
- [ ] Descargar el HTML oficial y su `css/styles.css` a `input/`
- [ ] Capturar `input/mockup.png` a 1280 px y comprobar que el CSS se aplica
- [ ] Reescribir `prompt.md`, `rubric.md` y `expected/checks.json` para el perfil
- [ ] Renombrar el Caso a `reconocimiento-perfil` y actualizar README y tests
- [ ] Pasar `npm run precommit`
- [ ] Medir el Caso con el SUT y decidir si el fixture es reconocible

## Notas de la exploración previa (no commiteada)

Se comprobó en una exploración que se revirtió por completo: la página oficial
captura a 1280 px con el CSS aplicado (el PNG salió de 1280×1507, con la
cabecera, el formulario y el pie reales), y sus comentarios HTML marcan
`header`, `input`, `select`, `button` y `footer`. No queda ningún cambio de esa
exploración en el árbol: el Caso sigue siendo `reconocimiento-login`.

## Qué debe reconocer

La página oficial tiene una cabecera de webapp (`header`), campos atómicos
(`input`), tres desplegables (`select`), botones de acción (`button`: primario
«Guardar», transparentes «Volver» y «Cancelar») y el pie (`footer`). Los
comentarios del HTML marcan `input`, no `input-group`; no hay `header-mini` ni
`header-advanced`.

## Checks propuestos

- Guards: `reconoce-header`, `reconoce-input`, `reconoce-select`,
  `reconoce-accion-button`.
- Quality: `reconoce-accion-primaria`, `reconoce-accion-transparente`,
  `reconoce-footer`, `no-inventa-header-advanced`, `no-inventa-header-mini`,
  `no-inventa-input-group`.

## Por qué es un ticket de harness

El Caso es la vara de medir: cambiar el fixture cambia el estímulo, los Checks y
lo que significa «reconocer bien». No es una petición de cambio de skill ni un
parche de fixture sin dueño. El cambio se revisa y se mide como cualquier otro
Caso.
