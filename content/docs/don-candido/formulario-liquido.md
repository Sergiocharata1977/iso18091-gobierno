---
title: "Formulario líquido — voz a campos"
slug: "don-candido/formulario-liquido"
module: "don-candido"
screen: "/mi-panel"
summary: "Como usar el microfono para completar campos de formularios hablando en lugar de escribir."
roles: ["admin", "gerente", "empleado"]
tags: ["don-candido", "voz", "formulario", "voice", "ia", "productividad"]
relatedRoutes: ["/mi-panel", "/api/ai/fill-form"]
entity: "voice_form"
order: 45
status: "active"
category: "uso"
lastValidated: "2026-03-21"
---

## Que es

El formulario líquido permite completar campos hablando en lugar de tipear. Al presionar el botón de micrófono junto a un campo, Don Cándido escucha lo que decís, extrae los datos relevantes y los carga automáticamente en el formulario.

Funciona con cualquier formulario que tenga habilitado el componente `VoiceFormButton`.

## Para que sirve

- Cargar datos en formularios desde el celular sin teclado
- Dictar información técnica o de campo mientras trabajas con las manos ocupadas
- Reducir errores de tipeo en campos críticos (números de serie, cantidades, fechas)
- Completar múltiples campos de una sola dictación ("el equipo es un tractor CASE IH, serie 12345, con 1200 horas")

## Como se usa

1. Abrí el formulario que querés completar (por ejemplo, alta de equipo, registro de hallazgo, solicitud de servicio)
2. Buscá el ícono de micrófono junto al campo
3. Presioná el botón — el sistema empieza a escuchar (máximo 10 segundos)
4. Hablá con naturalidad: "el cliente es Juan García, teléfono 11 5555 1234, quiere un servicio de mantenimiento"
5. Don Cándido extrae los valores y los carga en los campos correspondientes
6. Revisá los campos cargados y confirmá antes de enviar

## Campos que no se detectan

Si el sistema no puede detectar un valor con alta confianza, el campo queda en blanco. El sistema muestra cuáles campos no pudo completar para que los cargues manualmente.

## Privacidad del audio

El audio se procesa en el servidor y no se almacena. Solo se guarda el texto transcripto en el contexto de la sesión.

## Limitaciones

- Requiere permiso de micrófono en el navegador
- Funciona mejor en Chrome y Edge; compatibilidad limitada en Firefox (sin Web Speech API nativa)
- Máximo 10 segundos de dictación por campo; para dictaciones largas usá el asistente de voz de Mi Panel
- Los nombres propios y siglas técnicas pueden requerir corrección manual

## Documentos relacionados

- [Asistente IA Don Cándido](./asistente-ia.md)
- [Mi Panel](../mi-panel/README.md)
