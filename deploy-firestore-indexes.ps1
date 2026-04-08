# Script para desplegar índices de Firestore
# Requiere Firebase CLI instalado: npm install -g firebase-tools

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Desplegando Indices de Firestore" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si Firebase CLI esta instalado
try {
    $firebaseVersion = firebase --version
    Write-Host "OK Firebase CLI encontrado: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR Firebase CLI no esta instalado" -ForegroundColor Red
    Write-Host ""
    Write-Host "Instala Firebase CLI con:" -ForegroundColor Yellow
    Write-Host "  npm install -g firebase-tools" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "Verificando archivo de indices..." -ForegroundColor Yellow

# Verificar que existe el archivo de indices
if (-not (Test-Path "firestore.indexes.json")) {
    Write-Host "ERROR No se encontro firestore.indexes.json" -ForegroundColor Red
    exit 1
}

Write-Host "OK Archivo firestore.indexes.json encontrado" -ForegroundColor Green
Write-Host ""

# Mostrar contenido del archivo
$indexContent = Get-Content "firestore.indexes.json" -Raw | ConvertFrom-Json
$indexCount = $indexContent.indexes.Count
Write-Host "Total de indices a desplegar: $indexCount" -ForegroundColor Cyan
Write-Host ""

# Preguntar confirmacion
$confirm = Read-Host "Deseas desplegar los indices a Firebase? (S/N)"
if ($confirm -ne "S" -and $confirm -ne "s") {
    Write-Host "Operacion cancelada" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Desplegando indices..." -ForegroundColor Yellow
Write-Host ""

# Desplegar indices
try {
    firebase deploy --only firestore:indexes --project app-4b05c
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  OK Indices desplegados exitosamente" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Los indices pueden tardar unos minutos en estar disponibles." -ForegroundColor Yellow
    Write-Host "Puedes verificar el estado en:" -ForegroundColor Cyan
    Write-Host "https://console.firebase.google.com/project/app-4b05c/firestore/indexes" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "ERROR al desplegar indices" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Posibles soluciones:" -ForegroundColor Yellow
    Write-Host "1. Asegurate de estar autenticado: firebase login" -ForegroundColor White
    Write-Host "2. Verifica que el proyecto existe: firebase projects:list" -ForegroundColor White
    Write-Host "3. Verifica el archivo firestore.indexes.json" -ForegroundColor White
    Write-Host ""
    exit 1
}
