---
title: "Uso del asistente IA Don Candido"
slug: "don-candido/asistente-ia"
module: "don-candido"
screen: "/historial-conversaciones"
summary: "Explica como iniciar conversaciones con Don Candido IA y en que contextos del sistema puede apoyar al usuario."
roles: ["admin", "gerente", "auditor", "jefe", "usuario"]
tags: ["don-candido", "ia", "chat"]
relatedRoutes: ["/historial-conversaciones", "/api/chat/sessions", "/api/chat/messages"]
entity: "chat_session"
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-13"
---

## Que es

Don Candido es el asistente IA integrado al sistema para ayudar con consultas operativas y de contexto. Funciona en tres canales: chat interno del sistema, App Cliente (bajo el nombre Don Mario) y WhatsApp Business externo. Usa un unico motor (UnifiedConverseService) con Claude como modelo principal y Groq como fallback.

A partir de 2026-03-12, Don Candido conoce los plugins activos de cada organizacion. Cuando el usuario pregunta que funciones tiene disponibles, responde con la lista real de plugins/capabilities habilitados para su org.

La ruta `/historial-conversaciones` redirige a `/mi-panel?tab=chat`.

## Para que sirve

Sirve para resolver dudas de uso, pedir orientacion sobre modulos como auditorias, hallazgos o acciones, y mantener conversaciones dentro de un contexto relacionado con la pantalla actual. El sistema identifica el modulo segun la ruta para dar respuestas mas ubicadas.

Si un usuario pregunta por un modulo que no esta activado, Don Candido lo indica y sugiere contactar al administrador. Si el modulo esta disponible, da instrucciones concretas de uso.

Tambien permite crear y reutilizar sesiones de chat, lo que evita perder continuidad entre consultas relacionadas.

## Como se usa

Abre el acceso disponible a Don Candido y espera a que el sistema cree o seleccione una sesion. Luego escribe tu consulta y envia el mensaje. La aplicacion usa endpoints como `/api/chat/sessions` y `/api/chat/messages` para registrar la conversacion. Si estas trabajando dentro de un modulo especifico, el chat toma ese contexto automaticamente.

En algunas vistas puedes alternar entre modos de respuesta y revisar sesiones anteriores desde el panel lateral. Si necesitas continuidad, conserva la misma sesion en lugar de abrir una nueva para cada pregunta.

## Controles de voz

Don Candido soporta entrada y salida de voz directamente en el chat:

**STT — Entrada por micrófono:**
El campo de input tiene un boton de microfono (`Mic`). Al presionarlo, el navegador activa el reconocimiento de voz en español argentino (`es-AR`). La transcripcion aparece automaticamente en el campo de texto y se puede editar antes de enviar.

**TTS — Reproduccion de respuestas:**
Cada mensaje del asistente tiene un boton pequeno `Volume2`. Al presionarlo se reproduce la respuesta en audio usando la voz ElevenLabs configurada. Durante la carga muestra un spinner; mientras suena cambia a `VolumeX` para permitir detenerlo.

**Disponibilidad:**
- Chat interno 9001app (`/mi-panel`): ✅ STT + TTS activos
- App Cliente portal `/asistente` (Don Mario IA en Landing): pendiente de implementar
- WhatsApp canal adicional ElevenLabs: pendiente de configurar en dashboard (ver reporte 49)

> El TTS requiere que `ELEVENLABS_API_KEY` este configurado en el entorno. Si no esta, el boton no hace nada.

---

## Errores frecuentes

- Usar una sesion nueva para cada consulta breve, perdiendo contexto acumulado.
- Hacer preguntas ambiguas sin mencionar proceso, modulo o problema concreto.
- Esperar que Don Candido acceda a datos en tiempo real: trabaja con el contexto cargado al iniciar la sesion, no con queries en vivo a Firestore.

## Documentos relacionados

- [Historial de conversaciones](./historial-de-conversaciones.md)
- [Modos de respuesta](./modos-de-respuesta.md)
- [Don Candido por WhatsApp](./whatsapp.md)
- [Vision general de Mi Panel](../mi-panel/vision-general.md)
