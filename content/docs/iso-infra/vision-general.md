---
title: "Vision general de infraestructura"
slug: "iso-infra/vision-general"
module: "iso-infra"
screen: "/iso-infrastructure"
summary: "Introduce el modulo ISO 7.1.3 para registrar activos, responsables y mantenimientos de la infraestructura del SGC."
roles: ["admin", "gerente"]
tags: ["infraestructura", "iso-9001", "activos", "mantenimiento"]
relatedRoutes: ["/iso-infrastructure", "/api/iso-infrastructure", "/api/iso-infrastructure/[id]/maintenance"]
entity: "infra_asset"
order: 10
status: "active"
lastValidated: "2026-03-04"
---

## Que es

El modulo de Infraestructura centraliza los activos fisicos y digitales que sostienen la operacion del SGC. Cada registro identifica el activo, su tipo, la ubicacion, el responsable asignado, el estado operativo y el historial de mantenimiento asociado.

La vista principal concentra inventario y mantenimiento en un mismo tablero. Eso permite revisar rapidamente si un equipo esta activo, en mantenimiento, inactivo o dado de baja.

## Para que sirve

Sirve para demostrar que la organizacion determina, proporciona y mantiene la infraestructura necesaria para operar sus procesos. En la practica, ayuda a ordenar el inventario, asignar responsables y sostener evidencia de mantenimientos preventivos o correctivos.

Tambien facilita el seguimiento gerencial porque la pantalla resume activos activos, activos intervenidos y mantenimientos proximos.

## Como se usa

Ingresa por `/iso-infrastructure`. En la parte superior vas a ver indicadores generales del modulo. Debajo se encuentra el formulario para registrar un nuevo activo con su tipo, ubicacion, responsable, fecha de adquisicion y fecha de proximo mantenimiento.

En la misma pantalla podes aplicar filtros por tipo y estado para acotar el inventario. Cada tarjeta muestra el responsable, la ubicacion, la fecha de alta y el historial reciente. Si necesitas documentar una intervencion, usa `Registrar mantenimiento`, completa los datos del trabajo realizado y, si corresponde, actualiza la proxima fecha de mantenimiento.

## Errores frecuentes

- Cargar activos sin responsable, dejando sin trazabilidad la gestion posterior.
- Registrar mantenimientos sin actualizar la fecha del proximo control cuando el activo lo requiere.
- Usar el estado `activo` para equipos que siguen intervenidos o fuera de servicio.

## Documentos relacionados

- [Vision general de procesos](../procesos/vision-general.md)
- [Vision general de auditorias](../auditorias/vision-general.md)
