# El trigger de `desy-implement-component` no se dispara

**Fichero destino:** `skills/desy-implement-component/SKILL.md` (ruta dentro de `desy-skills`)

**Origen:** Caso `implement-component/boton-primario`, `flujoObservado: []` en 8 Ejecuciones; fase 1 del bucle de refinamiento

**Estado:** aplicada — [PR #36](https://github.com/minilama2222/desy-skills/pull/36)

---

## 1. El cambio, en una frase

Que la `description` de `desy-implement-component` nombre lo que se le pide —un
componente suelto, sea cual sea— y que su Regla fundamental deje de declarar el
skill inaplicable cuando hay librería instalada.

## 2. Por qué (evidencia)

En 8 Ejecuciones del Caso, el agente no invocó ningún skill:

```
check:      (ninguno; el flujo está vacío)
evidencia:  reports/ejecuciones/implement-component/boton-primario/*.json → flujoObservado: []
esperado:   que el skill se dispare con un prompt que pide un componente DESY
```

En su prosa explica de dónde saca lo que sabe: *«the macro exposes no variant/size
param; the documented way is the CSS class»*. De `node_modules/desy-html`, no del
skill.

## 3. La sección que lo causa

La `description`:

> «Generate copy-pasteable DESY component code in desy-html, desy-angular, or
> desy-ionic. Use when implementing a specific component with given requirements.»

Y la Regla fundamental:

> «**Antes de generar ningún componente, confirma que el proyecto es un starter DESY
> clonado… Si no lo es, este skill no aplica** — primero hay que aplicar
> `desy-scaffold-project`…»

## 4. Restricciones

- La `description` respeta `CONTRIBUTING.md`: ≤ 160 bytes, empieza por verbo, sin
  workflow entero. La propuesta ocupa **159 bytes**:

  > `Implementa cualquier componente DESY con el macro de su librería, sea botón, tabla, acordeón u otro. SIEMPRE un componente suelto, nunca una página entera.`

  Los ejemplos son un conjunto **abierto** («sea … u otro»), no una lista: una
  primera versión los ataba con dos puntos («con un componente suelto: botón,
  input, tabla») y cinco casos concretos pesaban más que el «cualquier» de delante.
- No se cambia el prompt del Caso para que nombre el skill: eso mide el prompt.
- No se toca `assets/catalog.json` ni `references/`.
- La autoridad de los tokens sigue siendo `desy-styles-reference`.

## 5. Cómo se valida

- [x] Medido con `--skills-local` sobre el worktree (`skill/trigger-implement-component`)
- [ ] **PASA sostenido**: dos corridas consecutivas PASA — **no alcanzado**, ver abajo

**Resultado de la medición:** con el cambio aplicado, 2 Ejecuciones y **0
invocaciones**. La mejora de texto se sostiene; el disparo, no. Este documento
declara lo que midió, no lo que esperaba.

## 6. Skills sugeridos para el agente

- `desy-implement-component`

## 7. Lo que no debe hacer

- Re-pinear `desy-skills-test` desde allí.
- Copiar documentación del harness a `desy-skills`.
- Convertir este PR en un rediseño del cuerpo del skill: eso es la vía 1 del
  ticket 19, y va aparte.

## 8. Declaración de cierre (la rellena el agente que aplica)

Aplicado en la rama `skill/trigger-implement-component` de `desy-skills`, PR #36.
Validado en `desy-skills-test` con:

```
npm run run -- --skill implement-component --case boton-primario --n 1 \
  --skills-local /Users/jesuscuadraes/sda/desy-skills-trigger
```

→ árbol `a2dfb98…`, 2 Ejecuciones, 0 invocaciones del skill. No cierra el trigger;
sí quita la incoherencia de idioma y el veto.

**Actualización (retro del ticket 19).** El «0 invocaciones» de arriba era un
**artefacto de la medición**, no del skill: el SUT corría sin skills
(`XDG_CONFIG_HOME` un nivel de más) y el parser no reconocía la invocación de V2.
Con el harness arreglado, el mismo Caso da
`flujoObservado: ["preflight-check","implement-component","validate-accessibility"]`
y PASA. Este PR se mergea por la mejora de texto, no por el trigger; la causa real
está en el ticket 19.
