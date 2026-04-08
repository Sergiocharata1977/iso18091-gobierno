---
title: "Seguimiento de acciones"
slug: "acciones/seguimiento"
module: "acciones"
screen: "/mejoras/acciones"
summary: "Describe como monitorear acciones por estado, prioridad y avance desde la pantalla principal del modulo."
roles: ["admin", "gerente", "auditor"]
tags: ["acciones", "seguimiento", "estado"]
relatedRoutes: ["/mejoras/acciones", "/api/actions"]
entity: "action"
order: 20
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

El seguimiento de acciones es el uso diario del modulo para saber que acciones siguen abiertas, cuales avanzaron y cuales ya fueron verificadas o cerradas. La pantalla principal integra estadisticas, filtro de estado, buscador y selector de vista para que el control no dependa de revisiones manuales fuera del sistema.

El objetivo no es solo ver cantidad de acciones, sino identificar cuales requieren intervencion inmediata.

## Para que sirve

Sirve para sostener el cierre efectivo de problemas y mejoras. Una accion creada pero no seguida pierde valor. En cambio, cuando el responsable revisa periodicamente estados y progreso, puede detectar atrasos, confirmar ejecuciones y planificar controles de efectividad.

Tambien ayuda a auditorias de seguimiento y revisiones de gerencia, porque la informacion queda actualizada en un mismo lugar.

## Como se usa

Abre `/mejoras/acciones` y observa el resumen estadistico. Despues usa el filtro de estado para concentrarte en abiertas, en progreso o verificadas segun tu objetivo. La vista lista suele ser mejor para revision detallada, mientras que Kanban facilita una lectura rapida del flujo.

Cuando una accion requiera intervencion, entra al detalle y valida en que fase esta detenida. Si la accion ya se ejecuto, revisa si falta planificacion del control o verificacion de efectividad. Ese enfoque por fase permite hacer seguimiento serio y no solo marcar estados.

## Errores frecuentes

- Revisar solo la accion mas reciente y no el conjunto de acciones atrasadas.
- Cambiar el estado sin respaldarlo con informacion en las fases correspondientes.
- Dejar acciones "en progreso" durante mucho tiempo sin registrar ejecucion real.

## Documentos relacionados

- [Vision general de acciones](./vision-general.md)
- [Fases y verificacion de acciones](./fases-y-verificacion.md)
- [Detalle del hallazgo](../hallazgos/detalle-del-hallazgo.md)
