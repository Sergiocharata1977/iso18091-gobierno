# Tests E2E - Guía de Uso

## Comandos Disponibles

| Comando                    | Entorno                | Descripción                       |
| -------------------------- | ---------------------- | --------------------------------- |
| `npm run test:e2e`         | Local (localhost:3000) | Tests contra dev server local     |
| `npm run test:e2e:ui`      | Local                  | Con interfaz gráfica Playwright   |
| `npm run test:e2e:headed`  | Local                  | Ver navegador mientras corre      |
| `npm run test:e2e:prod`    | **Producción**         | Tests contra www.doncandidoia.com |
| `npm run test:e2e:prod:ui` | Producción             | Con UI gráfica en producción      |

## Testing en Producción

Para testear contra el servidor de producción:

```bash
npm run test:e2e:prod
```

### Requisitos

- Usuario de test válido en Firebase Auth
- Conexión a internet

### Variables de Entorno

Los tests usan estas variables (en `e2e/modules/core-modules.spec.ts`):

- `TEST_EMAIL`: Email del usuario de test (default: `admin@test.com`)
- `TEST_PASSWORD`: Contraseña (default: `Test123456`)

Para usar credenciales diferentes:

```bash
$env:TEST_EMAIL="miusuario@email.com"; $env:TEST_PASSWORD="mipassword"; npm run test:e2e:prod
```

## Testing Local

```bash
# Inicia dev server automáticamente
npm run test:e2e

# Con interfaz gráfica
npm run test:e2e:ui
```

## Estructura de Tests

```
e2e/
├── auth/
│   ├── login.spec.ts       # Login flow
│   └── register.spec.ts    # Registro
├── documents/
│   └── create-document.spec.ts
├── modules/
│   └── core-modules.spec.ts  # Dashboard, RRHH, Procesos, Mi SGC
├── organizations/
│   ├── create-organization.spec.ts
│   └── organization-user-flow.spec.ts
├── users/
│   ├── create-user.spec.ts
│   └── modulos-habilitados.spec.ts
└── ia/
    └── context-isolation.spec.ts
```

## Tips

1. **Correr solo un archivo**:

   ```bash
   npx playwright test e2e/auth/login.spec.ts
   ```

2. **Correr tests en paralelo**:

   ```bash
   npx playwright test --workers=4
   ```

3. **Ver reporte HTML**:
   ```bash
   npx playwright show-report
   ```

## Smoke Suite PR (Chromium)

### Convencion

- Archivos smoke usan el naming `*.smoke.spec.ts`
- Ubicacion recomendada: `e2e/smoke/`
- Los tests smoke tambien incluyen `@smoke` en el titulo para filtrar por `--grep` si hace falta

### Suite actual (PR)

- `e2e/smoke/01-auth-login.smoke.spec.ts` (M1 login basico)
- `e2e/smoke/02-mi-sgc-navigation.smoke.spec.ts` (M2 acceso/navegacion Mi SGC)
- `e2e/smoke/03-onboarding-critical.smoke.spec.ts` (M4 onboarding critico, condicional)
- `e2e/smoke/04-mi-panel-minimal.smoke.spec.ts` (M5 mi-panel flujo minimo)

### Ejecutar smoke en Chromium

```bash
npx playwright test --project=chromium e2e/smoke
```

Si no tienes un dev server local en `http://localhost:3000`, define `BASE_URL` (por ejemplo produccion):

```bash
$env:BASE_URL="https://www.doncandidoia.com"; npx playwright test --project=chromium e2e/smoke
```

Opcional por tag:

```bash
npx playwright test --project=chromium --grep @smoke e2e/smoke
```

## Credenciales y Seeds para Smoke

### Usuario smoke con organizacion (obligatorio)

Usado por M1/M2/M5.

- `E2E_SMOKE_USER_EMAIL` (fallback: `TEST_EMAIL`, luego `e2e-test@doncandidoia.com`)
- `E2E_SMOKE_USER_PASSWORD` (alias soportado: `E2E_SMOKE_PASSWORD`; fallback: `TEST_PASSWORD`, luego `E2eTest2024!`)

Requisitos del usuario:

- Puede iniciar sesion en `/login`
- Tiene `organization_id` asignado
- Tiene acceso al shell principal y a `/mi-sgc`
- Puede abrir `/mi-panel` (aunque tenga estados vacios)

### Usuario onboarding (opcional / condicional)

Usado por M4. El smoke de onboarding se salta por defecto.

- `E2E_SMOKE_ONBOARDING_ENABLED=true`
- `E2E_ONBOARDING_USER_EMAIL`
- `E2E_ONBOARDING_USER_PASSWORD`

Requisitos del usuario onboarding:

- Puede iniciar sesion
- No tiene `organization_id` (debe redirigir a `/onboarding`)
- Tiene acceso al wizard federado
- El smoke solo avanza hasta el resumen y **no** ejecuta provision (no hace cambios persistentes)

## Estabilidad / Flakiness (criterios smoke)

- Evitar `waitForLoadState('networkidle')` en pantallas con listeners realtime o polling
- Preferir `waitForURL(...)` + `expect(...)` sobre headings/roles/acciones funcionales
- Evitar `page.click('text=...')` cuando existe selector semantico (`getByRole`, labels, ids)
- Para login, aceptar rutas post-auth validas (`/mi-panel`, `/noticias`, `/dashboard`, `/super-admin`, `/onboarding`) segun perfil
