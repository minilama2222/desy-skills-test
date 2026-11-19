# 19: Que el agente abra el skill (frontmatter de `desy-implement-component`)

**What to build:** Que el SUT, ante el prompt del Caso `boton-primario`, **invoque**
`desy-implement-component` en vez de resolverlo leyendo `node_modules/desy-html` a
mano. Lo que se mide es su `description` (el frontmatter), no el cuerpo del skill.

**Blocked by:** 18

**Status:** ready-for-human
**Status depende de:** que un humano apruebe el cambio de texto y, después, un PR
en `desy-skills`. Lo que se puede escribir aquí es la Petición; el cambio vive allí.

- [ ] La Petición está en `peticiones/peticion-trigger-implement-component.md`,
      aprobada por un humano antes de escribirla en disco
- [ ] Medida con `--skills-local` y **PASA sostenido** (dos corridas consecutivas,
      entregas contadas por separado)
- [ ] Cerrar el ciclo: `suite` de regresión y `diff-versiones`

## El hecho medido (fase 1 del bucle)

Dos Ejecuciones del Caso `implement-component/boton-primario`, del 18/11 y
repetidas el 19/11: **cero invocaciones de skill en todas**, `flujoObservado: []`.

El agente hizo el trabajo bien —se lee en su prosa: «el macro `componentButton` solo
acepta `classes` para la variante»—, pero llegó ahí abriendo
`node_modules/desy-html/src/templates/components/button/` con `read`/`grep`. No
abrió el skill ni una vez.

Es un **Hallazgo de trigger**: entrega correcta sin invocar el skill. El veredicto
del Caso la descarta, con razón, porque no midió el skill; pero el hecho sí dice
algo del skill, y se arregla en el frontmatter.

## Por qué va después del 18

El 18 quita la trampa del macro comentado. Sin él, un frontmatter nuevo se mediría
con un Check que tumba al agente por el ejemplo del starter: el PASA sostenido no
distinguiría «el skill se disparó» de «el skill se disparó y el Check le volvió a
morder».

## Qué mirar antes de tocar nada

- **La `description` actual** de `vendor/desy-skills/skills/desy-implement-component/SKILL.md`,
  y la de sus vecinos que **sí** se disparan (los `desy-implement-*` de página).
  El patrón se ve comparando, no adivinando.
- **El prompt del Caso** (`casos/implement-component/componente/boton-primario/input/prompt.md`):
  pide un botón «con el texto Enviar», sin nombrar el skill. La `description` tiene
  que hacer que ese prompt case por sí solo; si se resuelve renombrando el Caso, se
  está midiendo un prompt inventado.
- **Si el disparo falla también en los otros Casos del skill.** Si el 19 arregla
  `boton-primario` y el resto sigue sin dispararse, el problema no era el texto de
  una `description`: era el mecanismo, y eso es otro ticket.

## Lo que no se hace

- Cambiar el prompt del Caso para que nombre el skill: mediría el prompt.
- Copiar el skill a `vendor/` a mano para probar: la validación se hace aquí, con
  `--skills-local <ruta del worktree>`.
- Meter en la Petición documentación de este harness: lo que cruza es el cambio de
  skill, nada más.
