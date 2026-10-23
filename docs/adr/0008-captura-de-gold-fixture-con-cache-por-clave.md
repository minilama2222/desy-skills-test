# Captura de Gold: fixture versionada con caché por clave

La **Captura de Gold** (Gold-imagen) es el screenshot de un Gold-HTML a 1900px
de ancho, generado con `agent-browser`. Un Caso-página la lleva como referencia
visual en su prompt (ver el ticket 08). Se genera **una vez** y se reutiliza; no
se recaptura en cada Ejecución, porque abrir un navegador y capturar es lento
(segundos) y añadiría no-determinismo al bucle de test.

El PNG se guarda **como fixture versionada**, junto al Gold-HTML del Caso:
`casos/<skill>/pagina/<id>/input/gold.png`, con un manifiesto
`input/gold.captura.json`. Quien clona el repo tiene la referencia visual sin
ejecutar nada; es lo que dice el glosario («cacheada como fixture») y el criterio
5 del ticket 06 («estable y versionable»).

## Cómo se invalida

La caché se invalida por **clave**: `claveDeCaptura({ html, ancho })` es un hash
(SHA-256) del contenido del Gold-HTML **y** del ancho de viewport. El manifiesto
guarda esa clave. Al asegurar la captura, se recalcula la clave del Gold-HTML
actual; si no coincide con la guardada, se recaptura. Así:

- **Cambiar el Gold-HTML** cambia el hash → caduca.
- **Cambiar el viewport** cambia el hash → caduca.
- Nada más caduca: si ambos siguen iguales, la fixture se reutiliza tal cual.

La regla es pura (`capturaVigente`), así que su test de invalidación **no abre un
navegador**: inyecta un capturador falso y comprueba que se regenera sólo cuando
toca. El adaptador real (`capturarConAgentBrowser`) **no se prueba en la suite**:
abre un navegador con proceso propio, y meterlo en un runner de tests en paralelo
deja procesos vivos y cuelga la suite. Se verifica con un script aparte
(`npm run verificar-captura-gold`) que captura un Gold-HTML real y comprueba que
el PNG mide 1900px de ancho.

## Alternativas descartadas

- **Caché fuera de control de versiones (como el scaffold, ADR-0005)**: el
  scaffold es 88 MB con `node_modules` y depende de red; un PNG de una página es
  pequeño y estable, y el ticket lo pide **versionable**. Commitear la fixture da
  la referencia visual a cualquiera que clone, sin regenerar.
- **Capturar en cada Ejecución**: correcto en frescura pero añade un navegador al
  bucle de test, con latencia y no-determinismo. La captura es un input, no parte
  del SUT.
- **Invalidar por fecha/mtime del Gold**: frágil (re-clonar cambia mtime sin
  cambiar contenido). El hash del contenido es exacto.
- **Guardar la captura sin manifiesto**: habría que adivinar con qué ancho se
  hizo, y no habría con qué comparar para invalidar.

## Consecuencias

- La Captura de Gold **es un input versionado del Caso**, no un artefacto de
  Ejecución. Viaja con el Caso y se commitea.
- El `gold.png` fija el ancho a **1900px** (`ANCHO_CAPTURA`). Cambiarlo es una
  decisión explícita que invalida todas las capturas (el manifiesto lo delata).
- El manifiesto `gold.captura.json` es un formato estable y legible:
  `{ ancho, clave, fichero }`. Hace auditable de un vistazo con qué Gold-HTML y
  qué viewport se generó la imagen.
- **En Windows**, `agent-browser` se instala como shim `.cmd`, no como `.exe`;
  `spawnSync` no lo resuelve para subcomandos. El adaptador lo invoca vía
  `cmd.exe /c`. Es una diferencia de plataforma, no de diseño.
- La generación es un paso **de autoría del Caso** (comando `capturar-gold`), no
  del bucle de Ejecución. El runner no captura Gold.
- **El adaptador real queda fuera de la suite de tests.** Abre un navegador con
  proceso propio; en un runner paralelo deja procesos vivos y cuelga la suite
  (observado). Se verifica con `scripts/verificar-captura-gold.ts`. La suite sólo
  prueba la regla de invalidación, que es determinista.
