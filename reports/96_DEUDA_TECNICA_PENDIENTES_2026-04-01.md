# Deuda Tecnica y Pendientes - Don Candido IA

**Ultima actualizacion:** 2026-04-02
**Proposito:** Registro vivo de pendientes, deuda tecnica y proximas iteraciones.
Actualizar en cada sesion que cierre o abra items.

---

## Prioridad ALTA - Bloquean valor real en produccion

### 1. PendingAttachmentWorker Android (App Operaciones)
**Que falta:** El DAO y la entidad `PendingAttachmentEntity` existen, pero no hay ningun `CoroutineWorker` que procese la cola. Si un usuario de campo adjunta una foto a una solicitud, se encola en Room pero nunca se sube.
**Archivo de referencia:** `android/.../data/local/dao/PendingAttachmentDao.kt`
**Estimacion:** Ola de 1 agente, ~1 sesion.
**Pasos sugeridos:**
- Crear `PendingAttachmentWorker` (similar a `OperacionesSyncWorker`)
- Leer `getOpenItems(orgId)`, subir a Storage o API y actualizar `transferState`
- Registrar en `OperacionesSyncScheduler` o WorkManager con constraint `UNMETERED` opcional

### 2. Tests IA + Sentinel (Plan 08)
**Que falta:** El plan en `08_PLAN_TESTING_IA_SENTINEL_2026-03-27.md` nunca se ejecuto. Los diferenciales clave del producto no tienen tests de integracion consistentes.
**Riesgo:** Regresiones silenciosas en los diferenciales mas criticos del pitch.
**Pasos sugeridos:**
- Ejecutar el plan 08 completo
- Priorizar `DirectActionService`, `AgentWorkerService` y webhook WhatsApp

### 3. WhatsApp webhook produccion
**Que falta:** El webhook esta implementado con HMAC pero no esta configurado en Meta Developer Console ni en produccion.
**Variables de entorno pendientes:**
```text
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_PHONE_NUMBER_ID=
```
**Impacto:** El plugin `crm_whatsapp_inbox` no puede recibir mensajes reales.

---

## Prioridad MEDIA - Deuda tecnica que crece con el tiempo

### 4. iso_audit_19011 - UI completamente en stub
**Que hay:** Manifest formal + tipos TypeScript.
**Que falta:** Toda la UI, APIs y logica de negocio del modulo ISO 19011 (Programa de Auditorias).
**Por que importa:** Es el unico plugin ISO vendido sin implementacion real.
**Estimacion:** 2-3 olas de agentes, modulo mediano.

### 5. Tests instrumentados Android (Espresso / UI tests)
**Que hay:** Zero tests en `android/`.
**Que falta:** Tests basicos de login, navegacion y sync.
**Por que importa:** Cualquier cambio de Room o Hilt puede romper la app silenciosamente.

### 6. MEMORY.md supera el limite de 200 lineas
**Estado actual:** sigue excediendo el tamaño recomendado y se trunca contexto en sesiones largas.
**Solucion:** Mover detalle a archivos tematicos y dejar `MEMORY.md` como indice conciso.

### 7. Contabilidad - UI solo lectura, sin entrada manual
**Que hay:** Motor event-driven completo, asientos automaticos y plan de cuentas ARG.
**Que falta:** Pantalla de registro de asiento manual e informes exportables.
**Plan:** Ver `79_PLAN_MAESTRO_NORMAS_Y_CONTABILIDAD_2026-03-26.md`.

### 8. Analisis Estrategico IA - falta cerrar Ola 6
**Que hay:** Olas 4 y 5 implementadas. Existen rutas propias, widget en `mi-panel`, bridge a `DirectActionService` y base para revision por la direccion.
**Que falta:** comparativa historica rica, tendencias, scoring historico, filtros por audiencia `role/person`, observabilidad y tests de regresion.
**Referencia:** `97_ESTADO_ANALISIS_ESTRATEGICO_IA_2026-04-02.md`
**Impacto:** El MVP es usable, pero todavia no esta cerrado el diferencial premium del modulo.

---

## Prioridad BAJA - Mejoras y deuda menor

### 9. `ContextHelpButton` sin integrar en pantallas clave
Falta en onboarding, procesos, auditorias y CRM. La adopcion sigue incompleta.

### 10. Nosis - solo en produccion, sin sandbox/mock
El scoring crediticio llama a Nosis en produccion y no hay mock serio para desarrollo local.

### 11. Dashboard metricas de producto en super-admin
No existe una vista de metricas de uso por organizacion (MAU, features mas usadas, errores).

### 12. 79_PLAN_MAESTRO_NORMAS_Y_CONTABILIDAD - convertir a roadmap ejecutivo
Conviene sintetizar el documento en una tabla de estado de cada norma pendiente con esfuerzo estimado y prioridad.

### 13. Indice `reports/` - mantener maximo 15 archivos activos
Al cerrar cada plan, moverlo a `archive/` en el mismo commit del cierre.

---

## Proximas olas sugeridas

| Prioridad | Ola sugerida | Descripcion |
|-----------|--------------|-------------|
| 1 | Ola unica | `PendingAttachmentWorker` Android |
| 2 | Plan 08 | Tests IA + Sentinel |
| 3 | Config | WhatsApp webhook produccion |
| 4 | Plan nuevo | iso_audit_19011 UI real |
| 5 | Ola 6 plan 89 | Analisis Estrategico IA - comparativa historica + hardening |
| 6 | Plan nuevo | Contabilidad - entrada manual + informes exportables |

---

## Historial de cierre de items

| Fecha | Item cerrado |
|-------|-------------|
| 2026-04-02 | Plan 89 - Olas 4 y 5 de Analisis Estrategico IA |
| 2026-04-01 | Plan 92 - Registro Centralizado de Acciones |
| 2026-04-01 | Plan 88 - App Android Operaciones |
| 2026-04-01 | Plan 87 - App Android CRM |
| 2026-03-30 | Plan 85/86 - Onboarding + Facturacion |
| 2026-03-29 | Plan 84 - Centro Agentico UI |
