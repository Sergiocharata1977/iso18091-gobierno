---
title: "Solicitudes dealer — Flujo y estados"
slug: "dealer/solicitudes"
module: "dealer"
screen: "/solicitudes/repuestos"
summary: "Explica cómo ingresan las solicitudes desde la landing de Agro Biciufa, qué estados tienen y cómo gestionarlas desde los tableros internos de repuestos y servicios."
roles: ["admin", "gerente", "jefe", "usuario"]
tags: ["dealer", "solicitudes", "agrobiciufa", "panel", "estados"]
relatedRoutes: ["/solicitudes", "/solicitudes/repuestos", "/solicitudes/servicios", "/api/public/solicitudes"]
entity: "solicitud"
order: 10
status: "active"
category: "proceso"
lastValidated: "2026-03-08"
---

## Qué es una solicitud dealer

Una solicitud dealer es el registro que se genera cuando un cliente de Agro Biciufa completa un formulario en la landing web. Puede ser de tres tipos:

- **Repuesto** — el cliente necesita un repuesto para su maquinaria.
- **Servicio técnico** — el cliente reporta un problema o solicita mantenimiento.
- **Comercial** — el cliente consulta por un producto o maquinaria nueva.

## Cómo llega una solicitud al sistema

1. El cliente completa el formulario en la web de Agro Biciufa.
2. La landing envía los datos al endpoint `POST /api/public/solicitudes`.
3. La solicitud se guarda en Firestore con estado `recibida`.
4. El sistema envía automáticamente por WhatsApp:
   - Un aviso al operario interno de Agro Biciufa.
   - Un acuse de recibo al cliente con el número de solicitud.

## Estados del flujo

| Estado | Significado |
|---|---|
| `recibida` | Ingresó desde el formulario. Aún no fue vista por el equipo. |
| `en_revision` | Un operario la tomó y está evaluando el caso. |
| `gestionando` | Se está ejecutando la gestión: contacto, cotización, asignación técnica. |
| `cerrada` | La gestión fue completada y el cliente fue notificado. |
| `cancelada` | La solicitud se descartó o el cliente no continuó. |

Cada vez que el operario cambia el estado, el cliente recibe una notificación automática por WhatsApp.

## Cómo gestionar una solicitud

1. Ingresar a **Solicitudes** en el menú lateral.
2. Seleccionar la solicitud de la lista.
3. Leer el detalle: datos del cliente, tipo, información específica (máquina, repuesto, problema).
4. Cambiar el estado según la acción tomada.
5. Usar el campo de **notas internas** para registrar gestiones sin que el cliente las vea.
6. Si corresponde, asignar a un responsable del equipo.

## Filtros disponibles en el panel

- **Por tipo:** repuesto / servicio / comercial
- **Por estado:** recibida / en_revision / gestionando / cerrada / cancelada

## Datos que incluye cada solicitud

Todos los tipos comparten:
- Nombre del cliente
- Teléfono (WhatsApp)
- Email
- CUIT (opcional)

Además, según el tipo:

**Repuesto:** máquina tipo, modelo, número de serie, descripción del repuesto buscado.

**Servicio:** máquina tipo, modelo, número de serie, descripción del problema, localidad, provincia.

**Comercial:** producto de interés (con id y nombre del catálogo si fue elegido), requiere financiación, comentarios.
