---
title: "Notificaciones WhatsApp - Dealer"
slug: "dealer/whatsapp-notificaciones"
module: "dealer"
screen: "/solicitudes/repuestos"
summary: "Que mensajes WhatsApp se envian automaticamente al operario y al cliente durante el flujo de solicitudes."
roles: ["admin", "gerente"]
tags: ["whatsapp", "notificaciones", "dealer", "twilio", "automatizacion"]
relatedRoutes: ["/solicitudes", "/solicitudes/repuestos", "/solicitudes/servicios", "/api/public/solicitudes", "/api/solicitudes/[id]"]
entity: "solicitud"
order: 30
status: "active"
category: "tecnico"
lastValidated: "2026-03-08"
---

## Que es

Esta guia describe las notificaciones WhatsApp automaticas del modulo Dealer para solicitudes creadas desde la landing publica y gestionadas en los tableros `/solicitudes/repuestos` y `/solicitudes/servicios`.

Hoy el flujo tiene dos grupos de mensajes:

- Un aviso al operario cuando entra una solicitud nueva.
- Un acuse y actualizaciones al cliente cuando la solicitud cambia de estado.

## Para que sirve

Sirve para auditar que el circuito de mensajes este alineado con la operacion real:

- El operario recibe aviso inmediato de alta.
- El cliente recibe confirmacion de recepcion.
- El cliente recibe novedades cuando un responsable cambia el estado en el panel.

Tambien permite validar rapidamente si falta configuracion de numero WhatsApp o si un envio no se ejecuta por ausencia de telefono.

## Como se usa

### 1. Alta de solicitud publica

Cuando un cliente envia el formulario por `POST /api/public/solicitudes`, el sistema crea la solicitud y dispara dos envios:

**Mensaje al operario**

- Destino: numero configurado en `organizations.{orgId}.whatsapp_notificaciones_dealer`.
- Emisor logico: `Sistema Dealer`.
- Momento: inmediatamente despues del alta.
- Contenido base:

`Nueva solicitud dealer`

- Numero de solicitud
- Tipo
- Nombre del cliente
- Telefono del cliente
- Datos especificos segun tipo:
- `repuesto`: maquina y descripcion del repuesto
- `servicio`: maquina, localidad y descripcion del problema
- `comercial`: producto de interes y si requiere financiacion
- Cierre: `Ingresa al panel para gestionar.`

**Mensaje al cliente**

- Destino: `solicitud.telefono`.
- Emisor logico: `Agro Biciufa`.
- Momento: inmediatamente despues del alta.
- Contenido base:

`Agro Biciufa recibio tu solicitud`

- Numero de solicitud
- Descripcion corta segun tipo:
- `repuesto`: repuesto para maquina/modelo
- `servicio`: servicio tecnico para maquina
- `comercial`: consulta sobre producto de interes
- Cierre: `Te contactamos a la brevedad.` y `Para consultas responde este mensaje.`

### 2. Cambio de estado desde los tableros de solicitudes

Cuando un usuario con permisos actualiza una solicitud por `PATCH /api/solicitudes/[id]`, el sistema compara `estadoAnterior` contra `estadoNuevo`.

Si el estado cambio y la solicitud tiene telefono, se envia un WhatsApp al cliente. No se envia un segundo mensaje al operario en esta etapa.

Los textos automaticos son:

| Estado nuevo | Mensaje al cliente |
|---|---|
| `en_revision` | `Agro Biciufa - Actualizacion` + `Estamos revisando tu consulta.` |
| `gestionando` | `Agro Biciufa - En gestion` + `Tu solicitud esta siendo procesada por nuestro equipo.` |
| `cerrada` | `Solicitud resuelta` + `Tu consulta fue gestionada.` + `Responde OK para confirmarlo.` |
| `cancelada` | `Solicitud cancelada` + `Tu solicitud fue cancelada.` |

Reglas practicas:

- Si el estado sigue igual, no se envia mensaje.
- Si `telefono` esta vacio, no se envia mensaje.
- El estado `recibida` no genera mensaje desde la API interna.

## Errores frecuentes

- No llega aviso al operario: revisar `whatsapp_notificaciones_dealer` en la organizacion activa.
- No llega acuse al cliente: la solicitud fue creada sin `telefono` o el envio fallo en Twilio.
- No llega mensaje al cambiar estado: el estado no cambio realmente, el usuario no tenia permiso de escritura o la solicitud no tiene telefono.
- Se espera notificacion al operario en cambios de estado: el codigo actual no la envia; solo avisa al cliente.
- Se espera plantilla de WhatsApp: el flujo actual usa `sendMessage` con texto libre, no `sendWhatsAppTemplate`.

## Documentos relacionados

- [Solicitudes dealer - Flujo y estados](./solicitudes-flujo.md)
- [Catalogo de productos dealer](./catalogo-productos.md)
