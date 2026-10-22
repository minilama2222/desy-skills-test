# 05: Slice 1 — Caso-componente implement-component (botón primario)

**What to build:** El primer camino vertical completo y demostrable: un Caso-componente que pide "genera un botón primario tamaño estándar con texto 'Enviar'" y se evalúa de punta a punta (runner → grader → Grade). Al terminar, `npm run run -- --skill implement-component --case boton-primario` produce un JSON con la secuencia de skills invocados y el Grade.

**Blocked by:** 02, 04

**Status:** ready-for-human

- [x] Existe el Caso-componente con su `input/`, `expected/checks.json` y `rubric.md`
- [x] Guards: existe la llamada a `componentButton`, usa la variante primaria, sin props inventados
- [x] Quality: usa la utility de tamaño correcta
- [x] El JSON de salida reporta Flujo observado y Grade
- [ ] El resultado es estable entre Ejecuciones repetidas

## Notas de implementación

- El `Assert` no podía expresar «variante» ni «props inventados»: se añadieron
  `macro_con_clase`, `macro_sin_clase` y `sin_props_inventados` (`src/caso.ts`),
  con la lógica en `src/grader.ts` y las props válidas leídas del `catalog.json`
  del Pin (`src/catalogo.ts`).
- El CLI pasa a `run --skill <s> --case <c>` y orquesta runner → grader vía
  `src/ejecutar.ts`, emitiendo `{grade, detalle, flujoObservado, pin, artefactos}`.
- **Bug arreglado**: `opencode run` escribe las invocaciones `→ Skill "..."` por
  **stderr**, y `realCommand` lo descartaba (`execFileSync` + `stderr: ""`). El
  Flujo observado salía siempre vacío. Ahora se usa `spawnSync` capturando ambos
  streams. El parser esperaba además un formato inventado (`» skill: nombre`) que
  opencode no emite; corregido contra una corrida real.
- **Bloqueo resuelto (ADR-0005)**: el SUT se detenía en `desy-scaffold-project`
  porque ese skill le prohíbe scaffoldear sin permiso del usuario, y en headless
  no hay usuario. El runner pre-scaffoldea el sandbox con un starter cacheado.
- `listArtefactos` devuelve **sólo lo nuevo o modificado** respecto a la línea
  base del scaffold; antes habría recolectado las ~60 páginas de ejemplo del
  starter. **Corregido (ADR-0006)**: el directorio depende del tipo de Caso — el
  **fuente** (`src/`) para el Caso-componente, el **compilado** (`dist/`) para el
  Caso-página. Antes miraba siempre el `dist/`, donde el macro ya está expandido,
  así que los guards de contrato de macro suspendían un output correcto.

## Pendiente (criterio 5)

El harness es determinista: el grader es puro y hay un golden
(`test/caso-boton-primario-aceptacion.test.ts`) que fija que una salida correcta
del SUT da EXCELENTE. Lo que **no** es estable es el SUT.

Historia de la investigación (ver `HALLAZGO-guards-macro-artefacto.md`):

1. Primero se creyó flakiness del SUT. El experimento de estabilidad v2 sobre 3
   Ejecuciones con caché limpia mostró que **1 de 3 sí entregó** un botón
   correcto (macro + variante + props válidas) y el harness lo suspendió: era
   **bug del harness** (miraba el `dist/`). Arreglado en ADR-0006; el fuente
   exacto de esa Ejecución da ahora EXCELENTE
   (`test/regresion-artefacto-src.test.ts`).
2. Las otras 2 de 3 no entregaron artefacto, y de dos formas distintas: una llegó
   a `implement-component` y no escribió nada; la otra **ni pasó de
   `preflight-check`**. Hoy ambas dan INACEPTABLE igual que un output incorrecto,
   así que el denominador del criterio 5 está sucio.

**Lo que falta para cerrar el criterio 5** (ticket 15): distinguir «no hay
artefacto» de «artefacto incorrecto» en el resultado. Con eso, la política de N
Ejecuciones se puede decidir sobre un denominador limpio (medir entregas, no
arranques). Nunca fue inestabilidad del grader ni del harness determinista.



