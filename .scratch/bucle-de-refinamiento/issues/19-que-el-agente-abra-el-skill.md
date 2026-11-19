# 19: El trigger no se disparaba por dos fallos del harness (V2), y ya se dispara

**What to build:** Que un Caso-página o componente cuyo SUT deba invocar un skill
lo **vea** y el harness lo **cuente**. No era el skill: era el harness.

**Blocked by:** 18

**Status:** done

- [x] Causa 1 — el sandbox no dejaba ver las skills: `XDG_CONFIG_HOME` valía
      `<home>/.config/opencode` y V2 busca su config en `<XDG>/opencode/`, así que
      leía una carpeta vacía. Pasa a ser la raíz `<home>/.config`.
- [x] Causa 2 — el parser no veía la invocación: buscaba la línea `→ Skill "…"` de
      **V1**; en **V2** es una llamada a la herramienta `skill` en el stream JSON de
      stdout. `parseInvocaciones` lee la de V2.
- [x] Medido de punta a punta: `flujoObservado: ["preflight-check","implement-component","validate-accessibility"]`,
      `flujoAlcanzoSkill: true`, `EXCELENTE`, entregó. **PASA**, donde antes era
      INDETERMINADO.

**Decisión que queda al humano (no es trabajo de este ticket):** si se sube el Pin
a `0d6263d` (el PR #36 mergeado) y si se re-mide lo demás contaminado. Lo medido
desde el 29/10 salió con el flujo vacío por los dos fallos de abajo; hay que
re-medir antes de sacar conclusiones de esas corridas.

## Los dos fallos, y por qué el segundo estaba escondido

En V1 (hasta el 28/10) los skills se disparaban: 4 de 5 Ejecuciones de octubre
muestran `preflight-check → implement-component`. El 29/10 (`bfb37ef`) el SUT pasó
a **V2** y el disparo desapareció —de toda medición desde entonces—. No era el
contenido del skill: eran **dos** fallos del harness, ambos de la migración.

1. **Las skills no llegaban al SUT.** `entornoDelSandbox` ponía `XDG_CONFIG_HOME`
   a `configDir` (`<home>/.config/opencode`). V2 le **añade** `opencode` para
   resolver su carpeta de config, así que buscaba en
   `<home>/.config/opencode/opencode/` —vacía—. Comprobado con
   `opencode debug config --standalone`: no listaba el `opencode.jsonc` del
   sandbox. El agente corría **sin ninguna skill**.
2. **El harness no contaba la invocación.** Aun con las skills visibles, en V2 la
   invocación **no** es la línea `→ Skill "…"` de V1 que `parseInvocaciones`
   leía, sino una llamada a la herramienta `skill` en el stream JSON de stdout
   (`{"part":{"type":"tool","tool":"skill","state":{"input":{"id":"desy-…"}}}}`).
   El Flujo salía `[]` con el skill ya cargado.

El 1 **tapaba** al 2: sin skills visibles nada se invocaba, así que el parser
nunca tuvo algo que fallar. Aparecieron en cadena.

## La evidencia que lo cerró

```
1.json | grade: EXCELENTE | entrega: con-artefacto
       | FLUJO: ['preflight-check', 'implement-component', 'validate-accessibility']
       | alcanzó: True | exit: 0
```

Y en el transcript, literal: `tool: "skill"` con `id: "desy-implement-component"` y
el `SKILL.md` inyectado desde `…/opencode/skills/desy-implement-component`.

## Qué queda contaminado

**Todo lo medido desde el 29/10/2026.** Cualquier Caso cuyo SUT debiera invocar un
skill salía sin flujo: INDETERMINADO como mucho, y con la línea «no declara de qué
sección depende» del informe. No es que los skills no se usaran: es que el harness
no lo veía. Hay que re-medir antes de sacar conclusiones de esas corridas.

## Lo que NO era

- **El contenido ni la `description` del skill.** El PR #36 (`desy-skills`) mejora
  la `description` y quita un veto, y se mergea por eso —pero no arreglaba esto, y
  se dijo en su cuerpo—. El skill se dispara igual con la `description` vieja.
- **El ticket 18** (macro comentado): arreglo aparte, ya cerrado.

## Archivos

- `src/runner.ts`: `entornoDelSandbox` (`XDG_CONFIG_HOME` a la raíz) e
  `invocacionesDelStreamV2` (`parseInvocaciones`).
- `test/sandbox.test.ts`: fija `XDG_CONFIG_HOME = <home>/.config`;
  `test/caso-runner-observable.test.ts`: la forma de V2, con control negativo.
- `docs/adr/0013-sut-opencode-v2.md`: nota de corrección con la lección —la
  convención de rutas y de salida de V2 se re-mide al subir de versión, y un test
  que reconstruye la ruta desde la misma suposición que el código no la protege.
