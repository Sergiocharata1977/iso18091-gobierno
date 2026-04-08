# Runbook Smoke QA en Produccion (Playwright)

Proyecto: 9001app-firebase / Don Candido IA
Fecha: 2026-02-23
Objetivo: ejecutar smoke E2E contra produccion/preview sin levantar servidor local (equipo con recursos limitados).

## Alcance seguro
- Ejecutar solo `e2e/smoke/**`
- Usar usuarios de prueba (nunca cuentas reales)
- Mantener onboarding (M4) en skip salvo tenant/usuario aislado
- No ejecutar suites destructivas fuera del smoke

## Requisitos
- Produccion/preview desplegada y accesible
- Dependencias instaladas (`npm install` ya hecho)
- Credenciales smoke de usuario con `organization_id`

## Variables minimas (PowerShell)
```powershell
$env:BASE_URL="https://www.doncandidoia.com"
$env:E2E_SMOKE_USER_EMAIL="TU_EMAIL_SMOKE"
$env:E2E_SMOKE_USER_PASSWORD="TU_PASSWORD_SMOKE"
$env:E2E_SMOKE_ONBOARDING_ENABLED="false"
```

## Ejecucion recomendada (Chromium, smoke completo)
```powershell
npx playwright test --project=chromium e2e/smoke --grep @smoke
```

## Ejecucion minima (M1/M2/M5, mas segura/rapida)
```powershell
npx playwright test --project=chromium `
  e2e/smoke/01-auth-login.smoke.spec.ts `
  e2e/smoke/02-mi-sgc-navigation.smoke.spec.ts `
  e2e/smoke/04-mi-panel-minimal.smoke.spec.ts
```

## Onboarding (M4) - solo si hay usuario aislado
```powershell
$env:E2E_SMOKE_ONBOARDING_ENABLED="true"
$env:E2E_ONBOARDING_USER_EMAIL="TU_EMAIL_ONBOARDING"
$env:E2E_ONBOARDING_USER_PASSWORD="TU_PASSWORD_ONBOARDING"

npx playwright test --project=chromium e2e/smoke/03-onboarding-critical.smoke.spec.ts
```

## Validacion estructural rapida (sin ejecutar flows)
```powershell
npx playwright test --project=chromium e2e/smoke --list
```

## Reporte y diagnostico
```powershell
npx playwright show-report
```

## Fallas comunes y accion recomendada
- Timeout al levantar `webServer`: usar `BASE_URL` (evita `npm run dev` local)
- Login falla: revisar credenciales smoke / usuario bloqueado / MFA
- Selectores UI fallan: revisar texto visible en produccion y ajustar spec smoke
- M4 falla: desactivar onboarding smoke o usar tenant/usuario aislado

## Evidencia minima para cierre QA
- Fecha/hora de ejecucion
- Comando ejecutado
- Resultado (pass/fail/skip)
- Captura o link a reporte Playwright
- Observaciones (si hubo datos/seed faltantes)

## Nota de seguridad
- No guardar credenciales smoke en archivos versionados
- No ejecutar acciones de shell/admin desde la UI de produccion
- Preferir GitHub Actions para smoke remoto cuando sea posible
