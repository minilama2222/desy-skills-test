# Ciclo: component-recognizer-input

**Estado:** abierto — pendiente `bump-pin`
**Fase:** 5
**Base:** a0b29172eeb807ff1e6c5db8024d1c5bfd1af7e58ee5b9953a24fc2b3aa54bae
**Skills en foco:** component-recognizer
**Casos:** reconocimiento-perfil

> Base tomada de las tres Ejecuciones dirigidas del Caso con el pin `44c27a`
> (2026-11-27). No hay scorecard de suite para este árbol; el ciclo es de un solo
> Caso y no necesita la suite entera para diagnosticar.

## Agenda

Aprobada en el gate del 2026-11-27. El humano confirmó que la definición del
skill es incorrecta: `input-group` es una agrupación semántica de **N controles**
(input y/o select) en una línea, no «label + input + hint + error».

| Caso | Qué falló | Cambio | Petición |
|---|---|---|---|
| `component-recognizer/reconocimiento-perfil` | `reconoce-input` en 2/3 y `no-inventa-input-group` en 3/3: el SUT llama `input-group` a campos atómicos sin hint ni error | **Skill**: corregir la definición de `input-group` (composición de N inputs/selects) y la heurística que la contradice | [peticion-input-group-composicion.md](../peticiones/peticion-input-group-composicion.md) |

**Por qué es del skill y no del Check:** el propio `assets/catalog.json` del
skill describe `input-group` como «label + dropdown + input alineados
horizontalmente en una fila», con `items[]` de inputs/selects. La prosa de la
regla 3 contradice al catálogo que dice validar.

## Corridas

| Fecha | Versión | Caso | Entregas | Veredicto |
|---|---|---|---|---|
| 2026-11-27 | `44c27a` (`a0b2917`) | reconocimiento-perfil | 1 BUENO + 2 INACEPTABLE de 3 | SUSPENDE: `reconoce-input` y `no-inventa-input-group` |
| 2026-11-27 | local `57789f7` (PR #39) | reconocimiento-perfil | 1 EXCELENTE + 1 BUENO de 2 | PASA (0 INACEPTABLE); `no-inventa-input-group` en 1 de 2 |
| 2026-11-27 | local `5d83a8c` (PR #39, Caso ajustado) | reconocimiento-perfil | EXCELENTE × 2 | PASA |
| 2026-11-27 | local `9e01d84` (PR #39, date-input corregido) | reconocimiento-perfil | EXCELENTE × 2 | **PASA sostenido** |
| 2026-11-27 | merge `6058b74`, medido como local `7756428` | los 14 Casos | 3 por Caso | **14 PASA · 0 SUSPENDE · 0 INDETERMINADO** |

## Fase 2 cerrada (2026-11-27)

El humano aprobó el borrador sin cambios. La Petición está en
`peticiones/peticion-input-group-composicion.md` con estado `propuesta`.
Fase 3 vive fuera de este repo: el cambio se aplica en `desy-skills` y se
valida volviendo aquí con `--skills-local`.

## Fase 4 — medición (gate pendiente)

Medido con `--skills-local /root/work/desy-skills-input-group`, dos corridas:

| # | Grade | Checks rojos |
|---|---|---|
| 5 | BUENO | `no-inventa-input-group` |
| 6 | EXCELENTE | — |

El guard `reconoce-input` queda verde en las dos. El único rojo es clasificar
«Tipo de vía + Vía» (select + input en la misma línea) como `input-group`: con
la definición corregida es una lectura defendible, y el HTML oficial los marca
como bloques separados. El Check `no-inventa-input-group` es demasiado ancho
para distinguir «todos los campos como input-group» de «un grupo real».

## Fase 4 cerrada (2026-11-27)

Gate superado: dos ejecuciones consecutivas `EXCELENTE` (8 y 9, rama `9e01d84`), con
`reconoce-input` y `reconoce-input-group` verdes.

El gate cambió el Caso, no el skill otra vez: «Tipo de vía + Vía» **es** un
`input-group` (select + input que se leen como una unidad). Se sustituyó
`no-inventa-input-group` por `reconoce-input-group` (peso 2); el guard
`reconoce-input` sigue midiendo que no se llame `input-group` a todos los campos.

## Fase 5 — pendiente

El PR #39 se mergeó el 2026-11-27 (merge commit `6058b74`).

Propuestas para el humano, en orden:

1. [x] `npm run suite -- --skills-local /root/work/desy-skills-input-group`
   → 14 PASA, 0 SUSPENDE, 0 INDETERMINADO (árbol `7756428`).
2. [x] `npm run diff-versiones a0b2917 7756428` → **0 Skills con cambio de
   veredicto**; `component-recognizer` sigue PASA y `reconocimiento-perfil` da
   EXCELENTE en 2 de 3 entregas.
3. [ ] `npm run bump-pin 6058b74` (lo firma el humano; el bucle lo veta).

Hallazgo colateral, ya conocido: `implement-pattern` entregó una Ejecución
correcta **sin invocar** el skill (aviso de trigger del scorecard). No es del
PR #39 ni mueve el veredicto.
