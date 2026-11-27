# Ciclo: component-recognizer-input

**Estado:** abierto
**Fase:** 3
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

## Fase 2 cerrada (2026-11-27)

El humano aprobó el borrador sin cambios. La Petición está en
`peticiones/peticion-input-group-composicion.md` con estado `propuesta`.
Fase 3 vive fuera de este repo: el cambio se aplica en `desy-skills` y se
valida volviendo aquí con `--skills-local`.
