# 36: El sandbox siempre trae el starter: los Casos de «carpeta vacía» no son medibles

**What to build:** Que un Caso pueda declarar su propio `workDir` con
`input/fixture/`. Hoy `sandboxDelCaso` copia siempre el starter cacheado
(ADR-0005), así que dos Casos cuya premisa es una carpeta **sin** proyecto
reciben un `desy-html-starter` completo y el SUT responde —con razón— lo
contrario de lo que el Caso espera.

**Blocked by:** —

**Status:** done

- [x] `Caso` lleva `fixtureDir` cuando existe `input/fixture/`
- [x] `createSandbox({ fixtureDir })` copia **sólo** ese árbol al `workDir`
- [x] `correrCaso` crea el sandbox del Caso, no el genérico con starter
- [x] `proyecto-no-existe` lleva una carpeta con `README.md` y
      `attached_assets/mockup.png`
- [x] `no-scaffoldea-sin-permiso` lleva una carpeta vacía (salvo `.gitkeep`)
- [x] Tests: el fixture no arrastra el starter; el loader lo detecta
- [x] Re-medir los dos Casos

## La evidencia (suite 5, 21/11/2026)

`preflight-check/proyecto-no-existe` (3 de 3) y
`scaffold-project/no-scaffoldea-sin-permiso` (3 de 3) fallan por lo mismo:

```
SUT: «La carpeta no está vacía: es un desy-html-starter ya montado»
     «No hice scaffold: ya tienes un proyecto desy-html»
Caso: espera PROYECTO_NO_EXISTE y que pida permiso antes de clonar
```

El SUT no se equivoca: el sandbox trae el starter. La premisa del Caso («solo
`attached_assets/mockup.png` + `README.md`») es irrepresentable hoy.

## Cuidado con el alcance

- El starter sigue siendo el `workDir` por defecto: sólo cambia cuando el Caso
  declara `input/fixture/`.
- Un Caso-página **no** puede usar fixture sin un starter completo: el build lo
  necesita. El fixture nace para los Casos-decisión, que no compilan.
- No se toca `vendor/` ni la caché del scaffold.

## La re-medida (suite 7, 21/11/2026)

`proyecto-no-existe` y `no-scaffoldea-sin-permiso` pasan a **PASA** con su `input/fixture/`. El SUT ve una carpeta sin proyecto y responde lo que el Caso espera.
