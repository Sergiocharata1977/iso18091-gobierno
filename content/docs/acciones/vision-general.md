---
title: "Vision general de acciones"
slug: "acciones/vision-general"
module: "acciones"
screen: "/mejoras/acciones"
summary: "Presenta el modulo de acciones correctivas, preventivas y de mejora, junto con sus vistas principales de seguimiento."
roles: ["admin", "gerente", "auditor"]
tags: ["acciones", "correctivas", "mejora"]
relatedRoutes: ["/mejoras/acciones", "/api/actions"]
entity: "action"
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

El modulo de Acciones gestiona acciones correctivas, preventivas y de mejora. La pantalla principal presenta estadisticas, buscador, filtro por estado, vista lista y vista Kanban, ademas del acceso `Nueva Accion` para cargar registros nuevos.

Cada accion tiene una pagina de detalle con informacion general, progreso y fases de tratamiento. Esto convierte al modulo en un flujo completo y no solo en un listado de compromisos.

## Para que sirve

Sirve para transformar un problema detectado o una oportunidad de mejora en una respuesta controlada. Una accion bien gestionada permite dejar evidencia de responsable, fecha planificada, ejecucion, criterios de efectividad y verificacion final.

Tambien facilita priorizacion para mandos medios y alta direccion, porque el tablero muestra cuantas acciones siguen abiertas, en progreso o verificadas.

## Como se usa

Entra por `/mejoras/acciones` y revisa primero las estadisticas generales. Usa el buscador para localizar una accion especifica y el filtro de estado para separar abiertas, en progreso, completadas, verificadas o cerradas. Si necesitas una nueva, abre el formulario desde `Nueva Accion`.

Para seguimiento puntual entra al detalle de la accion. Alli veras encabezado, progreso e informacion general, y luego las cuatro fases operativas: planificacion, ejecucion, planificacion del control y ejecucion del control. La pantalla muestra formularios o datos ya guardados segun el estado de avance.

## Errores frecuentes

- Tratar el modulo solo como agenda de pendientes sin completar fases y controles.
- Crear acciones con descripcion demasiado general, lo que dificulta medir efectividad.
- Revisar el listado sin entrar al detalle, perdiendo el seguimiento real del ciclo.

## Documentos relacionados

- [Seguimiento de acciones](./seguimiento.md)
- [Creacion de acciones](./creacion-de-acciones.md)
- [Fases y verificacion de acciones](./fases-y-verificacion.md)
- [Vision general de hallazgos](../hallazgos/vision-general.md)
