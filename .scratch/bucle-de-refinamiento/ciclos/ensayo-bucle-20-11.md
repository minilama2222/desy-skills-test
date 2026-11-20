# Ciclo: ensayo-bucle-20-11

**Estado:** abierto
**Fase:** 1
**Base:** cce1633b4ba5dd37e25873deacc1555d21d7c11f8ba4ec525a2cf654cab7d380
**Skills en foco:** por decidir en el gate (el scorecard deja seis skills con rojo)
**Casos:** reconocimiento-login, afinado-paso-1, proyecto-no-existe, no-scaffoldea-sin-permiso, checklist-sin-servidor, patron-pagina-paso-1-nombre-nif

> Ensayo del propio bucle: este ciclo existe para probar que `refinar-skill` sirve,
> no para refinar todavía. Lo que falle del skill se apunta en el ticket 26.

## Agenda

Gate del 20/11: aprobada con dos peticiones, dos tickets y dos que no se tocan
hasta cerrar su hueco de evidencia.

| Caso | Qué falló | Cambio | Petición |
|---|---|---|---|
| component-recognizer/`reconocimiento-login` | 6 Checks, 3/3 INACEPTABLE (guards 0/3). El SUT no pudo leer `assets/catalog.json` **11 veces** (`Permission denied: external_directory`) | **No es el skill**: ticket 27 | — |
| preflight-check/`proyecto-no-existe` | `no-arranca-implementacion`: el texto **nombra** `choose-page-template` al anunciar el plan, pero no arranca nada y pide el mockup | **Falso positivo del Check**: ticket 28 | — |
| scaffold-project/`no-scaffoldea-sin-permiso` | `no-scaffoldea-sin-permiso` (guard) y `pide-permiso`, 3/3 INACEPTABLE | **Skill**: scaffoldeó sin permiso las tres veces | pendiente |
| validate-accessibility/`checklist-sin-servidor` | `detecta-fieldset-sin-legend` (guard), `detecta-label-sin-for`, `no-inventa-un-pase` | **Skill**: el checklist no detecta lo que el Caso pide | pendiente |
| design-match/`afinado-paso-1` | `no-usa-valor-arbitrario`, 3/3 BUENO, ancla a «Paso 5 — Aplica el fix mínimo» | **No decidible con esta evidencia**: el agente o no leyó el Paso 5 o lo leyó y no lo aplicó; falta la línea del artefacto | — |
| implement-pattern/`patron-pagina` | `encadenado-canonico` (3/4) y `fidelidad-gap` (3/4) | El orden: no decidible (1 de 4 pasa). El `gap`: Guard del Framework, sin ancla **por diseño** (ticket 17) | — |

## Notas del ensayo

- Los 8 Checks sin ancla de `patron-pagina` (`un-solo-h1`, `skip-link`,
  `fidelidad-*`…) **no son un hueco del `rubric.md`**: son Guards del Framework y
  el ticket 17 prohíbe anclarlos desde un Caso (dos fuentes y doble graduación).
  El informe lo dice bien; lo que el bucle no sabe es qué hacer con un rojo que
  no puede atribuir.
- `no-scaffoldea-sin-permiso` cita `desy-scaffold-project` → «desy-scaffold-project»
  porque la regla vive en un aviso sin epígrafe, y el `rubric.md` lo declara. No
  es un error de la cita.

## Corridas

| Fecha | Versión | Caso | Entregas | Veredicto |
|---|---|---|---|---|
| 20/11 21:56 | cce1633 | los 14 | — | 8 PASA · 5 SUSPENDE · 1 INDETERMINADO |
| 20/11 23:45 | cce1633 | patron-pagina | 3/4 | INDETERMINADO → SUSPENDE |
