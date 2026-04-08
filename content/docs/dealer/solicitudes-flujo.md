---
title: "Solicitudes dealer - Flujo y estados"
slug: "dealer/solicitudes-flujo"
module: "dealer"
screen: "/solicitudes/repuestos"
summary: "Como gestionar las solicitudes de clientes que llegan desde la web: repuestos y servicios tecnicos desde tableros separados, con derivacion comercial hacia CRM."
roles: ["admin", "gerente", "usuario"]
tags: ["solicitudes", "dealer", "repuesto", "servicio", "comercial", "kanban"]
relatedRoutes: ["/solicitudes", "/solicitudes/repuestos", "/solicitudes/servicios"]
entity: "solicitud"
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-08"
---

## Que es

Una solicitud dealer es el registro que se crea cuando un cliente de Agro Biciufa completa un formulario web para repuestos, servicio tecnico o consultas comerciales.

## Para que sirve

Sirve para centralizar el ingreso de consultas, asignarlas al equipo y seguir cada caso por estado sin mezclarlo con otros modulos del sistema.

## Como se usa

1. Entrar a `Repuestos` o `Servicios Técnicos` desde el menu lateral.
2. Filtrar por `tipo` o `estado` para priorizar el trabajo.
3. Abrir una solicitud para ver contacto, origen y detalle tecnico o comercial.
4. Actualizar el estado segun el avance real: `recibida`, `en_revision`, `gestionando`, `cerrada` o `cancelada`.
5. Registrar asignacion o notas operativas antes de cerrar el caso.

## Errores frecuentes

- Cerrar una solicitud sin validar que el cliente haya recibido respuesta.
- Cambiar el estado para "limpiar" la bandeja en lugar de reflejar el avance real.
- Usar comentarios libres sin completar los datos clave del detalle.

## Documentos relacionados

- [Catalogo de productos dealer](./catalogo-productos.md)
- [Notificaciones WhatsApp - Dealer](./whatsapp-notificaciones.md)
