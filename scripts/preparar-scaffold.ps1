# Prepara el scaffold cacheado que el runner copia en cada sandbox (ver ADR-0005).
#
# El Caso-componente necesita un proyecto DESY ya scaffoldeado; el skill
# `desy-scaffold-project` prohíbe al agente hacer el scaffold por su cuenta, así
# que el harness lo deja hecho de antemano. La caché NO se versiona (el starter
# con node_modules pesa ~88 MB): lo que se versiona es esta receta.
#
# Uso:  powershell -File scripts/preparar-scaffold.ps1 [-Ref <ref>]
#
# IMPORTANTE: `-Ref` debe ser un ref FIJO (tag o SHA), no una rama en
# movimiento. El Grade del Caso depende de la versión del starter tanto como del
# Pin de desy-skills (ver ADR-0005).
param(
  [string]$Ref = "37748bd",
  [string]$Repo = "https://bitbucket.org/sdaragon/desy-html-starter.git"
)

$ErrorActionPreference = "Stop"

$raiz = Split-Path -Parent $PSScriptRoot
$destino = Join-Path $raiz ".scaffold-cache\desy-html-starter"

if (Test-Path $destino) {
  Write-Host "Ya existe el scaffold cacheado en $destino"
  Write-Host "Bórralo si quieres regenerarlo."
  exit 0
}

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destino) | Out-Null

Write-Host "Clonando $Repo ($Ref) en $destino ..."
git clone --depth 1 --branch $Ref $Repo $destino

Push-Location $destino
try {
  Write-Host "Instalando dependencias del starter ..."
  npm install
}
finally {
  Pop-Location
}

# NO correr `npm run build` aquí: dejaría un dist/ en la caché que el runner
# interpreta como contaminación (ver ADR-0005). La caché limpia no tiene dist/;
# si el .gitignore del starter sigue ignorando dist/, git tampoco lo delataría.
Write-Host ""
Write-Host "Scaffold listo en $destino"
Write-Host "El runner lo copiará a cada sandbox automáticamente."
