# <Cambio pedido, en imperativo y con el fichero destino>

<!--
  Plantilla de Petición: un documento por cambio, nombrado por el cambio
  (peticion-copiar-pagina-prueba.md), nunca por la fecha.
  Se versiona en ESTE repo (.scratch/bucle-de-refinamiento/peticiones/).
  El repo desy-skills recibe el cambio como PR; nunca recibe este documento.
-->

**Fichero destino:** `skills/desy-implement-component/SKILL.md` (ruta dentro de `desy-skills`)

**Origen:** Caso `implement-component/boton-primario`, check `<assert>`, Ejecución `<n>` de `<pin|árbolHash>`

**Estado:** propuesta

---

## 1. El cambio, en una frase

<Qué debe decir el skill que no dice hoy, o qué debe dejar de decir.>

## 2. Por qué (evidencia)

<El check que falla, el artefacto que lo tumba, y qué hizo el agente. Con números, no impresiones.>

```
check:      <assert>
evidencia:  <la línea del artefacto>
esperado:   <lo que el check exige>
```

## 3. La sección que lo causa

<Cita el texto actual del skill por contenido, no por número de línea:>

> <texto literal de la sección responsable>

## 4. Restricciones

- <Lo que el agente NO debe hacer para arreglarlo, p. ej. no cambiar el ejemplo a algo que el Caso no mida.>
- <Qué otro skill manda si hay choque de autoridad (p. ej. la tabla de tokens la manda `desy-styles-reference`).>
- <Ficheros que no se tocan (`assets/catalog.json`, etc.).>

## 5. Cómo se valida

- [ ] En `desy-skills-test`, sobre la rama del cambio:
      `npm run run -- --skill implement-component --case boton-primario --skills-local <ruta de desy-skills>`
- [ ] **PASA sostenido**: dos corridas consecutivas PASA, entregas contadas por separado.
- [ ] Si no supera esto, el cambio no se mergea.

## 6. Skills sugeridos para el agente

- `desy-implement-component`
- <otros>

## 7. Lo que no debe hacer

- No re-pinear `desy-skills-test`.
- No editar `vendor/desy-skills/`.
- No añadir evals ni documentación de `desy-skills-test` dentro de `desy-skills`.

## 8. Declaración de cierre (la rellena el agente que aplica)

<Qué cambió, en qué rama/PR, y con qué comando lo validó.>
