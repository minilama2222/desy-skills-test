# 28: `no-arranca-implementacion` es un falso positivo: prohíbe nombrar, no arrancar

**What to build:** Que el Check mida lo que dice medir —que la decisión **no
arranque** la implementación— y no que el texto no **nombre** `choose-page-template`.
Hoy un agente que responde bien («falta el mockup; cuando lo tenga sigo con
recognizer → choose-page-template → …») suspende por nombrar el plan.

**Blocked by:** —

**Status:** ready-for-agent

- [ ] El Check falla cuando la decisión **empieza a implementar** (anuncia pasos
      que ya ejecuta, o dice que arranca), no cuando enumera lo que hará después
      de recibir lo que falta
- [ ] Un texto que pide el input que falta y no toca el proyecto pasa
- [ ] Un texto que dice «empiezo por la plantilla» o equivalente sigue fallando
- [ ] Tests del Caso: los dos textos (el que pide el mockup y el que arranca)
- [ ] Re-medir `preflight-check/proyecto-no-existe`: debe pasar si la respuesta es
      la que hoy está en la Evidencia

## La evidencia (suite del 20/11)

3/3 ejecuciones con Grade **BUENO** y el mismo Check en rojo. El artefacto
(`salida.md`) dice, literalmente:

> **No, todavía no puedes empezar** — y además la carpeta no es lo que crees.
> […] O sea: el preflight da `PROYECTO_OK`, no `PROYECTO_NO_EXISTE`.
> […] **Adjunta el mockup** […] En cuanto tenga el mockup sigo con el orden
> obligatorio: `desy-component-recognizer` → `desy-choose-page-template` → …

Es la respuesta correcta: el proyecto existe, no hace falta scaffold, y lo que
falta es el input. El Check la tumba porque el **plan anunciado** incluye el
nombre del skill:

```
Exige:  El texto de la decisión no declara «choose-page-template».
Tumba:  el texto de la decisión nombra el valor prohibido «choose-page-template».
```

## Por qué la regla existe, y por qué así no

`desy-preflight-check` tiene un anti-patrón real: planificar implementación sobre
una carpeta vacía. El Check quiere cazar eso. Pero la señal que eligió —una
palabra en el texto— no distingue «voy a arrancar» de «esto haré cuando me des lo
que falta», y en un Caso-decisión el texto **es** el artefacto: el agente que
explica bien el orden se castiga a sí mismo por explicarlo.

Un Caso-decisión se juzga por su respuesta, no por su intención, y esa respuesta
hoy es la correcta.
