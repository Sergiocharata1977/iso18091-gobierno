---
title: "Marketplace de Plugins"
slug: "admin/marketplace"
module: "admin"
screen: "/admin/marketplace"
summary: "Explica como instalar, activar y gestionar plugins y capabilities desde el marketplace de la plataforma."
roles: ["admin", "super_admin"]
tags: ["plugins", "capabilities", "marketplace", "instalacion"]
relatedRoutes: ["/admin/marketplace", "/admin/capabilities"]
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-30"
---

## Que es

El Marketplace es el catalogo de plugins y capabilities opcionales que se pueden instalar en la organizacion para extender las funcionalidades del sistema base ISO 9001.

## Para que sirve

Permite activar modulos adicionales como CRM, Pack HSE (ISO 14001/45001), SGSI ISO 27001, Dealer, Contabilidad y otros, sin modificar el nucleo del sistema.

## Como se usar

1. Ingresar a **Configuracion > Capabilities / Plugins** desde el menu lateral.
2. Ver el catalogo de plugins disponibles con descripcion y categoria.
3. Seleccionar un plugin y pulsar **Instalar**.
4. El sistema activa automaticamente las rutas y funcionalidades del plugin.
5. Para desactivar un plugin, usar el boton **Desinstalar** en el mismo panel.

## Plugins disponibles

- **CRM**: gestion comercial B2B, oportunidades, scoring crediticio
- **Pack HSE**: ISO 14001 + ISO 45001 + Permiso de Trabajo
- **SGSI ISO 27001**: seguridad de la informacion
- **Dealer**: modulo concesionaria (catalogo, repuestos, servicios)
- **Contabilidad**: doble partida central
- **WhatsApp Inbox**: atencion de clientes por WhatsApp

## Errores frecuentes

- Instalar plugins sin verificar los permisos de usuario: algunos plugins requieren configuracion adicional.
- Desinstalar un plugin sin exportar los datos: verificar antes si hay informacion que debe preservarse.

## Documentos relacionados

- [Gestion de usuarios](./usuarios.md)
