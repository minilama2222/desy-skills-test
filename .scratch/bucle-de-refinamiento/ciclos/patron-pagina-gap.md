# Ciclo: patron-pagina-gap

**Estado:** abierto — vuelve a la fase 1 (`encadenado-canonico`)
**Fase:** 1
**Base:** cce1633b4ba5dd37e25873deacc1555d21d7c11f8ba4ec525a2cf654cab7d380
**Skills en foco:** implement-layout-patterns
**Casos:** patron-pagina-paso-1-nombre-nif

## Agenda

| Caso | Qué falló | Cambio | Petición |
|---|---|---|---|
| implement-pattern/`patron-pagina-paso-1-nombre-nif` | Guard `fidelidad-gap` en 3 de 3 entregas: el SUT escribe `grid lg:grid-cols-4 gap-x-base` porque es el ejemplo literal del skill; el Gold oficial pide `grid-cols-2 lg:grid-cols-4 gap-lg` | El grid del formulario toma columnas de mobile y gap de la referencia, no de un ejemplo fijo | [peticion-grid-del-formulario-contra-el-gold.md](../peticiones/peticion-grid-del-formulario-contra-el-gold.md) |

**Descartado de la agenda (con motivo):** `encadenado-canonico` falló en 1 de
4 Ejecuciones porque el agente invocó `design-match` antes de
`choose-page-template`. Es orden del Flujo, no contenido del skill: se sigue
mirando, pero no entra en esta petición (mezclarlo impediría saber qué arregló
el gap).

## Corridas

| Fecha | Versión | Caso | Entregas | Veredicto |
|---|---|---|---|---|
| 2026-11-21 01:19 | cce1633 | patron-pagina-paso-1-nombre-nif | 3 de 4 intentos | SUSPENDE (guards 8/9) |
| 2026-11-21 02:05 | local `477acb3` (gap + columnas) | patron-pagina-paso-1-nombre-nif | 4 de 4 intentos | INACEPTABLE: `fidelidad-gap` en 3 de 4; `encadenado-canonico` en 3 de 4 |
| 2026-11-21 02:45 | local `5675072` (+ intro en la rejilla) | patron-pagina-paso-1-nombre-nif | 3 de 3 intentos | INACEPTABLE: `fidelidad-gap` **verde en 3 de 3**; `encadenado-canonico` en 2 de 3 |

## Lectura de la fase 4 (gate: no pasa)

El cambio que pedía esta petición **funciona**: las tres entregas escriben
`grid grid-cols-2 lg:grid-cols-4 gap-lg` y `fidelidad-gap` queda verde. Antes,
3 de 3 escribían `gap-x-base`.

Pero el Caso no alcanza **PASA sostenido** por un rojo distinto, que la agenda
dejó fuera a propósito: en 2 de 3 Ejecuciones el agente invoca `design-match`
**después** de `validate-accessibility`, y el guard `encadenado-canonico` exige
el orden `implement-* → design-match → validate-accessibility`.

Conclusión: la petición no se cierra; el rojo que queda no es el que arregla.
Volver a la fase 1 con la rama puesta, con `encadenado-canonico` como único
punto de la agenda. Mezclarlo aquí impediría saber qué cambió el gap.

## Suites del pin canónico (21/11, 01:42 y 02:16)

Se lanzaron dos suites seguidas con el Pin de `vendor/` (sin la rama local), para
tener dos medidas del mismo árbol:

| Corrida | PASA | SUSPENDE | INDETERMINADO |
|---|---|---|---|
| 4 (01:42) | 8 | 6 | 0 |
| 5 (02:16) | 9 | 5 | 0 |

**PASA en las dos (8):** `choose-library`, `choose-page-template`,
`component-recognizer`, `design-match`, `implement-component`,
`implement-layout-patterns`, `implement-pattern/politicas-privacidad`,
`preflight-check/proyecto-ok-libreria-version`.

**Inestables entre las dos:** `token-espaciado` (PASA en la 5, SUSPENDE en la 4;
su rojo es el Guard que exige `p-base`) y `boton-primario-angular` (SUSPENDE en
las dos, pero PASA en la corrida 3: su Check lee `componentButton` dentro de un
comentario HTML del que explica la traducción).

**Rojos sostenidos (5):** `boton-primario-angular`, `patron-pagina`,
`proyecto-no-existe`, `no-scaffoldea-sin-permiso`, `checklist-sin-servidor`.

### Después de la limpieza del grader (tickets 32–38)

| Corrida | PASA | SUSPENDE | INDETERMINADO |
|---|---|---|---|
| 6 (07:51) | 12 | 2 | 0 |
| 7 (08:26) | 13 | 1 | 0 |

El único rojo es `patron-pagina`. Los cinco anteriores eran del harness y del
Caso, no del skill.

## Por qué este rojo es atribuible

- El SUT **pudo** leer el skill (sin `Permission denied` ni herramientas que
  falten): invocó `implement-layout-patterns` y copió su ejemplo.
- El Check **mide lo que dice medir**: es `fidelidad_estructural { hecho: "gap" }`
  contra el Gold-HTML del Caso, no una palabra.
- La causa es una contradicción del propio skill: su ejemplo canónico dice
  `gap-x-base` y «NO `gap-lg`», y el Gold oficial del Caso usa `gap-lg`.

## Gate de la fase 2

El humano encargó el ciclo completo («haz la 3 sin mi intervención») y se fue a
dormir: el gate de aprobación de la petición queda **delegado**. Se deja escrito
el borrador antes de aplicarlo (sección 2 de la petición) y se mide sin tocar
`vendor/`.
