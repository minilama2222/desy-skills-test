# 22: El SUT recorre el flujo y no entrega ningún artefacto (y el Grade puntuaba el vacío)

**What to build:** Saber **por qué** hay Ejecuciones con el flujo completo, `exit 0`
y ni un fichero entregado, y decidir de quién es el fallo: del Caso (espera el
artefacto en otro sitio), del harness (no lo recoge) o del SUT (trabaja en el chat).

**Blocked by:** —

**Status:** ready-for-human
**Status depende de:** dos decisiones de diseño, no de código: cómo obtiene el
Caso-página su `dist/` (¿lo pide el prompt o lo compila el harness?) y qué hace un
Caso-decisión que no debe entregar artefacto. El resto está construido y verde.

## Lo que se midió (19/11/2026)

**No era una causa, eran tres.** Se leyó el stream JSON de cada Ejecución, que
guarda la ruta de cada `write`/`edit`:

1. **`angular-translator` — el prompt pedía «devuelve».** Sus 6 Ejecuciones tienen
   **una sola** llamada a herramienta: `skill`. El agente cargó el skill y contestó
   el template en el chat. El prompt decía «Devuelve el **template Angular**» y el
   Caso mide un fichero en `src/`: el SUT hizo lo que se le pidió.
   **Arreglado en el prompt**: ahora pide escribirlo en
   `src/boton-primario-angular.html` y avisa de que lo que quede en el chat no cuenta.
2. **`patron-pagina` — el SUT escribió y el Caso miraba en otro sitio.** Escribió
   `work/src/formulario-paso-1-datos-identidad.html` (3 `write` y 14 `edit` sobre
   ese fichero), pero el artefacto de un Caso-página se recoge de **`dist/`**
   (ADR-0006) y nunca compiló: `artefactos: {}`.
3. **`scaffold-project/no-scaffoldea-sin-permiso`** es un Caso-decisión cuyo
   comportamiento correcto es **no** producir fichero; su veredicto no puede
   depender de una entrega que por diseño no existe.

**Y un fallo del harness, ya arreglado:** con `artefactos: {}` el evaluador miraba
una cadena vacía y `sin_utility_por_defecto` la aprobaba. Por eso Casos sin un solo
fichero salían con «Guards 1/2» y «4/9» en el Scorecard. Ahora, sin artefacto,
**ningún Check aprueba**.

## Lo que queda por decidir

- **El `dist/` del Caso-página.** Lo más simple es el prompt: pedirle al SUT que
  ejecute `npm run build` (la caché del scaffold trae `node_modules`, así que
  compila sin red). La alternativa es que compile el harness después del SUT, que
  no depende de que el agente se acuerde, pero añade un paso al runner.
- **El veredicto de un Caso-decisión sin artefacto.** Hoy es INDETERMINADO aunque
  haya decidido bien. Necesita otro criterio de veredicto (¿los Checks sobre el
  texto de la respuesta?), o se acepta que su medida es sólo cualitativa.

## Criterios

- [x] Reproducir y localizar el trabajo del SUT: no hizo falta conservar el
      `workDir` — el stream JSON de stdout trae la ruta absoluta de cada
      `write`/`edit`, que es la misma prueba y no ocupa disco
- [x] Determinar, en cada Caso afectado, qué fichero espera el Caso y qué escribió
      el SUT (ver arriba)
- [x] Fallo del grader: con `artefactos: {}` hay Checks que pasaban. Ahora ninguno
      aprueba sin artefacto, con control positivo para que el guard siga pudiendo
      pasar cuando hay fichero
- [x] `angular-translator`: el prompt pide el fichero, no «devuélvelo»
- [ ] Decidir cómo obtiene el Caso-página su `dist/`: lo compila el SUT porque el
      prompt se lo pide, o lo compila el harness tras el SUT
- [ ] Decidir el veredicto de `scaffold-project/no-scaffoldea-sin-permiso`, que hoy
      es INDETERMINADO por no entregar lo que por diseño no debe entregar

## Por qué importa más que un SUSPENDE

Un SUSPENDE dice «el skill lo hizo mal» y se puede refinar. Un INDETERMINADO por
falta de artefacto no dice nada del skill, y **hoy se lee como si el skill no
supiera hacerlo**. Mientras esto siga abierto, 2 de los 14 Casos no miden nada.
