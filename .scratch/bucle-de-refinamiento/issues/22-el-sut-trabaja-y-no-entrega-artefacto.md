# 22: El SUT recorre el flujo y no entrega ningún artefacto (y el Grade puntúa el vacío)

**What to build:** Saber **por qué** hay Ejecuciones con el flujo completo, `exit 0`
y ni un fichero entregado, y decidir de quién es el fallo: del Caso (espera el
artefacto en otro sitio), del harness (no lo recoge) o del SUT (trabaja en el chat).
Mientras no se sepa, esos Casos no se pueden juzgar.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Reproducir una de las Ejecuciones y **conservar el `workDir` del sandbox**
      después de correr: hoy se borra y con él la prueba. Sin eso, «no entregó» es
      una afirmación sin evidencia
- [ ] Determinar, en cada Caso afectado, qué fichero espera el Caso
      (`artefactos` en la Evidencia sale `{}`) y qué escribió el SUT, si escribió
- [ ] Fallo aparte, en el grader: con `artefactos: {}` hay Checks que **pasan**
      (p. ej. `tokens-del-sistema`, `sev: guard`, `passed: true`). Un Check no
      puede aprobar sobre un artefacto que no existe
- [ ] Decidir si `scaffold-project/no-scaffoldea-sin-permiso` es un Caso sin
      artefacto **por diseño** (no debe scaffoldear) y entonces no puede ser
      INDETERMINADO por no entregar: necesita otro criterio de veredicto

## La evidencia (suite del 19/11/2026)

| Caso | Intentos | Entregas | Con dato | Flujo |
|---|---|---|---|---|
| angular-translator/boton-primario-angular | 6 | 0 | 6 | `['angular-translator']` |
| implement-pattern/patron-pagina-paso-1-nombre-nif | 6 | 0 | 5 | 8 skills, incluidos `implement-pattern` y `validate-accessibility` |
| scaffold-project/no-scaffoldea-sin-permiso | 6 | 0 | 0 | — (ni siquiera hay Checks) |

Los dos primeros: `exitCode: 0`, `flujoAlcanzoSkill: true`, `artefactos: {}` y
~78 KB de stdout. El agente hizo el trabajo y lo contó; no dejó el fichero. No es
red (exit 0) ni trigger (el skill se invocó): es entrega.

## Por qué importa más que un SUSPENDE

Un SUSPENDE dice «el skill lo hizo mal» y se puede refinar. Un INDETERMINADO por
falta de artefacto no dice nada del skill, y **hoy se lee como si el skill no
supiera hacerlo**. Mientras esto siga abierto, 2 de los 14 Casos no miden nada.
