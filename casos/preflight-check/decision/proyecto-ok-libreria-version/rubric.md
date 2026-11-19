# Rúbrica — preflight-check / proyecto-ok-libreria-version (Caso-decisión, Bloque C)

Petición: «hay `package.json` + `node_modules/`; dime el resultado del preflight,
la librería y la versión».

Es la **otra rama** de `desy-preflight-check` (frente a `proyecto-no-existe`): el
proyecto **sí** existe y el paso 3 del skill manda **leer el `package.json`** y
reportar la librería detectada y su versión instalada. Su salida es una
**decisión**: es un **Caso-decisión**.

El error que el skill declara como típico: **asumir la librería sin verificar**
(saltar directo a `desy-choose-library`) o **asumir una versión outdated** sin
leer el `package.json`.

## Guards (su fallo ⇒ INACEPTABLE)

- **identifica-libreria**: el SUT declara la librería instalada (`desy-html`),
  leída del `package.json`. Es el hecho no-negociable: sin identificar la
  librería no hay contexto para la secuencia. Declarar PROYECTO_OK y empezar a
  maquetar sin nombrar la librería suspende.

## Quality (puntúan hacia el Grade)

- **identifica-version** (peso 2): declara la versión instalada (`16.3.1`). El
  skill lo pide explícitamente (usar una API de una versión no instalada es el
  anti-pattern).
- **identifica-proyecto-ok** (peso 1): declara `PROYECTO_OK`, el veredicto del
  check de existencia.

## Anclaje en `desy-skills`

- identifica-libreria: desy-preflight-check → «Paso 3: Si PROYECTO_OK → identificar contexto»
- identifica-version: desy-preflight-check → «Paso 3: Si PROYECTO_OK → identificar contexto»
- identifica-proyecto-ok: desy-preflight-check → «Paso 1: Detección de existencia del proyecto»

Prosa de apoyo: el check de existencia (`PROYECTO_OK`) está en «Paso 1»; la
lectura del `package.json` con proyecto, librería, versión y comandos, en «Paso 3»;
y los anti-patterns «Asumir librería sin verificar» y «Asumir versión outdated», en
«Errores típicos que evita».

## Qué NO se mide

No se ejecuta ningún comando: el `package.json` viene dado en el prompt. Se juzga
la **decisión** (librería + versión identificadas), no el wording.
