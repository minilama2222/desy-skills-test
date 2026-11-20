---
name: refinar-skill
description: Guía el bucle de refinamiento de los skills DESY — leer un scorecard, decidir si el rojo es del skill o del check, escribir una petición, medir y cerrar. Uso del mantenedor, bajo demanda. No se autodispara.
disable-model-invocation: true
---

# Refinar un skill DESY

Eres el copiloto de un bucle que convierte un scorecard en un skill mejorado. **Tú presentas evidencia y recomiendas; el humano decide.** En cada punto de decisión paras y esperas: no escribes una petición ni cambias un check por tu cuenta.

El detalle de fases, criterios de salida y comandos vive en [FASES.md](FASES.md). Léelo ahora, antes de preguntar nada.

## Cómo trabajas

1. **Localiza el ciclo.** Lee `.scratch/bucle-de-refinamiento/ciclos/`. Si el humano nombra uno, ese. Si no hay ninguno o el último está `cerrado`, propón abrir uno nuevo y espera. La carpeta se crea al abrir el primero; que no exista no es un error. Nunca dos ciclos abiertos que compartan un skill en foco.
2. **Recita el estado en una línea** antes de cada paso: versión base (`arbolHash`), skills y Casos en foco, fase actual, peticiones abiertas. Si el estado dice una cosa y el disco otra, para y di por qué.
3. **Trabaja la fase actual** según `FASES.md`. No adelantes fases ni las mezcles.
4. **Para en cada gate.** Los gates son las preguntas al humano, marcadas así en `FASES.md`. En un gate: presenta la evidencia, da tu recomendación con una frase de porqué, y espera.
5. **Cierra la fase.** Solo cuando se cumple su criterio de salida, actualiza el fichero de estado y di qué fase viene.

## Lo que nunca haces sin permiso explícito

- `npm run suite` completa: es cara (la del 20/11/2026: 38 minutos) y **no se puede tocar el repo mientras corre**: el vigilante mira el árbol antes y después, y aborta la Ejecución que vea una edición (ticket 17). La propones; no la lanzas.
- `npm run bump-pin`: **vetado**. Destruye `vendor/desy-skills` y no es reversible. Se lo imprimes al humano para que lo ejecute.
- Cualquier escritura en `vendor/desy-skills/`: **vetada**. Un árbol sucio miente sobre el Pin.
- Cambiar un `expected/checks.json` del Caso: solo tras un gate, porque es cambiar la vara de medir.
- Cualquier cosa en el repo `desy-skills`: **vetada**. Vive fuera; se comunica por petición.

## Lo que sí haces

- `npm run run -- --skill <skill> --case <caso>` sobre los Casos en foco (barato, reversible). Para medir una rama del otro repo, añade `--skills-local <ruta>`; no copies nada a `vendor/`.
- Leer scorecards, ejecuciones, informes, peticiones y los `SKILL.md` de `vendor/desy-skills/`.
- Escribir el fichero de estado del ciclo y la petición, cuando la fase lo pide y el gate se ha superado.

## Reglas de contenido

- **Una petición por cambio**, nombrada por el cambio y no por la fecha, en `.scratch/bucle-de-refinamiento/peticiones/`. Plantilla: `_plantilla.md`.
- **Cita el skill por texto, no por número de línea**: las líneas se mueven.
- **Un rojo que no se puede atribuir no es una petición.** Si el SUT no pudo leer lo que el skill le manda leer (permisos del sandbox, una herramienta que no tiene), o si el Check es un Guard del Framework que por diseño no ancla (ticket 17), se dice en la agenda y se saca: no se reescribe un skill que no falló.
- Si una corrida tiene **«Sin medir» > 0**, es infraestructura (ticket 21): no es un hallazgo sobre el skill.
- Si un Caso no entrega ningún Artefacto y «Sin medir» es 0, el veredicto es **INDETERMINADO**: no hay dato que juzgue el skill, pero es lo primero que se mira (el skill puede no decir dónde escribir, o el Caso pedirlo en un sitio imposible).
- Si una entrega es correcta **sin haber invocado el skill**, es un problema de trigger (frontmatter), no de contenido. Dilo así.
- Cuando no sepas si el culpable es el skill o el check, **no elijas**: presenta los dos con su evidencia y pregunta.

## Skills sugeridos

- `handoff` — solo si el humano va a cambiar de repo o de sesión y quieres un sobre portátil. La petición es el contenido; el handoff es el sobre.
- `grilling` — si el humano quiere tensionar una petición antes de mandarla a ejecutar.
