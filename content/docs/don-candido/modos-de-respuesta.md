---
title: "Modos de respuesta de Don Candido"
slug: "don-candido/modos-de-respuesta"
module: "don-candido"
screen: "/historial-conversaciones"
summary: "Explica la diferencia entre los modos de respuesta disponibles en el chat y cuando conviene usar cada uno."
roles: ["admin", "gerente", "auditor", "jefe", "usuario"]
tags: ["don-candido", "modo-rapido", "modo-calidad"]
relatedRoutes: ["/historial-conversaciones", "/api/chat/messages"]
entity: "chat_message"
order: 30
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

La interfaz de Don Candido muestra un selector de modo de IA con dos alternativas visibles: `Rapido` y `Calidad`. El primero prioriza velocidad de respuesta y el segundo prioriza respuestas mas desarrolladas. La eleccion se hace desde el encabezado del chat y puede cambiarse durante la sesion.

Esta diferenciacion no cambia el objetivo del asistente, pero si la experiencia de uso segun el momento de trabajo.

## Para que sirve

Sirve para adaptar el chat al tipo de consulta. Si necesitas una respuesta breve para avanzar rapido, el modo rapido suele ser suficiente. Si estas trabajando una duda mas amplia, comparando opciones o necesitando mas desarrollo, el modo calidad resulta mas conveniente.

Elegir bien el modo mejora tiempos y evita frustracion cuando la expectativa del usuario no coincide con el tipo de respuesta recibido.

## Como se usa

Antes de enviar tu consulta revisa que modo esta activo en el encabezado del chat. Usa `Rapido` para validaciones simples, recordatorios o preguntas puntuales. Usa `Calidad` cuando el tema requiera mas contexto o un desarrollo algo mayor.

Si una respuesta se queda corta, no hace falta abandonar la sesion: cambia el modo y reformula la consulta dentro del mismo hilo. Mantener la sesion ayuda a que el asistente aproveche el contexto ya cargado.

## Errores frecuentes

- Esperar una respuesta extensa cuando el modo rapido esta seleccionado.
- Cambiar de sesion en lugar de cambiar de modo.
- Tomar el modo como garantia absoluta de calidad; la claridad de la pregunta sigue siendo decisiva.

## Documentos relacionados

- [Uso del asistente IA Don Candido](./asistente-ia.md)
- [Historial de conversaciones](./historial-de-conversaciones.md)
