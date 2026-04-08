# 03 — Seguridad Multi-tenant
**Actualizado:** 2026-03-27

---

## Principio fundamental

Cada tenant (organización) es completamente aislado. Ningún dato de una org puede ser accedido por otra, ni por accidente ni por manipulación de parámetros.

---

## Capas de seguridad

### 1. Middleware global (`src/middleware.ts`)
- Gate por Bearer token o cookie de sesión
- Bloquea toda ruta `/api/*` sin autenticación válida
- Excepción: rutas públicas en `/api/public/*` y `/api/webhooks/*`

### 2. withAuth wrapper (`src/lib/api/withAuth.ts`)
```typescript
// Uso en cada API route:
export const GET = withAuth(async (req, context, auth) => {
  // auth.uid, auth.organizationId disponibles y verificados
}, { roles: ['admin', 'manager'] });
```
- Verifica token Firebase
- Resuelve organizationId del usuario autenticado
- Aplica control de roles (array de roles permitidos)
- NUNCA confiar en `organizationId` del body/query — siempre del auth

### 3. resolveAuthorizedOrganizationId (`src/middleware/verifyOrganization.ts`)
```typescript
// Para super-admin que opera sobre otras orgs:
const orgId = await resolveAuthorizedOrganizationId(auth, params.orgId);
```
- Verifica que el usuario pertenece a la org solicitada
- O que es super-admin operando sobre otra org
- USAR SIEMPRE en rutas que acepten orgId como parámetro

### 4. Firestore Rules (`firestore.rules`)

Funciones helper en las reglas:
```javascript
function belongsToOrganization(orgId) {
  return request.auth.token.organization_id == orgId;
}
function isManager() {
  return request.auth.token.role in ['admin', 'manager'];
}
function isAdmin() {
  return request.auth.token.role == 'admin';
}
```

Patrón en colecciones:
```javascript
match /organizations/{orgId}/{collection}/{docId} {
  allow read: if belongsToOrganization(orgId);
  allow write: if belongsToOrganization(orgId) && isManager();
}
```

### 5. Storage Rules (`storage.rules`)
- L29 verifica `organization_id` en metadata antes de permitir lectura
- Brecha de cross-org read **CERRADA**

---

## Rutas públicas (sin auth de usuario)

| Ruta | Auth | Descripción |
|---|---|---|
| `POST /api/public/solicitudes` | x-tenant-key (API Key por org) | Formulario público dealer |
| `POST /api/public/proveedor-registro` | Sin auth | Registro portal proveedor |
| `GET /api/public/tenant-config/[slug]` | Sin auth | Config pública del tenant |
| `POST /api/webhooks/whatsapp` | HMAC-SHA256 | Webhook WhatsApp Business |

### x-tenant-key (API pública)
- Campo `public_api_key` en `organizations/{orgId}`
- Generado al configurar el portal público del tenant
- Valida que la solicitud corresponde a una org real sin exponer IDs internos

---

## Brechas cerradas

| Brecha | Estado | Solución |
|---|---|---|
| storage.rules cross-org read | CERRADA | L29 verifica organization_id |
| Firestore personnel/trainings sin role guard | CERRADA | isManager() en create |
| service-account.json en repo | SEGURO | Nunca fue commiteado |
| WhatsApp webhook sin HMAC | CERRADA | timingSafeEqual implementado |

---

## Roles del sistema

| Rol | Permisos |
|---|---|
| `admin` | Todo — gestión de org, usuarios, configuración |
| `manager` | Lectura + escritura — sin gestión de usuarios |
| `operario` | Lectura + operaciones propias |
| `super_admin` | Acceso a todas las orgs (solo email @doncandidoia.com) |

---

## Notas de implementación

- **NUNCA** tomar `organizationId` del body o query params sin validación
- **SIEMPRE** usar `auth.organizationId` del token verificado
- Los tests de seguridad deben incluir: cross-org access, role escalation, unauthenticated access
- Skill `/audit-security` disponible para auditar cualquier API route
