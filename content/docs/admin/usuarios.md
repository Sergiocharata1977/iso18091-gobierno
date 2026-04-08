---
title: "Usuarios y configuracion"
slug: "admin/usuarios"
module: "admin"
screen: "/admin/usuarios"
summary: "Explica como gestionar usuarios, roles, permisos y la configuracion general de la organizacion."
roles: ["admin", "super_admin"]
tags: ["usuarios", "roles", "permisos", "admin", "configuracion"]
relatedRoutes: ["/admin/usuarios", "/mi-contexto", "/configuracion/gobernanza"]
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-30"
---

## Que es

El modulo de Usuarios y Administracion permite crear y gestionar cuentas de usuario, asignar roles, configurar los datos de la organizacion y establecer parametros del sistema de gestion.

## Para que sirve

Controla quien puede acceder al sistema y con que nivel de permisos. Define la identidad de la organizacion (nombre, logo, sector) que se muestra en documentos y reportes.

## Como se usa

1. Ingresar a **Usuarios y Roles** desde el menu lateral.
2. Ver el listado de usuarios activos y sus roles asignados.
3. Crear un nuevo usuario con nombre, email y rol (admin, gerente, jefe, operario).
4. Editar un usuario existente para cambiar su rol o desactivar su acceso.
5. Ir a **Organizacion** (`/mi-contexto`) para actualizar datos de la empresa.
6. Ir a **Parametros del sistema** (`/configuracion/gobernanza`) para configurar flujos y comportamientos del SGC.

## Roles disponibles

- **super_admin**: acceso total a todas las organizaciones (solo staff interno)
- **admin**: control total de la organizacion propia
- **gerente**: acceso a reportes y aprobaciones
- **jefe**: gestion de su area y equipo
- **operario**: acceso limitado a sus tareas y registros

## Errores frecuentes

- Asignar rol admin a usuarios operativos: reduce el control de acceso y el trazado de responsabilidades.
- No desactivar usuarios que se van de la empresa: pueden seguir teniendo acceso activo.

## Documentos relacionados

- [Marketplace de plugins](./marketplace.md)
