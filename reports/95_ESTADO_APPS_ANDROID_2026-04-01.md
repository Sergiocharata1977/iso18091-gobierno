# Estado Apps Android — Don Cándido

**Última actualización:** 2026-04-03
**Stack:** Kotlin · Jetpack Compose · Room · Retrofit · Hilt · WorkManager

---

## Dos apps en un proyecto

El directorio `android/` contiene **un solo proyecto Gradle** con dos apps distintas,
diferenciadas por flavor de build (`APP_VARIANT`):

| Flavor | Package | Propósito |
|--------|---------|-----------|
| `crm` | `com.doncandido.crm` | App CRM — vendedores internos |
| `operaciones` | `com.doncandido.vendedor` | App Operaciones — personal de campo |

Cada app tiene su propio punto de entrada (`CrmNativeApp` / `OperacionesNativeApp`)
pero comparten toda la infraestructura de base (Room, Retrofit, Hilt, SessionManager).

---

## App CRM (Plan 87 — completado)

### Propósito
Gestión comercial para el equipo de ventas: clientes, oportunidades, acciones CRM.
Acceso desde cualquier lugar con sincronización offline.

### Pantallas implementadas
| Pantalla | Descripción |
|----------|-------------|
| Login | Autenticación Firebase, guarda token + perfil en DataStore |
| Home | KPI cards (acciones pendientes, oportunidades abiertas), badge de cola offline |
| Clientes | Lista paginada con búsqueda, filtro por estado, pull-to-refresh |
| Cliente Detalle | Info completa + historial de acciones |
| Pipeline | Oportunidades agrupadas por etapa, filtro |
| Oportunidad Detalle | Descripción, monto, probabilidad, acciones relacionadas |
| Acciones | Lista con filtros por estado, FAB para nueva acción, diálogo de creación |
| Perfil | Email, rol, orgId, logout con confirmación |

### Arquitectura
```
LoginScreen
└── CrmNativeApp (NavHost raíz)
    ├── LoginScreen
    └── MainScaffold (BottomNav)
        ├── HomeScreen ← HomeViewModel
        ├── ClientesScreen ← ClientesViewModel
        │   └── ClienteDetailScreen
        ├── PipelineScreen ← OportunidadesViewModel
        │   └── OportunidadDetailScreen
        ├── AccionesScreen ← AccionesViewModel
        └── PerfilScreen ← PerfilViewModel
```

### Módulos de dominio
- `ClienteRepository` → `ClienteDao` (Room) + `CrmApiService` (Retrofit)
- `OportunidadRepository` → `OportunidadDao` + API
- `AccionRepository` → `AccionDao` + API
- `AuthRepository` → Firebase Auth + SessionManager

---

## App Operaciones (Plan 88 — completado)

### Propósito
App para personal de campo en concesionarias / dealer: gestiona solicitudes de servicio,
compras, catálogo de productos y mapa de clientes. Diseño offline-first con sync queue.

### Bootstrap y feature flags
Al hacer login, la app llama a `POST /api/mobile/operaciones/bootstrap` que devuelve:
- Perfil operativo del usuario (`canConvertToCrm`, `canManageAssignments`, `canManagePurchases`)
- Feature flags (`featureSolicitudes`, `featureEvidencias`, `featureCompras`, etc.)
- Módulos habilitados para la org (`enabledModules`)
- Info de organización (`orgName`, `integrations.crm.active`)

Todo se persiste en DataStore via `SessionManager`.

### Navegación dinámica
La barra de navegación inferior se construye en runtime desde `enabledModules`:

```
Home (siempre)
├── Solicitudes  — si enabledModules contiene "solicitudes"
├── Compras      — si enabledModules contiene "compras"
├── Catálogo     — si enabledModules contiene "catalogo"
├── Mapa         — si enabledModules contiene "mapa_clientes"
└── Perfil (siempre)
```

### Pantallas implementadas
| Pantalla | Estado |
|----------|--------|
| Login | ✅ |
| Home Operaciones | ✅ KPIs: solicitudes recientes + compras pendientes |
| Solicitudes | ✅ Lista con filtros, pull-to-refresh |
| Solicitud Detalle | ✅ Estado, evidencias, actualización offline |
| Compras | ✅ Lista básica |
| Catálogo | ✅ Productos con búsqueda |
| Mapa Clientes | ✅ Lista clientes en campo |
| Perfil | ✅ Muestra perfil operativo + org desde bootstrap |

### Sistema de sync offline
```
WorkManager → OperacionesSyncWorker → SyncQueueDao → API
```

**SyncQueueEntity campos clave:**
- `status`: `pending` | `processing` | `retry_wait` | `failed` | `conflict` | `blocked`
- `nextAttemptAt`: timestamp para backoff
- `dependsOnQueueId`: encadenamiento de operaciones dependientes
- `maxAttempts`: default 7

**Backoff exponencial:**
- Base: 30 segundos
- Máximo: 1 hora
- Fórmula: `min(30_000 * 2^intentos, 3_600_000)` ms

**FCM → sync:**
`OperationsFirebaseMessagingService` recibe push y dispara `OperacionesSyncScheduler`
para sincronización inmediata cuando hay conectividad.

### Cola de adjuntos
`PendingAttachmentEntity` + `PendingAttachmentDao` gestionan fotos y archivos grandes
de forma independiente a la cola de operaciones:
- `transferState`: `pending` | `uploading` | `ready` | `failed`
- Soporta checksum SHA-256 para verificación de integridad

---

## Base de datos Room compartida

`CrmDatabase` v4 — una sola BD por flavor, nombre: `${APP_VARIANT}_native.db`

