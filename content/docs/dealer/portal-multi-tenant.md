---
title: "Portal público — Configuración por tenant"
slug: "dealer/portal-multi-tenant"
module: "dealer"
screen: "/solicitudes/repuestos"
summary: "Como personalizar los colores, logo y nombre del portal público de solicitudes para cada organización."
roles: ["admin", "gerente"]
tags: ["dealer", "portal", "multi-tenant", "landing", "colores", "marca"]
relatedRoutes: ["/solicitudes/repuestos", "/solicitudes/servicios", "/api/public/org"]
entity: "organization"
order: 40
status: "active"
category: "tecnico"
lastValidated: "2026-03-12"
---

## Que es

El portal público de solicitudes (`/solicitudes/repuestos`, `/solicitudes/servicios`) puede mostrar la marca visual de cada organización: colores primarios, nombre y logo propios. Esto permite que distintos dealers usen el mismo sistema con su identidad visual sin compartir pantallas.

La configuración se almacena en Firestore en el campo `landing_config` del documento de la organización y se aplica automáticamente cuando el cliente accede con el parámetro `?org=<slug>` en la URL.

## Para que sirve

Sirve para que el enlace público de solicitudes de cada dealer muestre su propia marca. Un cliente de Agro Bicufa verá colores rojos y el nombre de Agro Bicufa. Un cliente de otro dealer verá los colores y nombre de ese dealer.

## Como se usa

### Configurar la marca en Firestore

En la consola de Firebase, navegar a `organizations/{orgId}` y agregar o editar el campo `landing_config`:

```json
{
  "primaryColor": "#c8102e",
  "secondaryColor": "#1a1a1a",
  "orgName": "Agro Bicufa",
  "logoUrl": "https://storage.googleapis.com/.../logo.png",
  "tagline": "Maquinaria CASE para el campo",
  "contactEmail": "contacto@agrobiciufa.com",
  "formTypes": ["repuestos", "servicios", "comercial"]
}
```

Campos obligatorios si se provee el objeto: `primaryColor` y `secondaryColor` en formato hex. Si `landing_config` no existe, el sistema usa los defaults (`#c8102e` / `#1a1a1a` con el `nombre` de la org).

### Compartir el enlace con clientes

El enlace personalizado para cada tenant tiene la forma:

```
https://doncandidoia.com/solicitudes/repuestos?org=<slug>
```

Donde `<slug>` es el campo `slug` del documento de la organización en Firestore.

### Verificar la configuración

Acceder a `/api/public/org/<slug>` — la respuesta JSON incluye el campo `landingConfig` con la configuración activa. Si `logoUrl` está en blanco, el portal no mostrará logo personalizado.

## Errores frecuentes

- El portal sigue mostrando colores anteriores después de cambiar `landing_config`: la configuración se cachea durante 5 minutos. Esperar o hacer un nuevo deploy para resetear la cache.
- El slug no coincide: verificar que el campo `slug` en Firestore coincida exactamente (sin mayúsculas ni espacios) con el usado en la URL.
- El nombre de la org no aparece: si `orgName` no está en `landing_config`, el sistema usa el campo `nombre` del documento de la org.

## Documentos relacionados

- [Solicitudes dealer — Flujo y estados](./solicitudes-flujo.md)
- [Conectar web cliente](./conectar-web-cliente.md)
