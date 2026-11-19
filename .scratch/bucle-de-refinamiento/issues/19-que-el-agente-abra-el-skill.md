# 19: Que el agente abra el skill (probado: la presentación no basta)

**What to build:** Que el SUT invoque `desy-implement-component` cuando el Caso
`boton-primario` se lo pide, en vez de resolverlo leyendo `node_modules/desy-html`
a mano.

**Blocked by:** 18

**Status:** ready-for-human
**Status depende de:** que un humano decida qué vía se prueba después. La primera
(la presentación) está hecha y **medida: no basta**; PR abierto en `desy-skills#36`.

- [x] La Petición está en
      [`peticiones/peticion-trigger-implement-component.md`](../peticiones/peticion-trigger-implement-component.md)
- [x] Se aplicó en la rama `skill/trigger-implement-component` de `desy-skills` y
      se abrió [el PR #36](https://github.com/minilama2222/desy-skills/pull/36)
- [x] Se midió con `--skills-local` sobre el worktree: **el skill sigue sin
      dispararse** (2 Ejecuciones, 0 invocaciones)
- [ ] Decidir la siguiente vía (ver «Lo que queda por probar»)

## El hecho, con todo lo medido

`boton-primario`, agente headless, **8 Ejecuciones** en total:

| Configuración | Ejecuciones | Invocaciones del skill |
|---|---|---|
| `vendor/` sin tocar | 2 + 2 | 0 · 0 |
| Worktree con la `description` y la regla cambiadas | 2 | 0 · 0 |
| (total) | **8** | **0** |

El agente resuelve la tarea —en una de las corridas entregó a `EXCELENTE`— y en su
prosa explica cómo: *«the macro exposes no variant/size param; the documented way is
the CSS class»*. Lo sabe **de la librería**, no del skill.

## La hipótesis que se descartó

Se creía que el problema era la presentación: una `description` en inglés que no
nombraba «botón», «macro» ni «genera», y una Regla fundamental que declaraba el
skill inaplicable sin «un starter clonado», aunque hubiera librería.

Se cambiaron las dos cosas. **El disparo no cambió.** La presentación era
probablemente parte del problema; no era el problema.

## Lo que queda por probar, y su coste

1. **Que el skill sea necesario, no cómodo.** El agente hace el botón sin él. Un
   skill solo se abre si lo que pide no se puede resolver a pelo: una regla que el
   agente no deduzca de la librería (el tamaño base sin clase de tamaño, el
   `type="submit"` dentro de formulario, el token del sistema frente a Tailwind).
   Es contenido, y es la vía más honesta. **Coste:** alto — hay que encontrar qué
   regla y reescribir el cuerpo.
2. **Aceptar que el trigger depende del runtime.** Medir si opencode eligió el
   skill alguna vez en otro Caso; si tampoco, el mecanismo no está en juego en este
   harness y el tema es de `opencode`, no del skill. **Coste:** bajo, y decide si
   las demás vías tienen sentido.
3. **Cambiar el prompt del Caso para que nombre el skill.** Mide el prompt, no el
   skill. **No se hace.**

## Lo que no se hace

- Dar el PR por bueno como arreglo del trigger: **no lo es**. Se mergea, si se
  mergea, por la mejora de texto.
- Reabrir el 18: el macro comentado quedó arreglado y probado por otra vía.
