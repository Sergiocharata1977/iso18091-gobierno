---
title: "Don Candido por WhatsApp"
slug: "don-candido/whatsapp"
module: "don-candido"
screen: "/app-vendedor/whatsapp"
summary: "Como funciona Don Candido como asistente externo por WhatsApp Business para responder clientes fuera del sistema."
roles: ["admin", "gerente"]
tags: ["don-candido", "whatsapp", "omnicanal", "ia", "clientes"]
relatedRoutes: ["/app-vendedor/whatsapp", "/api/public/whatsapp/webhook"]
entity: "whatsapp_conversation"
order: 40
status: "active"
category: "tecnico"
lastValidated: "2026-03-12"
---

## Que es

Don Candido puede responder mensajes de clientes que escriben por WhatsApp Business sin que el cliente necesite ingresar al sistema. Usa el mismo motor IA que el chat interno (UnifiedConverseService) pero a traves de un webhook publico conectado a la Meta Graph API.

Cuando un cliente envia un mensaje al numero de WhatsApp de la organizacion, Don Candido procesa el mensaje, consulta el contexto disponible y envia la respuesta al mismo numero en segundos.

## Para que sirve

Sirve para atender consultas frecuentes fuera del horario de atencion, reducir la carga manual del vendedor en respuestas de primer nivel, y mantener un historial unificado de conversaciones junto al chat interno.

Los vendedores pueden ver las conversaciones de WhatsApp activas desde `/app-vendedor/whatsapp`.

## Como se usa

### Para el administrador — configuracion inicial

Para activar WhatsApp se requieren tres variables de entorno que el administrador debe configurar en el servidor de produccion:

- `WHATSAPP_ACCESS_TOKEN`: token de acceso de la app de Meta Developer
- `WHATSAPP_VERIFY_TOKEN`: token de verificacion del webhook (cualquier string secreto)
- `WHATSAPP_APP_SECRET`: secreto de la aplicacion Meta para validar la firma HMAC

En el panel de Meta Developer se debe apuntar el webhook a:
`https://doncandidoia.com/api/public/whatsapp/webhook`

En Firestore, el campo `whatsapp_phone_number_id` del documento de la organizacion debe tener el Phone Number ID del numero de WhatsApp asignado.

### Para el vendedor — seguimiento de conversaciones

Ingresar a `/app-vendedor/whatsapp`. La pantalla lista las conversaciones activas con clientes externos. Cada conversacion muestra el numero de telefono, los mensajes intercambiados y la respuesta de Don Candido. El vendedor puede intervenir manualmente si la respuesta automatica no fue suficiente.

## Errores frecuentes

- No llega respuesta al cliente: verificar que `WHATSAPP_ACCESS_TOKEN` no este vencido (los tokens de Meta expiran).
- El webhook no se verifica: revisar que `WHATSAPP_VERIFY_TOKEN` coincida exactamente con el configurado en Meta Developer.
- Respuesta de HMAC invalido (401): el `WHATSAPP_APP_SECRET` no corresponde a la aplicacion configurada.
- La organizacion no aparece: el `whatsapp_phone_number_id` no esta cargado en Firestore para esa org.

## Documentos relacionados

- [Asistente IA Don Candido](./asistente-ia.md)
- [Notificaciones WhatsApp - Dealer](../dealer/whatsapp-notificaciones.md)
