# 16: Un test no arma sus fixtures desde una constante del producto

**What to build:** Que `npm run verificar-tests` cace un test que toma una
constante **de datos** del producto como fixture: `[...PENDIENTES_DE_ANCLAR.keys()]`,
`IDS_DEL_FRAMEWORK`, o la que venga. Es el mismo género que
`pruebasQueAfirmanContenidoDelArbol` —un test atado al estado del repo— por otra
puerta: la constante vive en `src/`, no en `vendor/` ni en `casos/`, así que el
guardarraíl actual no la ve.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] `pruebasQueAfirmanContenidoDelArbol` (o una hermana) señala un test que
      importa una constante de datos del producto y la recorre para armar el fixture
- [ ] La lista de constantes vigiladas vive con el motivo escrito, y crecerla es una
      decisión, no una comodidad
- [ ] Control positivo: un test de fixture propio (`canales`) no se señala, y el que
      recorre la constante sí
- [ ] `npm test` y `npm run precommit` en verde

## Por qué existe

Salió en el retro de la sesión del ticket 12. El ticket vació
`PENDIENTES_DE_ANCLAR`, y **seis tests de `guardarrail-casos.test.ts`** se
pusieron rojos aunque el código era correcto: sus fixtures eran
`[...PENDIENTES_DE_ANCLAR.keys()]`. El agente los arregló pasando una lista de
prueba como argumento, pero lo hizo **después** de que el rojo saltara, a mano.
Un guardarraíl lo habría dicho antes de escribir el test.

El caso que más duele es el que sobrevive: `guardarrail-casos.test.ts:325` afirma
`[...PENDIENTES_DE_ANCLAR.keys()]` es `[]`. Eso **sí** es una afirmación legítima
sobre el estado real (fija que la lista no se rellena sin querer) y es justo lo
que el guardarraíl no puede distinguir de un fixture atado al repo.

## Cómo resolverlo

Un test que arma su fixture desde una constante de datos del producto se
*declara*, como ya se declaran las excepciones de binarios y de árbol real (con
su motivo, en `scripts/verificar-tests.ts`). El que la afirma como **objetivo**
—«la lista está vacía»— pasa por el mismo sitio: la declaración dice «lo afirmo a
propósito», y así la siguiente vez se decide en un solo lugar.

## Notas

- **Qué es una constante de datos**: la que cambia con el **contenido** del repo
  (`PENDIENTES_DE_ANCLAR`, `IDS_DEL_FRAMEWORK`). No lo es la que es **configuración**
  (una ruta, un `DEFAULT_REPO`): un test que la importa no se atará al contenido.
  El tell: si el contenido de un `.md` puede cambiarla, es de datos.
- **No dupliques `ARBOLES_DE_CONTENIDO_MARCADORES`**: la lista nueva es de
  **constantes exportadas de `src/`**, no de rutas de árbol. Son dos ejes.
