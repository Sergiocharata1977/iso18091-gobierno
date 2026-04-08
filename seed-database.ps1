# Script consolidado para seed de base de datos
# Combina: seed-iso9001-complete.ps1, seed-process-definitions.ps1, seed-quality.ps1, seed-calendar-events.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Seed de Base de Datos - Sistema ISO 9001" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Menú de opciones
Write-Host "Selecciona qué datos deseas cargar:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Datos completos ISO 9001 (procesos, documentos, normas)"
Write-Host "2. Definiciones de procesos"
Write-Host "3. Datos de calidad (objetivos, indicadores)"
Write-Host "4. Eventos de calendario"
Write-Host "5. TODO (todas las opciones anteriores)"
Write-Host "0. Salir"
Write-Host ""

$option = Read-Host "Ingresa tu opción (0-5)"

switch ($option) {
    "1" {
        Write-Host ""
        Write-Host "Cargando datos completos ISO 9001..." -ForegroundColor Green
        npm run seed:iso9001
    }
    "2" {
        Write-Host ""
        Write-Host "Cargando definiciones de procesos..." -ForegroundColor Green
        npm run seed:processes
    }
    "3" {
        Write-Host ""
        Write-Host "Cargando datos de calidad..." -ForegroundColor Green
        npm run seed:quality
    }
    "4" {
        Write-Host ""
        Write-Host "Cargando eventos de calendario..." -ForegroundColor Green
        npm run seed:calendar
    }
    "5" {
        Write-Host ""
        Write-Host "Cargando TODOS los datos..." -ForegroundColor Green
        Write-Host ""
        
        Write-Host "1/4 Datos ISO 9001..." -ForegroundColor Cyan
        npm run seed:iso9001
        
        Write-Host ""
        Write-Host "2/4 Definiciones de procesos..." -ForegroundColor Cyan
        npm run seed:processes
        
        Write-Host ""
        Write-Host "3/4 Datos de calidad..." -ForegroundColor Cyan
        npm run seed:quality
        
        Write-Host ""
        Write-Host "4/4 Eventos de calendario..." -ForegroundColor Cyan
        npm run seed:calendar
        
        Write-Host ""
        Write-Host "✅ Todos los datos cargados exitosamente" -ForegroundColor Green
    }
    "0" {
        Write-Host "Operación cancelada" -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "Opción inválida" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Operación completada" -ForegroundColor Green
