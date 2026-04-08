---
title: "App Cliente — Vision general"
slug: "app-cliente/vision-general"
module: "app-cliente"
screen: "/app-cliente"
summary: "Que es la App Cliente, como acceden los clientes finales y que pueden hacer desde su celular."
roles: ["admin", "gerente"]
tags: ["app-cliente", "mobile", "portal-cliente", "don-mario", "encuestas"]
relatedRoutes: ["/app-cliente", "/app-cliente/login", "/app-cliente/mis-equipos", "/app-cliente/mis-solicitudes", "/app-cliente/encuesta"]
entity: "cliente"
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-12"
---

## Que es

La App Cliente es un portal mobile-first destinado a los clientes finales del dealer (compradores de maquinaria). Funciona como una Progressive Web App (PWA) accesible desde el celular en `https://doncandidoia.com/app-cliente` y como APK Android instalable.

Tiene su propio sistema de autenticacion separado del sistema interno: los clientes ingresan con su email y contrasena de cliente, no con credenciales de la organizacion.

La app incluye cinco secciones accesibles desde la barra de navegacion inferior:

- **Inicio** — dashboard con resumen del cliente
- **Mis Equipos** — lista de maquinaria comprada y su historial
- **Solicitudes** — estado de solicitudes de servicio tecnico o repuestos
- **Don Mario** — chat con el asistente IA (Don Candido bajo el nombre Don Mario)
- **Mi Cuenta** — datos del cliente y configuracion

## Para que sirve

Sirve para que los clientes del dealer puedan consultar el estado de sus equipos, seguir sus solicitudes abiertas, comunicarse con soporte via IA y completar encuestas de satisfaccion, todo desde el celular sin necesidad de llamar o escribir por separado.

Cuando hay una encuesta de satisfaccion pendiente (despues de una compra o servicio), la app muestra un aviso en las pantallas de compras y solicitudes con un acceso directo para completarla.

## Como se usa

### Acceso del cliente

El cliente ingresa a `https://doncandidoia.com/app-cliente/login` o abre la app instalada. Si no tiene cuenta, el administrador debe crear sus credenciales desde el CRM (vinculado al contacto). Una vez autenticado, la app recuerda la sesion.

### Encuestas de satisfaccion

Cuando el sistema genera una encuesta automatica (post-compra o post-servicio), aparece una tarjeta en las pantallas de **Mis Compras** y **Mis Solicitudes** con un boton para responderla. La encuesta incluye una pregunta NPS (0-10) y preguntas abiertas. Una vez completada, la tarjeta desaparece.

### Don Mario (asistente IA)

Desde la seccion Don Mario el cliente puede escribir preguntas sobre sus equipos, el estado de sus solicitudes o cualquier consulta relacionada con el dealer. Don Mario usa el mismo motor que Don Candido y tiene acceso al contexto del cliente autenticado.

## Errores frecuentes

- El cliente no puede ingresar: sus credenciales son de cliente, no de usuario del sistema. Verificar que existan en la coleccion de autenticacion de clientes.
- La encuesta no aparece: la encuesta debe estar en estado `active` y tener el `externalToken` generado. Verificar en Firestore.
- La app redirige al login del sistema principal: el navegador tiene una sesion de org activa. Cerrar sesion del sistema y reintentar.

## Documentos relacionados

- [Don Mario / Don Candido](../don-candido/asistente-ia.md)
- [Encuestas NPS — CRM satisfaccion](../crm/satisfaccion-nps.md)
