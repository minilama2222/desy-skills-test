# 33: `declara_fallo` no tolera la decoración ni el wording del checklist

**What to build:** Que un informe que declara el fallo se lea como lo que dice.
Hoy `lineaDeclaraFallo` normaliza tildes y espacios, pero no la decoración
markdown (tildes de código, asteriscos), y el Caso pide hechos con un wording que
no es el del checklist del skill.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] La línea se compara **sin** las tildes de código y los asteriscos de los
      bordes y del interior
- [ ] `Sin label: nif` cuenta como marcador de fallo del Check de labels
- [ ] Los `hecho` del Caso usan el wording del checklist del skill
      («un solo h1», «cada fieldset con su legend», «sin label», «skip-link»)
- [ ] Tests: ``Un solo `h1` `` casa con `un solo h1`; `fieldset` OK no casa

## La evidencia (suites 4 y 5, 21/11/2026)

`validate-accessibility/checklist-sin-servidor` da **INACEPTABLE 3 de 3** con
`detecta-h1-de-mas` y `detecta-fieldset-sin-legend` en rojo. El informe **sí
detecta los cuatro fallos**:

```
| 1 | Un solo `h1` | 1 | 2 | ❌ FALLA |
| 3 | Cada `fieldset` con su `legend` | 1 | 0 | ❌ FALLA |
| 4 | … con su `label` | — | Sin label: nif | … |
```

Los hechos del Caso son `un-solo-h1`, `fieldset-con-legend` y `labels-visibles`.
El primero falla sólo por las tildes de código; el segundo, porque el skill dice
«con **su** legend»; el tercero, porque `labels-visibles` no aparece en ningún
sitio: el skill escribe «sin label». La propia rúbrica dice «se juzga el
veredicto, no el wording», y el Check hace lo contrario.
