# desy-skills vendorizado como copia, no submódulo

`vendor/desy-skills/` es una copia del commit pinneado, no un submódulo git. Lo obvio sería un submódulo, pero cada Ejecución necesita copiar los skills dentro de un sandbox con `HOME`/config temporal de todos modos, así que el submódulo solo añadiría ceremonia de clonado sin aportar aislamiento. La copia mantiene el harness desacoplado y permite testear varios commits/versiones de los skills sin tocar el repo desy-skills. El Pin efectivo se registra en `pin.json`.
