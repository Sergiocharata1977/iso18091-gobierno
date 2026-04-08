# ADR 2026-02-14: Modelo de datos v1 unificado productor -> organizaciones -> operaciones

## Estado
Aprobado

## Contexto
El sistema tenia un esquema principalmente single-org en `users.organization_id`.
Se requiere habilitar pertenencia multi-organizacion y un dominio agro operacional consistente.

## Decision
1. Se define un esquema multi-organizacion con:
- `organizations` como entidad canonica de tenant.
- `members` como pertenencia usuario-organizacion con `status` y `role`.
- `users` conserva `organization_id` por compatibilidad y agrega:
  - `default_organization_id`
  - `active_organization_id`
  - `organization_ids`

2. Se agregan colecciones de dominio:
- `field_logbooks`
- `treatments`
- `irrigation_plans`
- `subplots`
- `sensor_readings`
- `profitability_snapshots`

3. Se implementa contrato API unificado en:
- `GET|POST /api/agro/[collection]`
- `GET|PATCH|DELETE /api/agro/[collection]/[id]`
con validacion `zod` por coleccion y enforcement de `organization_id`.

4. Se incorpora migracion y seed ejecutables:
- `npm run migrate:agro-v1`
- `npm run seed:agro-v1`

## Consecuencias
### Positivas
- Multi-org operativo sin romper rutas existentes.
- Contratos de entrada consistentes para las 6 colecciones agro.
- Reglas Firestore cubren `members` y dominio agro v1.

### Costos
- `withAuth` ahora consulta `members` para resolver organizaciones disponibles.
- Requiere mantener sincronia entre rol en `users` y rol en `members`.

### Riesgos controlados
- Compatibilidad legacy mantenida via `organization_id`.
- Scripts son idempotentes con `set(..., { merge: true })`.

## Alternativas consideradas
1. Mantener solo `users.organization_id`.
Rechazada: no habilita pertenencia real multi-org.

2. Subcolecciones por organizacion (`organizations/{orgId}/...`) para todo el dominio.
Rechazada para v1: mayor costo de migracion y cambios transversales.

## Plan de evolucion
1. Migrar gradualmente endpoints legacy para leer `active_organization_id`.
2. Incorporar switch explicito de organizacion activa en frontend.
3. Endurecer reglas para administracion de `members` por rol owner/admin de organizacion.