| Entidad | Tabla | App |
|---------|-------|-----|
| `ClienteEntity` | `clientes` | CRM |
| `OportunidadEntity` | `oportunidades` | CRM |
| `AccionEntity` | `acciones` | CRM |
| `SolicitudOperacionEntity` | `solicitudes_operacion` | Ops |
| `SolicitudEvidenciaEntity` | `solicitud_evidencias` | Ops |
| `CompraOperacionEntity` | `compras_operacion` | Ops |
| `CatalogoProductoEntity` | `catalogo_productos` | Ops |
| `MapaClienteEntity` | `mapa_clientes` | Ops |
| `SyncQueueEntity` | `sync_queue` | Ambas |
| `PendingAttachmentEntity` | `pending_attachments` | Ops |

---

## APIs BFF (Backend for Frontend)

Todas bajo `/api/mobile/operaciones/`:

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/bootstrap` | Perfil, flags, módulos, integración CRM |
| GET | `/solicitudes` | Lista paginada de solicitudes |
| GET/PATCH | `/solicitudes/[id]` | Detalle y actualización |
| POST | `/solicitudes/[id]/evidencias` | Subir evidencias |
| GET | `/compras` | Lista de compras |
| GET/PATCH | `/compras/[id]` | Detalle y actualización |
| GET | `/compras/estados` | Estados disponibles por perfil |
| GET | `/catalogo` | Catálogo de productos |
| GET | `/mapa/clientes` | Clientes en campo |

---

## Historial de resoluciones (2026-04-03)

### Problema 1 — Apps no arrancaban (Firebase crash)
- **Causa:** faltaba `google-services.json` en `android/app/`
- **Fix:** registradas ambas apps en Firebase Console via CLI (`firebase apps:create`)
- Package CRM: `com.doncandido.vendedor` | Package Ops: `com.doncandido.vendedor.operaciones`
- Firebase project: `app-4b05c`

### Problema 2 — Login fallaba "No se pudo iniciar sesión"
- **Causa 1:** Todos los 40 usuarios en Firebase Auth tenían `providers: []` (sin contraseña configurada)
- **Fix:** script `scripts/set-test-passwords.js` — seteó contraseña `Candido2024!` a usuarios clave
- **Causa 2:** `organization_id` no estaba en los custom claims del token (solo en Firestore)
- **Fix:** script `scripts/fix-user-claims.js` — sincroniza claims desde Firestore (`organization_id` + `rol`)

### Problema 3 — Bootstrap retornaba 401
- **Causa:** `API_BASE_URL = "https://doncandidoia.com/"` → servidor redirige a `www.doncandidoia.com` → OkHttp stripea el `Authorization: Bearer` en el redirect
- **Fix:** `android/app/build.gradle` prod flavor → `"https://www.doncandidoia.com/"`

### Bug — Home mostraba UID en lugar del email
- **Causa:** `HomeViewModel` usaba `sessionManager.userId` en lugar de `sessionManager.userEmail`
- **Fix:** `HomeViewModel.kt` L43: `sessionManager.userEmail.firstOrNull()`

### Íconos diferenciados por flavor
- CRM: fondo azul `#1565C0` + ícono maletín (recursos en `src/crm/res/`)
- Operaciones: fondo naranja `#E65100` + ícono engranaje (recursos en `src/operaciones/res/`)
- Adaptive icons via `mipmap-anydpi-v26/ic_launcher.xml` por flavor

### Rediseño UI — Design System (2026-04-03)
Pantallas rediseñadas para alinear con el design system de la web:

**Paleta:**
- Primario: `#1A2B4A` (navy) — igual que web
- Acento: `#E65100` (naranja CASE/operaciones)
- Fondo: `#F4F5F7` | Cards: blanco con sombra

**Pantallas actualizadas:**
| Pantalla | Cambios |
|----------|---------|
| Login | Ícono tractor en navy, inputs sin borde con fondo gris, botón "Entrar →" navy |
| Home CRM | Saludo grande, 2 KPI cards con iconos, card "Meta Mensual" navy con barra naranja |
| Home Operaciones | Header "PANEL DE OPERACIONES", 4 KPI tiles 2×2, sección "Mi Agenda" |
| Solicitudes | Search sin borde, filter chips (Todas/Pendientes/En Curso/Completadas), cards con StatusPill |

**Componente StatusPill** — badges semánticos:
- `en_campo`/`gestionando` → azul "EN CURSO"
- `recibida`/`en_revision` → ámbar "PENDIENTE"
- `cerrada`/`finalizada` → verde "COMPLETADO"
- `urgente`/`critica` → naranja "URGENTE"

---

## Usuarios de prueba activos

| Email | Contraseña | Org | Rol |
|-------|-----------|-----|-----|
| `cristian@empresa.com` | `Candido2024!` | `org_agrobiciufa` | admin |
| `admin@agrobiciufa.com` | `Candido2024!` | `org_agrobiciufa` | admin |
| `admin@empresa.com` | `Candido2024!` | `org_agrobiciufa` | admin |

La org `org_agrobiciufa` tiene `dealer_solicitudes` instalado (requerido por bootstrap de Operaciones).

---

## Pendientes / próxima ola

- [ ] Cámara nativa para captura de evidencias (actualmente acepta URIs del sistema)
- [ ] Modo offline completo para `SolicitudDetailScreen` (actualización de estado sin red)
- [ ] Push notifications configuradas en FCM dashboard (producción)
- [ ] Tests instrumentados Android (Espresso) — cobertura básica de login + sync
- [ ] `PendingAttachmentWorker` para procesar la cola de adjuntos pendientes (solo está el DAO)
- [ ] Mapa Clientes — HTTP 500 en producción (endpoint `/api/mobile/operaciones/mapa/clientes`)
- [ ] Compras — verificar HTTP 300 (posible redirect en endpoint de compras)
