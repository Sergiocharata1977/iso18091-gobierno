# 01 — Estado Actual de Módulos
**Actualizado:** 2026-04-01

---

## CORE BASE (siempre incluido — sin plugin)

| Módulo | Estado | Notas |
|---|---|---|
| ISO 9001 — Procesos | ALTO | CRUD completo, kanbans dinámicos |
| ISO 9001 — Auditorías | ALTO | Integrado con Hallazgos y Acciones |
| ISO 9001 — Hallazgos | ALTO | Kanban dinámico activo |
| ISO 9001 — Acciones Correctivas | ALTO | Vinculadas a hallazgos y procesos |
| ISO 9001 — Documentos | ALTO | Control de versiones, flujo de aprobación |
| ISO 9001 — RRHH / Personal | ALTO | Personal, capacitaciones, puestos, organigrama |
| Mi SGC (dashboard personal) | ALTO | Cumplimiento, tareas, accesos rápidos |
| Panel Ejecutivo | ALTO | KPIs multi-módulo, métricas de cumplimiento |
| Mi Panel (asignaciones) | ALTO | Vista unificada de procesos, objetivos, indicadores |
| IA — Don Cándido | ALTO | UnifiedConverseService, 3 adapters, conoce capabilities |
| Onboarding federado | MEDIO-ALTO | Guards de fase, recover endpoint, wizard completo |
| Revisiones Periódicas | ALTO | CRUD completo + UI |
| Kanbans dinámicos | ALTO | Columnas configurables por API en 7 módulos |
| **Registro Central de Acciones** | **ALTO** | `system_activity_log` — append-only, filtros, CSV, nav link |

---

## PLUGINS OPCIONALES

### Gestión Comercial

| Plugin | ID | Estado | Scopes |
|---|---|---|---|
| CRM Comercial B2B | `crm` | ALTO | crm:read/write/admin |
| Scoring crediticio | `crm_risk_scoring` | MEDIO | crm_scoring:read/write |
| WhatsApp Inbox | `crm_whatsapp_inbox` | ALTO | wa_inbox:read/write/admin |
| Dealer / Solicitudes | `dealer_solicitudes` | MEDIO-ALTO | dealer:read/write/admin |

### Normas ISO

| Plugin | ID | Estado | Notas |
|---|---|---|---|
| ISO 7.1.3 Infraestructura | `iso_infrastructure` | MEDIO | Manifest + tipos. UI parcial |
| ISO 8.3 Diseño y Desarrollo | `iso_design_development` | MEDIO | Manifest + tipos. UI parcial |
| ISO 14001 Gestión Ambiental | `iso_environment_14001` | MEDIO | Manifest. Rutas en HSE |
| ISO 45001 SST | `iso_sst_45001` | MEDIO | Manifest. Rutas en HSE |
| PTW Permiso de Trabajo | `ptw_seguridad` | MEDIO | Requiere iso_sst_45001 |
| ISO 19011 Programa de Auditorías | `iso_audit_19011` | BAJO* | UI = stub. DIFERIDO |
| ISO 27001 SGSI | `iso_sgsi_27001` | MEDIO | Dashboard + activos + riesgos + SOA + controles |

*iso_audit_19011 es la deuda técnica más importante del bloque ISO

### Gestión Económica

| Plugin | ID | Estado | Notas |
|---|---|---|---|
| Contabilidad Doble Partida | `contabilidad_central` | MEDIO-ALTO | Motor event-driven. UI read-only. Seed ARG |

### Otros

| Plugin | ID | Estado | Notas |
|---|---|---|---|
| Openclaw | `openclaw` | MEDIO | Admin page. Integración pendiente de definición |

---

## BUNDLES COMERCIALES

| Bundle | ID | Incluye |
|---|---|---|
| Pack HSE | `pack_hse` | iso_environment_14001 + iso_sst_45001 + ptw_seguridad |
| Pack SGSI Plus | `pack_sgsi_plus` | iso_sgsi_27001 + extras futuros |
| Pack SIG Integrado | `pack_sig_integrado` | 14001 + 45001 + 27001 + 19011 |

---

## APPS ANDROID NATIVAS

Ver detalle completo en `95_ESTADO_APPS_ANDROID_2026-04-01.md`.

| App | Flavor | Estado | Stack |
|---|---|---|---|
| **App CRM** | `crm` | **ALTO** | Login · Clientes · Pipeline · Acciones · Perfil · offline sync |
| **App Operaciones** | `operaciones` | **ALTO** | Bootstrap · Solicitudes · Compras · Catálogo · Mapa · sync queue + FCM |

**Base de datos Room compartida:** `CrmDatabase` v4 — 10 entidades.

**APIs BFF activas:**
- `/api/mobile/operaciones/bootstrap` — perfil, flags, módulos habilitados
- `/api/mobile/operaciones/solicitudes` — CRUD + evidencias
- `/api/mobile/operaciones/compras` — lista, detalle, estados
- `/api/mobile/operaciones/catalogo` — productos
- `/api/mobile/operaciones/mapa/clientes` — clientes en campo

---

## PORTALES PÚBLICOS

| Portal | Estado | Ruta |
|---|---|---|
| Portal Proveedor | ALTO | `/p/[slug]/proveedor` |
| Portal Cliente mobile | ALTO | App mobile con MobileNav, encuestas NPS |
| Landing Solicitudes Dealer | ALTO | `POST /api/public/solicitudes` + x-tenant-key |
| Portal multi-tenant | ALTO | CSS vars por tenant, cache 5min |

---

## INFRAESTRUCTURA TÉCNICA

| Componente | Estado | Archivo clave |
|---|---|---|
| withAuth wrapper | ALTO | `src/lib/api/withAuth.ts` |
| resolveAuthorizedOrganizationId | ALTO | `src/middleware/verifyOrganization.ts` |
| Plugin manifests | ALTO | `src/config/plugins/index.ts` (14 manifests) |
| Firestore rules | ALTO | `firestore.rules` |
| **system_activity_log** | **ALTO** | Colección inmutable. Integrada en 4 servicios. CSV export |
| PostHog analytics | MEDIO-ALTO | `src/lib/analytics/events.ts` |
| Sentry (server/client/edge) | ALTO | triple config activa |
| CI GitHub Actions | MEDIO-ALTO | build + lint |
| Android (Kotlin/Compose) | ALTO | `android/` — 2 flavors, Room v4, WorkManager sync |
