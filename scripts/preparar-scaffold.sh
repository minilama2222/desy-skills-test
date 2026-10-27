#!/bin/sh
# Prepara el scaffold cacheado que el runner copia en cada sandbox (ver ADR-0005).
#
# Equivalente POSIX de `preparar-scaffold.ps1`, para macOS y Linux. Misma receta,
# mismo commit fijo, misma regla: NO se compila dentro de la caché.
#
# Uso:  sh scripts/preparar-scaffold.sh [ref]
#
# IMPORTANTE: el ref debe ser FIJO (tag o SHA), no una rama en movimiento. El
# Grade del Caso depende de la versión del starter tanto como del Pin de
# desy-skills (ver ADR-0005).
set -e

REF="${1:-37748bd}"
REPO="${DESY_STARTER_REPO:-https://bitbucket.org/sdaragon/desy-html-starter.git}"

RAIZ=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DESTINO="$RAIZ/.scaffold-cache/desy-html-starter"

if [ -d "$DESTINO" ]; then
  echo "Ya existe el scaffold cacheado en $DESTINO"
  echo "Bórralo si quieres regenerarlo."
  exit 0
fi

mkdir -p "$(dirname -- "$DESTINO")"

echo "Clonando $REPO ($REF) en $DESTINO ..."
# El ref es un SHA corto por defecto (`37748bd`), y `git clone --branch` no
# acepta SHAs: sólo ramas y tags. Se clona el repo y se hace checkout del ref, que
# sirve para los tres casos. `--depth 1` no vale aquí, porque el checkout de un
# SHA arbitrario necesita tenerlo en el historial.
git clone --quiet "$REPO" "$DESTINO"
( cd "$DESTINO" && git checkout --quiet "$REF" )

echo "Instalando dependencias del starter ..."
( cd "$DESTINO" && npm install )

# NO correr `npm run build` aquí: dejaría un dist/ en la caché que el runner
# interpreta como contaminación (ver ADR-0005). La caché limpia no tiene dist/;
# si el .gitignore del starter sigue ignorando dist/, git tampoco lo delataría.
echo ""
echo "Scaffold listo en $DESTINO"
echo "El runner lo copiará a cada sandbox automáticamente."
