# Script para limpiar archivos no deseados del repositorio Git
# Ejecutar desde la raíz del proyecto

Write-Host "Limpiando archivos del índice de Git..." -ForegroundColor Yellow

# Eliminar archivos .md excepto los importantes
Write-Host "Eliminando archivos .md innecesarios..." -ForegroundColor Cyan
git rm --cached -r --ignore-unmatch "*.md" 2>$null
git add README.md CHANGELOG.md CONTRIBUTING.md LICENSE.md 2>$null

# Eliminar carpetas de agente
Write-Host "Eliminando carpetas de agente..." -ForegroundColor Cyan
git rm --cached -r --ignore-unmatch .agent/ .gemini/ 2>$null

# Eliminar node_modules si está trackeado
Write-Host "Eliminando node_modules..." -ForegroundColor Cyan
git rm --cached -r --ignore-unmatch node_modules/ mcp-extension/node_modules/ 2>$null

# Eliminar archivos de configuración local
Write-Host "Eliminando archivos de configuración local..." -ForegroundColor Cyan
git rm --cached --ignore-unmatch .env.local .env.development .env.production 2>$null

# Eliminar archivos de build
Write-Host "Eliminando archivos de build..." -ForegroundColor Cyan
git rm --cached -r --ignore-unmatch dist/ build/ out/ .next/ 2>$null

# Agregar .gitignore
Write-Host "Agregando .gitignore..." -ForegroundColor Cyan
git add .gitignore

Write-Host "`nLimpieza completada!" -ForegroundColor Green
Write-Host "Archivos preparados para commit." -ForegroundColor Green

# Mostrar estado
Write-Host "`nEstado actual:" -ForegroundColor Yellow
git status --short
