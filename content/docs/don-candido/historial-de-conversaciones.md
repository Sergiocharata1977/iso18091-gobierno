---
title: "Historial de conversaciones"
slug: "don-candido/historial-de-conversaciones"
module: "don-candido"
screen: "/historial-conversaciones"
summary: "Describe como reutilizar sesiones previas y por que conviene mantener el historial organizado al trabajar con Don Candido."
roles: ["admin", "gerente", "auditor", "jefe", "usuario"]
tags: ["don-candido", "historial", "sesiones"]
relatedRoutes: ["/historial-conversaciones", "/api/chat/sessions", "/api/chat/sessions/[sessionId]"]
entity: "chat_session"
order: 20
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

El historial de conversaciones es la lista de sesiones previas asociadas al usuario. En la interfaz del chat aparece como una barra lateral desde la que puedes crear, seleccionar o eliminar sesiones. Cada sesion conserva su secuencia de mensajes y permite retomar una consulta anterior sin empezar desde cero.

Este historial es especialmente util cuando trabajas por temas: una sesion para auditorias, otra para hallazgos y otra para seguimiento general.

## Para que sirve

Sirve para preservar contexto y ordenar el uso del asistente. Si todas las preguntas quedan mezcladas en una unica sesion, despues es mas dificil recuperar decisiones o explicaciones. En cambio, sesiones separadas por asunto facilitan la consulta posterior y reducen ruido.

Tambien ayuda a no repetir informacion. Cuando retomas una sesion, el asistente puede apoyarse mejor en el hilo previo.

## Como se usa

Ingresa por el acceso disponible a Don Candido. En el lateral busca la sesion que corresponda al tema que estas trabajando. Si no existe, crea una nueva. Si ya existe, selecciona esa sesion antes de enviar el siguiente mensaje. Cuando una conversacion deja de ser util, puede eliminarse desde el mismo lateral.

Si llegas desde `/historial-conversaciones`, recuerda que hoy la ruta redirige a Mi Panel con parametro `tab=chat`. Si en tu entorno no visualizas el historial en esa ruta, valida con el equipo si la pestana esta habilitada para tu cuenta. [VERIFICAR]

## Errores frecuentes

- Mezclar consultas de muchos temas en una sola sesion extensa.
- Eliminar sesiones activas sin revisar si contienen decisiones o referencias utiles.
- Buscar el historial como pagina completamente separada cuando hoy depende de la experiencia de Mi Panel. [VERIFICAR]

## Documentos relacionados

- [Uso del asistente IA Don Candido](./asistente-ia.md)
- [Modos de respuesta](./modos-de-respuesta.md)
