# Rollout — System Activity Log (Plan 92)

**Fecha:** 2026-03-31
**Estado:** Listo para producción

---

## Qué se hizo

Sistema de log centralizado, append-only e inmutable. Registra todas las acciones de sistema, usuario, IA y terminal en la colección `system_activity_log` con org scoping estricto.

### Componentes entregados

| Componente | Ruta | Estado |
|---|---|---|
| Tipos canónicos | `src/types/system-activity-log.ts` | ✅ |
| Validaciones Zod | `src/lib/validations/systemActivityLog.ts` | ✅ |
| Servicio principal | `src/services/system/SystemActivityLogService.ts` | ✅ |
| API de consulta | `src/app/api/admin/system-activity-log/route.ts` | ✅ |
| UI admin | `src/app/(dashboard)/admin/registro-central/page.tsx` | ✅ |
| Tests servicio | `src/__tests__/services/SystemActivityLogService.test.ts` | ✅ |
| Tests API | `src/__tests__/api/system-activity-log.route.test.ts` | ✅ |
| Script backfill | `scripts/backfill-system-activity-log.ts` | ✅ |

### Integraciones activas (emit)

| Módulo | Archivo | Qué emite |
|---|---|---|
| Auditorías ISO | `src/services/audit/AuditLogService.ts` | Creación y cambios de auditoría y hallazgos |
| Acciones IA directas | `src/services/direct-actions/DirectActionService.ts` | Solicitudes, confirmaciones, ejecuciones y rechazos de acciones IA |
| Capabilities | `src/services/plugins/CapabilityService.ts` | Instalar, habilitar, deshabilitar, desinstalar capabilities |
| Terminal / Sentinel | `src/app/api/agent/action/log/route.ts` | Tool executions y herramientas bloqueadas |
| Contabilidad (períodos) | `src/lib/accounting/periods.ts` | Apertura y cierre de períodos contables |
| Contabilidad (asientos) | `src/lib/accounting/repositories/entries.ts` | Creación, confirmación y anulación de asientos |

---

## Reglas Firestore

La colección `system_activity_log` debe ser append-only. La regla en `firestore.rules` garantiza:
- `create`: solo usuarios autenticados de la misma organización
- `update` / `delete`: **denegado siempre**
- `read`: solo admins, gerentes, auditores y super_admin de la misma org

```
match /system_activity_log/{logId} {
  allow read: if isAuthenticated() && belongsToOrganization(resource.data.organization_id)
              && (isAdmin() || isManager() || isRole('auditor') || isSuperAdmin());
  allow create: if isAuthenticated() && belongsToOrganization(request.resource.data.organization_id);
  allow update, delete: if false;
}
```

Verificar que esta regla esté presente en `firestore.rules` antes de desplegar.

---

## Índices Firestore

Estos índices deben existir en `firestore.indexes.json`:

```json
{
  "collectionGroup": "system_activity_log",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "organization_id", "order": "ASCENDING" },
    { "fieldPath": "recorded_at", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "system_activity_log",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "organization_id", "order": "ASCENDING" },
    { "fieldPath": "source_module", "order": "ASCENDING" },
    { "fieldPath": "recorded_at", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "system_activity_log",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "organization_id", "order": "ASCENDING" },
    { "fieldPath": "entity_type", "order": "ASCENDING" },
    { "fieldPath": "entity_id", "order": "ASCENDING" },
    { "fieldPath": "recorded_at", "order": "DESCENDING" }
  ]
}
```

---

## Pasos de rollout

### Paso 1 — Desplegar reglas e índices

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Esperar a que los índices estén en estado `READY` antes de continuar.

### Paso 2 — Deploy de la app

```bash
npm run build
# Verificar que build pase sin errores TypeScript
npx tsc --noEmit
```

La API `/api/admin/system-activity-log` es parte del build normal de Next.js, no requiere steps adicionales.

### Paso 3 — Verificación rápida en producción

1. Abrir la app como admin
2. Navegar a `/admin/registro-central`
3. Confirmar que la tabla carga (puede estar vacía si no hubo actividad aún)
4. Ejecutar una acción (ej: cerrar un hallazgo de auditoría)
5. Refrescar la tabla — debe aparecer el nuevo evento en segundos

### Paso 4 — Backfill opcional (historial previo)

Solo ejecutar si se quiere retroalimentar el log con datos históricos de `acc_audit_log` y `terminal_action_log`.

```bash
# Dry run primero — solo imprime, no escribe
npx tsx scripts/backfill-system-activity-log.ts --dry-run

# Dry run para una org específica
npx tsx scripts/backfill-system-activity-log.ts --dry-run --org <orgId>

# Ejecución real con límite conservador
npx tsx scripts/backfill-system-activity-log.ts --org <orgId> --limit 200

# Sin filtro de org (todas las orgs) — usar con cuidado
npx tsx scripts/backfill-system-activity-log.ts --limit 500
```

El script marca todos los registros con `metadata.backfill: true` para identificarlos.

---

## Consideraciones de volumen

- La colección crece de forma append-only. Calcular ~50-200 documentos/día por org activa.
- Los índices compuestos son necesarios para consultas con filtros.
- La UI por defecto muestra los últimos 7 días con límite de 100 registros. Ajustable desde filtros.
- Para orgs con alto volumen (>10K eventos/mes), considerar una TTL policy o archivado a BigQuery en el futuro.

---

## Rollback

No hay rollback de datos del log (es inmutable por diseño). Si hay un bug en el servicio que genera ruido:
1. Deshabilitar la integración específica comentando la llamada a `SystemActivityLogService.log()` en el archivo del módulo afectado.
2. Desplegar hotfix.
3. Los registros erróneos quedan pero están marcados — se pueden filtrar por `source_module`.
