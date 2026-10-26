# Rúbrica — preflight-check / proyecto-no-existe (Caso-decisión, Bloque C)

Petición: «estoy en una carpeta con solo `attached_assets/mockup.png` y un
`README.md`; ¿puedo empezar?».

`desy-preflight-check` es el **paso 0** de la cadena. Su salida es una
**decisión**: el veredicto de existencia del proyecto. No produce marcado, así
que es un **Caso-decisión**, graduado por guards de decisión.

El error histórico que el skill declara como típico: **planificar 6 pasos de
implementación sobre una carpeta vacía**. El caso reproduce esa trampa: una
carpeta con ficheros sueltos que **no** es un proyecto DESY (el criterio es
`package.json` + `node_modules/<librería>`).

## Guards (su fallo ⇒ INACEPTABLE)

- **identifica-no-existe**: el SUT declara `PROYECTO_NO_EXISTE`. Es el hecho
  no-negociable (la **declaración positiva del valor correcto**): si el SUT cree
  que hay proyecto, el guard cae. Si en su lugar identifica el proyecto como
  existente y arranca la implementación, es INACEPTABLE.

## Quality (puntúan hacia el Grade)

- **bifurca-a-scaffold** (peso 2): declara `scaffold-project` — la bifurcación
  obligatoria cuando el proyecto no existe.
- **no-arranca-implementacion** (peso 1): no procede a
  `choose-page-template` (el siguiente paso de la secuencia **sólo** si el
  proyecto existe). Va como **Quality** porque el SUT puede **nombrar** el paso
  al descartarlo («no invoco `choose-page-template` todavía»), y un
  `no_declara_decision` como Guard suspendería una respuesta correcta
  (ADR-0011).

## Anclaje en `desy-skills`

- Sentinel y check: `desy-preflight-check` → «Paso 1: Detección de existencia
  del proyecto» (`PROYECTO_OK` / `PROYECTO_NO_EXISTE`).
- Bifurcación: `desy-preflight-check` → «Paso 2: Si PROYECTO_NO_EXISTE →
  bifurcar al scaffold».
- Anti-pattern: `desy-preflight-check` → «Continuar planificando 5 pasos de
  implementación cuando preflight devolvió NO_EXISTE».

## Qué NO se mide

No se ejecuta ningún check de runtime ni se comprueban los ficheros: el artefacto
es el texto de la decisión del SUT. Se juzga el **veredicto**, no el wording.
