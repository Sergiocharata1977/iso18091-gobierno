---
title: "Vision general de auditorias"
slug: "auditorias/vision-general"
module: "auditorias"
screen: "/mejoras/auditorias"
summary: "Presenta el modulo de auditorias internas, sus vistas de trabajo y el recorrido general desde la planificacion hasta el cierre."
roles: ["admin", "gerente", "auditor"]
tags: ["auditorias", "iso-9001", "seguimiento"]
relatedRoutes: ["/mejoras/auditorias", "/api/sdk/audits", "/api/audits"]
entity: "audit"
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

El modulo de Auditorias concentra la gestion de auditorias internas ISO 9001 dentro del espacio de mejora. Desde la pantalla principal se listan las auditorias disponibles, se aplican filtros y se crean nuevas auditorias. El sistema ofrece al menos dos vistas operativas: una vista tipo lista y una vista Kanban para seguir el estado de cada auditoria.

Cada auditoria puede abrirse en una pagina de detalle donde se revisan fechas, auditor lider, puntos de norma, comentarios, evidencias y cierre.

## Para que sirve

Sirve para planificar, ejecutar y cerrar auditorias con trazabilidad. En lugar de gestionar la auditoria como un documento aislado, el modulo relaciona la planificacion con evaluacion de puntos de norma, comentarios, evidencias y hallazgos derivados. Eso facilita la preparacion de informes y el seguimiento posterior.

Tambien es util para la direccion y para el equipo auditor, porque las tarjetas y contadores permiten ver cuantas auditorias estan planificadas, en progreso o completadas.

## Como se usa

Ingresa por `/mejoras/auditorias`. La parte superior muestra indicadores de cantidad total y por estado. Despues podes cambiar entre vista lista o Kanban, buscar por termino y filtrar por estado, tipo o anio. Si necesitas una nueva auditoria, usa `Nueva Auditoria`, completa el formulario y el sistema intenta redirigir al detalle creado.

En el detalle de una auditoria el foco pasa a la ejecucion. Alli se ven datos generales, comentarios iniciales y finales, verificacion de puntos de norma y herramientas para agregar hallazgos, evidencia o cerrar la auditoria. Ese recorrido hace que la auditoria no quede solo planificada, sino realmente documentada en el sistema.

## Errores frecuentes

- Crear auditorias sin revisar antes filtros y busqueda, duplicando registros ya existentes.
- Usar solo la vista inicial y no entrar al detalle, donde estan las acciones de evaluacion y cierre.
- Tomar el estado "planificada" como evidencia de auditoria realizada; la ejecucion requiere carga adicional.

## Documentos relacionados

- [Planificacion de auditorias](./planificacion.md)
- [Tablero y filtros de auditorias](./tablero-y-filtros.md)
- [Detalle de auditoria](./detalle-de-auditoria.md)
- [Vision general de hallazgos](../hallazgos/vision-general.md)
