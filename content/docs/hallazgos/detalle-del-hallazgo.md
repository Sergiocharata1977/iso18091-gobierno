---
title: "Detalle del hallazgo"
slug: "hallazgos/detalle-del-hallazgo"
module: "hallazgos"
screen: "/mejoras/hallazgos/[id]"
summary: "Explica como leer y completar la vista detallada de un hallazgo, incluyendo descripcion, causa raiz y accion inmediata."
roles: ["admin", "gerente", "auditor"]
tags: ["hallazgos", "detalle", "causa-raiz"]
relatedRoutes: ["/mejoras/hallazgos/[id]", "/api/findings"]
entity: "finding"
order: 40
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

El detalle del hallazgo es la pantalla donde se concentra la informacion completa de un caso. Muestra el numero de hallazgo, su nombre, estado, progreso, descripcion, origen, proceso vinculado, fechas, autor y posibles secciones de causa raiz o accion inmediata.

Si el hallazgo nace de una auditoria, el panel lateral puede ofrecer un enlace hacia la auditoria relacionada. Eso mantiene continuidad entre deteccion y tratamiento.

## Para que sirve

Sirve para revisar un hallazgo sin perder contexto. En vez de mirar una fila resumida en la lista, aqui puedes ver si ya hubo analisis, si la correccion inmediata fue ejecutada y quien intervino. Es la vista recomendada cuando el hallazgo requiere decision o seguimiento serio.

Tambien permite detectar rapidamente si el registro esta incompleto o si deberia derivarse a una accion correctiva formal.

## Como se usa

Abre el hallazgo desde la lista, la grilla o el Kanban. Revisa primero el encabezado para confirmar numero, estado y porcentaje de progreso. Luego lee la descripcion y valida si la causa raiz ya fue documentada. Si existe una accion inmediata planificada o ejecutada, compara responsable, fecha y comentarios con la situacion real.

Usa la informacion lateral para confirmar origen, proceso y creador. Si el caso proviene de auditoria, aprovecha el enlace relacionado para verificar el contexto de deteccion antes de seguir avanzando.

## Errores frecuentes

- Tomar el porcentaje de progreso como cierre efectivo del caso sin revisar el contenido cargado.
- Analizar la causa raiz sin leer antes la descripcion completa y el origen.
- Omitir el enlace con la auditoria relacionada cuando el hallazgo fue detectado alli.

## Documentos relacionados

- [Vision general de hallazgos](./vision-general.md)
- [Registro y analisis de hallazgos](./registro-y-analisis.md)
- [Detalle de auditoria](../auditorias/detalle-de-auditoria.md)
