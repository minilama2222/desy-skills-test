# 34: `token-espaciado` exige padding para una pregunta sobre separación

**What to build:** Que el Guard de `token-espaciado` mida el **token del
sistema**, no una familia de utilidad concreta. La pregunta es «16 px de
separación entre bloques y 28 entre secciones»; el SUT responde con
`gap-base`/`space-y-base`/`mb-base` y con `--spacing-base` / `--spacing-lg`.
El Guard exige literalmente `p-base` y `p-lg`, que son **padding**.

**Blocked by:** —

**Status:** done

- [x] `token-base-16px` exige el token `--spacing-base` (1rem)
- [x] `token-lg-28px` exige el token `--spacing-lg` (1.75rem)
- [x] La rúbrica dice que el Guard es el token y que la familia (`gap-*`,
      `p-*`, `mb-*`) la decide el uso, no el Check
- [x] El Quality `familia-gap-base` se queda: ahí sí se pide `gap-base`
- [x] Re-medir `styles-reference/token-espaciado`

## La evidencia (suite 5, 21/11/2026)

Tres ejecuciones, todas con los valores correctos:

```
check:      token-base-16px  → declara_decision "p-base"
artefacto:  `--spacing-base` = 1rem = 16 px; `gap-base`, `space-y-base`, `mb-base`
check:      token-lg-28px    → declara_decision "p-lg"
artefacto:  `--spacing-lg` = 1.75rem = 28 px; `gap-lg`, `mt-lg`, `space-y-lg`
```

Antes del ticket 29 este Caso pasaba **en falso**: el artefacto era el log y
`p-base` aparecía en la salida de la herramienta que leía el `SKILL.md`, no en la
respuesta. Con la prosa, el defecto queda a la vista.

## La re-medida (suite 7, 21/11/2026)

`styles-reference/token-espaciado` pasa a **PASA · EXCELENTE** (3 de 3). Los tres declaran `--spacing-base` y `--spacing-lg`.
