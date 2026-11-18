# 16: El SUT escribe fuera del sandbox, en el repo del harness

**What to build:** Que el SUT escriba sus artefactos dentro de su `workDir`, y que
un artefacto que aparezca fuera lo delate un test. Hoy escribe en `src/pages/` del
**repo del harness**, así que el Caso sale `sin-artefacto` y el repo se ensucia.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Un Caso real escribe su artefacto en `<sandbox>/work/src/…`, no en el repo
- [ ] Un test lo fija: ningún fichero nuevo aparece en el repo tras una Ejecución
- [ ] Se explica por qué `cwd: sandbox.workDir` no basta con `opencode --standalone`

## El hallazgo, medido

macOS, `opencode v2.2.1`, `npm run suite -- --skill implement-component --case
boton-primario --n 1`, con el ticket 15 ya aplicado (el SUT arranca, `exit 0`).

Tras la corrida, en el repo:

```
?? src/pages/boton-enviar.html      ← en desy-skills-test/src/pages/
```

y otra vez, en una corrida limpia, el mismo fichero con otro contenido:

```njk
{% from "components/button/_macro.button.njk" import componentButton %}

<form>
  {{ componentButton({
    "text": "Enviar",
    "type": "submit",
    "classes": "c-button--primary"
  }) }}
</form>
```

En el sandbox, `src/` tiene los ficheros del starter (`index.html`,
`pagina-accesibilidad.html`, `pagina-mapa-web.html`…) y **no** tiene
`src/pages/`. El contenido es correcto; el sitio no.

### Lo que sí se descartó

- **El sandbox se crea bien y se puebla.** Medido durante una corrida: `work/` con
  12 entradas, incluidas `src/`, `node_modules` y `vite.config.js`; `home/` con
  18 MB. `createSandbox({ scaffoldDir })` copia, y `cleanup()` borra.
- **El `cwd` del proceso es el correcto.** `runCaso` pasa `cwd: sandbox.workDir`
  (`src/runner.ts:315`), y el smoke de `test/runner.smoke.test.ts` afirma que el
  `cwd` que ve el comando es `sandbox.workDir`.
- **No es un sandbox vacío.** Los `desy-sut-*` vacíos que se ven en `TMPDIR` son
  restos de tests que crean un sandbox sin `scaffoldDir`; no son de la suite.

Queda por tanto una hipótesis, no un hecho: que `opencode run --standalone`
ejecute las herramientas de escritura contra un directorio distinto del `cwd` del
proceso (su servidor privado se arranca con una base propia). Está sin medir.

## Por qué importa

- **Rompe el aislamiento del ADR-0001/0013:** el SUT deja ficheros en un árbol que
  no es suyo, y ese árbol está versionado.
- **El Caso no se gradúa:** el runner busca el artefacto en `workDir`, así que una
  ejecución correcta sale `sin-artefacto`.
- **Un `git add -A` lo comitearía.** Ha estado a punto dos veces.

## Lo que este ticket NO cierra

- **La entrega en prosa** (el SUT contestando con el código en el chat): es otra
  pregunta —si el harness acepta ese output o exige el fichero— y va en su propio
  ticket.
