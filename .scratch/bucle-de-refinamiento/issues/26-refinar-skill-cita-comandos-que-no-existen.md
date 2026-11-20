# 26: `refinar-skill` cita comandos que no existen y describe un mundo anterior al harness de hoy

**What to build:** Que el skill que conduce el bucle de refinamiento diga lo que de
verdad hay que escribir. Hoy manda un comando que imprime la ayuda, propone una
receta que el propio skill veta, y decide con un criterio que el scorecard ya
separa en dos columnas.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] El comando de medir es `npm run run -- --skill <skill> --case <caso>`, en
      `SKILL.md`, `FASES.md` y `peticiones/_plantilla.md` (§5)
- [ ] Fase 4 mide con `--skills-local <ruta>` y desaparece la receta de copiar a
      `vendor/` a mano
- [ ] Fase 1 separa los dos ceros: **«Sin medir» > 0** es infraestructura
      (ADR-0021) y no es el skill; **sin artefacto con «Sin medir» = 0** es el
      SUT corriendo sin entregar lo que el Caso pide, y eso sí se mira
- [ ] Fase 1 dice qué hacer cuando el informe no puede nombrar la sección: es un
      hueco del `rubric.md` del Caso, no del skill, y se anota como tal
- [ ] El skill nombra el techo de 20 min por Ejecución y la regla de no tocar el
      repo mientras corre una suite (ticket 17)
- [ ] Guardarraíl barato: cada `npm run <script>` que citan los documentos del
      bucle existe en `package.json` y en `scripts/`
- [ ] Ensayo real de las fases 0 y 1 con el scorecard del 20/11, y la agenda sale
      con Caso, rojo y a quién culpa
- [ ] Fase 1 tiene cajón para los dos rojos que **no** son del skill y hoy salen:
      «el SUT no pudo leer lo que el skill le manda leer» (ticket 27) y «el Check
      es un falso positivo» (ticket 28)
- [ ] Cuando el rojo es un **Guard del Framework** (sin ancla por diseño, ticket
      17), el bucle lo dice y no manda a reescribir un skill
- [ ] La «línea del artefacto» va recortada: hoy puede ser un volcado de 10 KB que
      no cabe en una agenda
- [ ] Fase 0 dice cómo se nombra el ciclo, y que `ciclos/` se crea si no existe
- [ ] El formato del ciclo resuelve si un ciclo es **de un skill** (como dice su
      cabecera) o **de todo el scorecard** (como pide la agenda). Hoy hay seis
      skills con rojo y el estado sólo admite uno en foco

## La evidencia (20/11/2026)

**El comando no existe.** `SKILL.md:31`, `FASES.md:78` y `_plantilla.md` §5 dicen:

```bash
npm run run <skill>/<caso>
```

y eso imprime la ayuda:

```
$ npm run run implement-component/boton-primario
Uso: cli <comando> [args]
```

El README ya lo dice bien (`npm run run -- --skill implement-component --case
boton-primario`): los dos documentos del mismo repo se contradicen, y el que se
equivoca es el que conduce el bucle.

**La receta que el skill veta.** `FASES.md:77`:

> Con pin local (ticket 05) apunta a la ruta del worktree. Sin ticket 05, el
> apaño es copiar a `vendor/` a mano: **dilo en voz alta**, porque el scorecard
> dirá un commit que no es.

`SKILL.md:25` dice: «Cualquier escritura en `vendor/desy-skills/`: **vetada**. Un
árbol sucio miente sobre el Pin.» Y el ticket 05 está hecho: `--skills-local
<ruta>` (README:183). La fase describe un mundo que ya no existe y propone, como
apaño, exactamente lo que el skill prohíbe.

**Los dos ceros.** `FASES.md:34` zanja «cero entregas ⇒ INDETERMINADO. No es el
skill». El scorecard de hoy tiene dos causas distintas para ese cero, y una sí es
del skill. `patron-pagina-paso-1-nombre-nif` es el caso vivo: 6 intentos sin
artefacto, `sinMedir: 4`, y el culpable era el build del harness (ticket 25). Un
bucle que no mira esa columna habría archivado el ticket como ruido.

**La sección que no viene.** `FASES.md:35` promete «check fallido, línea del
artefacto que lo tumba, sección del skill». En la re-medida, `fidelidad-gap` dice
«Sección del skill: — el Check no declara de qué sección depende». El informe
presenta lo que hay; el skill no dice qué hacer cuando falta.

## Por qué importa

Este skill es el que decide qué se toca en `desy-skills`. Si manda un comando
roto, la primera acción de la fase central no arranca; si propone ensuciar
`vendor/`, la medida miente sobre el Pin; y si lee mal el cero, manda a refinar
un skill que no falló o declara ruido lo que era un defecto.
