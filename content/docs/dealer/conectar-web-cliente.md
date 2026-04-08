---
title: "Conectar una web cliente a Don Cándido IA"
module: "dealer"
category: "tecnico"
slug: "dealer/conectar-web-cliente"
tags: ["dealer", "tenant", "api-publica", "integracion"]
order: 40
status: "active"
---

# Conectar una web cliente a Don Cándido IA

Cualquier cliente de Don Cándido IA puede tener su propia web pública conectada al backoffice. La web captura solicitudes, muestra catálogos y permite a los clientes finales seguir sus pedidos. Todo sin base de datos propia — todo vive en Don Cándido.

## Cómo funciona

Cada cliente tiene un `tenant_slug` único (ej: `agrobiciufa`). La web lo usa para identificarse en todas las llamadas a la API. Don Cándido resuelve a qué organización pertenece y devuelve solo sus datos.

```
Web del cliente (Next.js, cualquier framework)
  NEXT_PUBLIC_TENANT_SLUG=agrobiciufa
  NEXT_PUBLIC_9001APP_URL=https://doncandidoia.com
  └─ GET /api/public/org/agrobiciufa     → nombre, color, logo
  └─ GET /api/public/productos?tenant=agrobiciufa
  └─ POST /api/public/solicitudes        → body incluye tenant_slug
  └─ Login Firebase → GET /api/public/solicitudes/mias
```

## Paso 1 — Crear la organización en Firestore

En Firebase Console → Firestore → colección `organizations`:

```
Documento ID: org_{slug}   (ej: org_agrobiciufa)

{
  nombre: "Nombre del cliente SRL",
  slug: "agrobiciufa",         ← minúsculas, sin espacios, único
  activo: true,
  color_primario: "#dc2626",   ← color principal para la web
  logo_url: null,              ← URL de imagen o null
  whatsapp_notificaciones_dealer: "+549XXXXXXXXXX"
}
```

Luego activar la capability:

```
organizations/org_{slug}/capabilities/dealer_solicitudes
{
  activo: true,
  installedAt: [timestamp]
}
```

## Paso 2 — Variables de entorno en Vercel (web del cliente)

```bash
NEXT_PUBLIC_TENANT_SLUG=agrobiciufa
NEXT_PUBLIC_9001APP_URL=https://doncandidoia.com

# Firebase — mismo proyecto que Don Cándido (para que el login funcione)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## APIs públicas disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/public/org/{slug}` | Config visual de la org (nombre, color, logo, features activas) |
| `GET` | `/api/public/productos?tenant={slug}` | Catálogo de productos activos |
| `POST` | `/api/public/solicitudes` | Crear solicitud (incluir `tenant_slug` en el body) |
| `GET` | `/api/public/solicitudes/mias` | Solicitudes del cliente autenticado |

## Tipos de solicitud soportados

```typescript
// Repuesto de maquinaria
{
  tipo: "repuesto",
  tenant_slug: "agrobiciufa",
  nombre, telefono, email,
  maquina_tipo, modelo, numero_serie?,
  descripcion_repuesto
}

// Servicio técnico
{
  tipo: "servicio",
  tenant_slug: "agrobiciufa",
  nombre, telefono, email,
  maquina_tipo, modelo, numero_serie?,
  descripcion_problema, localidad, provincia
}

// Consulta comercial
{
  tipo: "comercial",
  tenant_slug: "agrobiciufa",
  nombre, telefono, email,
  producto_interes, requiere_financiacion, comentarios
}
```

## Portal del cliente (mis solicitudes)

Para que el cliente pueda ver sus solicitudes desde la web:

1. La web usa Firebase Auth del **mismo proyecto** que Don Cándido
2. El usuario se registra/loguea con email y password
3. La web obtiene el `idToken` de Firebase
4. Lo envía en el header: `Authorization: Bearer {idToken}`
5. `GET /api/public/solicitudes/mias` devuelve las solicitudes del email del token

## Seguridad anti-spam (obligatorio en el formulario)

```html
<!-- Campo honeypot — debe estar oculto y VACÍO -->
<input name="website" type="text" style="display:none" value="" />
```

```typescript
// Timestamp al montar el formulario — detecta bots que envían muy rápido
form_started_at: Date.now()
```

## Prompt para la IA que desarrolle la web

Copiar y pegar este prompt al iniciar el desarrollo de una nueva web cliente:

```
Estás desarrollando la web pública del cliente [NOMBRE_CLIENTE].
Usa Don Cándido IA (doncandidoia.com) como backoffice.

VARIABLES DE ENTORNO:
  NEXT_PUBLIC_TENANT_SLUG=[slug]
  NEXT_PUBLIC_9001APP_URL=https://doncandidoia.com
  NEXT_PUBLIC_FIREBASE_* → variables del Firebase de Don Cándido

APIS:
  GET  /api/public/org/{slug}             → carga config visual al iniciar
  GET  /api/public/productos?tenant={slug} → catálogo de productos
  POST /api/public/solicitudes             → body con tenant_slug + datos del form
  GET  /api/public/solicitudes/mias        → portal cliente (requiere Firebase idToken)

SEGURIDAD:
  - Campo honeypot: name="website", oculto, vacío
  - Campo anti-bot: form_started_at = Date.now() al montar el form
  - Rate limit: 12 solicitudes/hora por IP para el form, 50/hora para catálogo

PORTAL CLIENTE:
  - Firebase Auth del mismo proyecto que Don Cándido
  - Login con email/password
  - GET /api/public/solicitudes/mias con Authorization: Bearer {idToken}
```
