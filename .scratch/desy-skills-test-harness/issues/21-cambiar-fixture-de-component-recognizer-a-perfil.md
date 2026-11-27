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

**Status:** done

- [x] Aprobar el alcance y los Checks nuevos (gate humano)
- [x] Descargar el HTML oficial y su `css/styles.css` a `input/`
- [x] Capturar `input/mockup.png` a 1280 px y comprobar que el CSS se aplica
- [x] Reescribir `prompt.md`, `rubric.md` y `expected/checks.json` para el perfil
- [x] Renombrar el Caso a `reconocimiento-perfil` y actualizar README y tests
- [x] Pasar `npm run precommit`
- [x] Medir el Caso con el SUT y decidir si el fixture es reconocible

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

## Comments

### Cierre (2026-11-27)

Hecho en la rama `spec/harness-21-22`:

- `input/mockup.html` es la copia exacta de la URL oficial (38.914 bytes) y
  `input/css/styles.css` su hoja de estilos; `input/mockup.png` se capturó a
  1280 px con el CSS aplicado (1265×1507: los 15 px de diferencia son el
  scrollbar vertical).
- El Caso se llama `reconocimiento-perfil`; `prompt.md`, `rubric.md` y
  `expected/checks.json` describen el perfil y anclan cada Check a su sección
  del skill.
- Los Checks aprobados en el gate humano son los propuestos: guards
  `reconoce-header`, `reconoce-input`, `reconoce-select`,
  `reconoce-accion-button`; quality `reconoce-accion-primaria`,
  `reconoce-accion-transparente`, `reconoce-footer`,
  `no-inventa-header-advanced`, `no-inventa-header-mini`,
  `no-inventa-input-group`.
- `npm run precommit` en verde.

### Medición con el SUT (3 ejecuciones)

`npm run run -- --skill component-recognizer --case reconocimiento-perfil --n 3 --tope 4`:
`BUENO`, `INACEPTABLE`, `INACEPTABLE`.

El fixture **es reconocible**: los tres SUT identifican `header`, `select`,
`button` (primaria y transparente) y `footer`, y no inventan
`header-advanced` ni `header-mini`. El fallo se concentra en el campo atómico:
el skill, en su regla 3, empuja a llamar `input-group` a cualquier campo con
label, mientras el HTML oficial delimita cada bloque con `<!-- input -->` y usa
un `input.c-input` dentro de `c-form-group`. Dos ejecuciones no identificaron
ningún `input` (INACEPTABLE) y la tercera identificó ambos, pero perdió
`no-inventa-input-group` (BUENO).

No se toca ningún Check para que pase: el Caso mide esa discrepancia entre el
skill y el markup oficial. Queda como hallazgo skill-vs-check para el bucle de
refinamiento; el informe lo presenta, no lo decide.
