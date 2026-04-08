---
title: "Fases y verificacion de acciones"
slug: "acciones/fases-y-verificacion"
module: "acciones"
screen: "/mejoras/acciones/[id]"
summary: "Explica las cuatro fases visibles en el detalle de una accion y como se confirma su efectividad antes del cierre."
roles: ["admin", "gerente", "auditor"]
tags: ["acciones", "fases", "verificacion"]
relatedRoutes: ["/mejoras/acciones/[id]", "/api/actions/[id]"]
entity: "action"
order: 40
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

El detalle de una accion organiza el tratamiento en cuatro fases visibles: planificacion de la accion, ejecucion de la accion, planificacion del control y ejecucion del control. Cada fase puede mostrarse como informacion ya registrada o como formulario pendiente segun el estado actual del caso.

Este esquema ayuda a distinguir entre hacer una accion y demostrar que fue efectiva.

## Para que sirve

Sirve para evitar cierres prematuros. Muchas organizaciones ejecutan una correccion, pero no verifican si realmente resolvio la causa o el efecto esperado. Al separar ejecucion y control, el sistema obliga a dejar evidencia de ambos momentos.

Tambien facilita auditorias internas o revisiones posteriores, porque el recorrido queda documentado con responsables, fechas y criterios.

## Como se usa

En el detalle revisa primero la fase 1 para confirmar responsable y fecha planificada. Si la accion ya avanzo, completa o valida la fase 2 con fecha de ejecucion y comentarios. Luego pasa a la fase 3 para definir quien verificara la efectividad, cuando lo hara y con que criterio.

Por ultimo, usa la fase 4 para registrar la verificacion final e indicar si la accion fue efectiva. No conviene considerar cerrada una accion sin esta ultima evaluacion, salvo que el procedimiento interno disponga otra excepcion documentada.

## Errores frecuentes

- Marcar una accion como resuelta solo porque se ejecuto una tarea.
- Definir criterios de efectividad demasiado vagos para ser comprobados.
- Omitir responsable o fecha en las fases de control.

## Documentos relacionados

- [Seguimiento de acciones](./seguimiento.md)
- [Creacion de acciones](./creacion-de-acciones.md)
- [Registro y analisis de hallazgos](../hallazgos/registro-y-analisis.md)
