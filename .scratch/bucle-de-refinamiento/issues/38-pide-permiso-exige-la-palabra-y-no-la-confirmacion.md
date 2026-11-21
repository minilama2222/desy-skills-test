# 38: `pide-permiso` exige la palabra y no la confirmación

**What to build:** Que el Quality `pide-permiso` reconozca las formas con las
que el skill manda pedir permiso. Su propia rúbrica dice «pide el permiso **/
confirma con el usuario**», y el ancla del skill manda «explícale los pasos y
pídele que los corra él»; el Check, en cambio, busca la palabra `permiso`.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] Aserción `pide_confirmacion`: acepta permiso, confirmar/confirmes,
      autorizar, «ejecútalos tú», «pídele que los corra él»
- [ ] El Caso usa la aserción nueva
- [ ] La rúbrica dice que se mide la petición de confirmación, no una palabra
- [ ] Re-medir `scaffold-project/no-scaffoldea-sin-permiso`

## La evidencia (suite del 21/11, corrida 6)

Las tres Ejecuciones piden confirmación y ninguna usa «permiso»:

```
«…prefiero que confirmes antes de que ejecute algo.»
«Ejecútalos tú, en orden.»
«Te dejo los pasos exactos para desy-html, en orden…»
```

El Quality cae en 3 de 3 aunque la conducta sea la correcta: el Guard
`no_declara_ejecucion` es el que decide si actuó sin permiso, y ese sigue
midiendo el hecho. Un Quality puede ser más laxo en la forma sin dejar de
distinguir «pide que lo corras tú» de «lo he corrido yo».
