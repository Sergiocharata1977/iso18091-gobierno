# Migracion onboarding/billing post-federado

## Objetivo

Inventariar la deuda heredada que impide que onboarding y billing queden gobernados por organizacion y no por usuario individual. Esta migracion no modifica datos automaticamente: define el alcance, el backfill esperado y el plan de rollback antes de mover enforcement o UI.

## Deuda detectada

### 1. Billing sigue siendo user-centrico

- `src/app/api/billing/mobbex/subscribe/route.ts` inicia el checkout usando `auth.uid` y genera una referencia `sub_${userId}_${timestamp}`.
- `src/services/billing/MobbexService.ts` parsea el webhook extrayendo `userId` desde la referencia, no `organization_id`.
- `src/app/api/billing/mobbex/webhook/route.ts` actualiza `users/{userId}` con `planType`, `billing_status`, `mobbex_transaction_id`, `next_billing_date` y `expirationDate`.
- No hay flujo activo que persista la fuente de verdad comercial en `organizations/{orgId}/meta/billing`.

### 2. Onboarding ya es org-centrico, pero convive con compatibilidad legacy

- `src/services/onboarding/OrganizationOnboardingService.ts` usa `organizations/{orgId}/meta/onboarding`.
- `src/app/api/onboarding/contracted-systems/route.ts` ya exige `organization_id` efectivo y lee `organizations/{orgId}/contracted_systems`.
- Aun existe compatibilidad transitoria: si no hay `contracted_systems`, el endpoint devuelve un sistema ISO por defecto. Eso oculta deuda real de configuracion.

### 3. Existen parches manuales de asignacion de organizacion

- `src/app/api/users/fix-organization/route.ts` asigna masivamente `organization_id` hardcodeado a usuarios sin organizacion.
- `src/lib/organization.ts` todavia resuelve organizacion leyendo `users/{userId}` y contempla usuarios sin `organization_id`.
- `src/services/auth/UserService.ts` permite crear usuarios con `organization_id` nulo y conserva campos legacy de plan en el documento de usuario.

### 4. La semantica comercial esta duplicada

- `users.planType` y `users.billing_status` siguen operativos.
- Algunas organizaciones tienen `plan` a nivel root, pero onboarding ya vive en `meta/onboarding` y billing objetivo debe vivir en `meta/billing`.
- Mientras no exista backfill consistente, el sistema puede mostrar acceso comercial distinto segun lea usuario, organizacion root o meta.

## Colecciones afectadas

- `users`
  - Campos legacy involucrados: `organization_id`, `planType`, `billing_status`, `mobbex_transaction_id`, `mobbex_subscription_id`, `next_billing_date`, `expirationDate`, `last_payment_error`.
- `organizations`
  - Campos root hoy usados como apoyo o defaults: `plan`, `settings`, `features`.
- `organizations/{orgId}/meta/onboarding`
  - Fuente de verdad actual del estado de onboarding por organizacion.
- `organizations/{orgId}/meta/billing`
  - Fuente de verdad objetivo para estado comercial y facturacion por organizacion.
- `organizations/{orgId}/contracted_systems`
  - Fuente de verdad de sistemas contratados por organizacion.
- `webhook_receipts`
  - Debe empezar a registrar `organization_id` cuando el webhook sea org-centrico.

## Backfill necesario

### Paso 1. Inventario

- Ejecutar `scripts/audit-onboarding-billing-legacy.ts`.
- Medir:
  - usuarios sin `organization_id`
  - usuarios apuntando a organizaciones inexistentes
  - organizaciones sin `meta/onboarding`
  - organizaciones sin `meta/billing`
  - usuarios con `planType` o `billing_status` inconsistente contra billing de org

### Paso 2. Normalizacion de ownership

- Resolver todos los usuarios sin `organization_id` antes de endurecer middleware o flujos comerciales.
- Eliminar la necesidad operativa de `POST /api/users/fix-organization`.

### Paso 3. Backfill de onboarding por organizacion

- Para cada organizacion sin `meta/onboarding`, crear `organizations/{orgId}/meta/onboarding` con:
  - `organization_id`
  - `system_id`
  - `onboarding_phase`
  - `owner`
  - timestamps
- Donde hoy el sistema opera por defecto, persistir el estado real en vez de depender del fallback del endpoint.

### Paso 4. Backfill de billing por organizacion

- Crear `organizations/{orgId}/meta/billing` con un contrato minimo:
  - `plan_type`
  - `billing_status`
  - `provider`
  - `provider_customer_ref`
  - `provider_subscription_ref`
  - `last_transaction_id`
  - `next_billing_date`
  - `updated_at`
- Migrar la referencia de Mobbex para incluir `organization_id` como identificador principal.
- Mantener `users.planType` y `users.billing_status` solo como espejo transitorio mientras se completa rollout.

### Paso 5. Verificacion y corte

- Actualizar APIs de subscribe/webhook para leer y escribir billing en org.
- Mantener doble escritura durante una ventana de rollout controlada.
- Una vez que auditoria y monitoreo den limpio, retirar lecturas legacy desde `users`.

## Flags legacy a eliminar luego

- Fallback de `src/app/api/onboarding/contracted-systems/route.ts` que devuelve ISO por defecto sin configuracion persistida.
- Endpoint/parche `src/app/api/users/fix-organization/route.ts`.
- Escritura directa de billing en `users` desde `src/app/api/billing/mobbex/webhook/route.ts`.
- Dependencia de `planType` y `billing_status` del usuario como fuente de verdad.
- Referencia Mobbex basada en `userId` en `src/services/billing/MobbexService.ts`.

## Riesgos de corte

- Un usuario puede quedar activo por `users.planType` aunque la organizacion no tenga `meta/billing`.
- Un webhook puede acreditar el pago al usuario correcto pero a la organizacion equivocada si luego hay reasignacion de `organization_id`.
- El fallback de onboarding puede ocultar tenants incompletos y producir falsos positivos de provisionamiento.
- Los parches manuales de organizacion pueden enmascarar datos heredados que reaparecen al endurecer enforcement.
- Si se elimina demasiado pronto la lectura legacy, usuarios ya aprobados pueden perder acceso hasta completar backfill.

## Estrategia de rollout

1. Ejecutar auditoria y guardar baseline.
2. Backfill de `meta/onboarding` y `meta/billing` sin tocar UI.
3. Introducir doble escritura en billing org + user.
4. Cambiar lecturas de negocio para priorizar `organizations/{orgId}/meta/billing`.
5. Monitorear diferencias.
6. Retirar compatibilidad legacy.

## Estrategia de rollback

- No borrar `users.planType` ni `users.billing_status` durante la primera ola.
- Mantener snapshots exportables de `users`, `organizations`, `organizations/{orgId}/meta/onboarding` y `organizations/{orgId}/meta/billing`.
- Si falla el rollout:
  - restaurar lecturas desde `users`
  - pausar doble escritura org-centrica
  - conservar auditoria y diff de inconsistencias para reintento controlado

## Comando de auditoria

```bash
npx tsx scripts/audit-onboarding-billing-legacy.ts
```

Opcionalmente:

```bash
npx tsx scripts/audit-onboarding-billing-legacy.ts --json
```
