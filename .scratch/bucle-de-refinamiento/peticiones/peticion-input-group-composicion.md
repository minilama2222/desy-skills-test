# Que `input-group` se defina como agrupación de N controles, no como «label + input + hint + error»

**Ficheros destino:** `skills/desy-component-recognizer/SKILL.md` y `skills/desy-angular-translator/SKILL.md` (rutas dentro de `desy-skills`)

**Origen:** Caso `component-recognizer/reconocimiento-perfil`, checks `reconoce-input` (guard) y `no-inventa-input-group` (quality), Ejecuciones 2, 3 y 4 del árbol `a0b29172eeb807ff1e6c5db8024d1c5bfd1af7e58ee5b9953a24fc2b3aa54bae` (pin `44c27a`, 27/11/2026)

**Estado:** propuesta

---

## 1. El cambio, en una frase

Que el skill defina `input-group` como **una agrupación semántica de N controles
de formulario** (inputs y/o selects) renderizados en una misma línea por el macro
`componentInputGroup`, y deje de definirlo como «label + input + hint + error» y
de recomendar `input-group` para cualquier campo con label.

## 2. Por qué (evidencia)

Tres ejecuciones del Caso, dos de ellas INACEPTABLE:

```
check:      reconoce-input (guard)
evidencia:  | 8 | input-group | por defecto | - | main, form «Datos personales» | «Nombre y apellidos (Obligatorio)» |
esperado:   una fila con el componente `input`
```

```
check:      no-inventa-input-group (quality)
evidencia:  el SUT añade filas `input-group` para campos atómicos sin hint ni error
esperado:   ninguna fila `input-group` en esa página
```

Resultado: `BUENO` en 1 de 3 e `INACEPTABLE` en 2 de 3. El SUT **sí invocó el
skill**, leyó el catálogo y ejecutó el linter; no es un fallo de permisos ni de
artefacto.

El fixture es la página oficial `patron-pagina-perfil-de-usuario.html`, donde cada
campo va delimitado por `<!-- input -->` y usa un `input.c-input` dentro de
`c-form-group`, sin hint ni error. La fila «Tipo de vía / Vía» son **dos** bloques
(`<!-- select -->` y `<!-- input -->`) en una rejilla, no un `input-group`.

Y el propio catálogo del skill ya lo describe bien (`assets/catalog.json`,
entrada `input-group`):

> «Sección con título en negrita negro arriba. Contiene label negro, dropdown con
> borde gris de 1px y fondo blanco, e input de texto… **alineados horizontalmente
> en una fila**.»

La definición autorizada del macro lo confirma: `componentInputGroup` recibe un
array `items[]` donde cada ítem es un input **o** un select (`isSelect`), más
`hint`, `errorMessage`, `fieldset`, `formGroup` y `divider`. Es composición de N
controles, no un campo con label.

## 3. Las secciones que lo causan

En `desy-component-recognizer`, regla 3:

> `input` (componente atómico): UN solo input. Default de la librería
>
> `input-group`: composición de label + input + hint + error-message. Lo que ves
> el 90% de las veces en formularios
>
> **Si ves un campo con label, input y (opcionalmente) hint debajo:**
> probablemente es `input-group`.

Y las mismas dos frases en `desy-angular-translator`:

> | `<desy-input-group>` | `{{ componentInputGroup({...}) }}` | Compuesto: label + input + hint + error |

> - **`input-group`:** label + input + hint + error (composición HTML) →
>   ng-content + binding de 4 sub-componentes

Además, los ejemplos de tabla del propio recognizer (filas `input-group` con
«label “Nombre”» e «label “Usuario”, hint con icono») refuerzan el error.

## 4. Restricciones

- **No tocar `assets/catalog.json`**: ya describe bien `input-group` y es la
  fuente de variantes válidas.
- **No tocar el Caso ni sus Checks**: el fixture oficial marca `<!-- input -->`
  campo a campo.
- No convertir `input-group` en sinónimo de «campo con label»: un campo atómico
  sigue siendo `input`, aunque lleve label.
- Mantener `date-input` y `datepicker` como compuestos distintos.
- No editar `vendor/desy-skills/` desde este repo.

## 5. Cómo se valida

- [ ] En `desy-skills-test`, sobre la rama del cambio:
      `npm run run -- --skill component-recognizer --case reconocimiento-perfil --skills-local <ruta de desy-skills>`
- [ ] **PASA sostenido**: dos corridas consecutivas con `reconoce-input` y
      `no-inventa-input-group` en verde, entregas contadas por separado.
- [ ] Si no supera esto, el cambio no se mergea.

## 6. Skills sugeridos para el agente

- `desy-component-recognizer`
- `desy-angular-translator`

## 7. Lo que no debe hacer

- No re-pinear `desy-skills-test`.
- No editar `vendor/desy-skills/`.
- No añadir evals ni documentación de `desy-skills-test` dentro de `desy-skills`.

## 8. Declaración de cierre (la rellena el agente que aplica)

Pendiente.
