---
title: "Vision general de hallazgos"
slug: "hallazgos/vision-general"
module: "hallazgos"
screen: "/mejoras/hallazgos"
summary: "Presenta el modulo de hallazgos y su uso para registrar desvios, observaciones y oportunidades vinculadas al sistema de gestion."
roles: ["admin", "gerente", "auditor"]
tags: ["hallazgos", "mejora", "no-conformidad"]
relatedRoutes: ["/mejoras/hallazgos", "/api/findings"]
entity: "finding"
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

El modulo de Hallazgos es el espacio donde se registran y gestionan situaciones detectadas durante auditorias, revisiones o seguimiento operativo. La pantalla principal combina encabezado, estadisticas, buscador, filtro de estado y vistas lista, grilla o Kanban.

El sistema describe el flujo del modulo en cuatro fases: Registro, Accion Inmediata, Ejecucion y Analisis. Eso indica que un hallazgo no se limita a la deteccion inicial, sino que puede evolucionar hasta una evaluacion mas completa.

## Para que sirve

Sirve para dar tratamiento ordenado a desvios, no conformidades, observaciones y oportunidades de mejora. Un hallazgo bien registrado permite conservar el origen, vincular procesos y dejar base para acciones correctivas o preventivas cuando corresponda.

Tambien ayuda a priorizar trabajo, porque las estadisticas y el filtro por estado muestran rapidamente que hallazgos siguen abiertos y cuales ya avanzaron en su tratamiento.

## Como se usa

Ingresa por `/mejoras/hallazgos`. Usa `Nuevo Hallazgo` para crear un registro y luego apoya el seguimiento en la vista que mejor se adapte a tu tarea: lista para revisar detalle, grilla para comparacion visual o Kanban para estado general. El buscador y el filtro de estado permiten acotar resultados cuando el volumen crece.

Al abrir un hallazgo puntual, la pantalla de detalle muestra descripcion, metadata, analisis de causa raiz, accion inmediata planificada o ejecutada y origen del registro. Si el hallazgo nace de una auditoria, tambien puede incluir un enlace hacia esa auditoria.

## Errores frecuentes

- Registrar situaciones diferentes como un mismo hallazgo, perdiendo claridad para el analisis.
- Usar el modulo solo como repositorio de problemas y no avanzar con analisis o acciones derivadas.
- Revisar solo la estadistica general sin abrir el detalle de los hallazgos prioritarios.

## Documentos relacionados

- [Clasificacion de hallazgos](./clasificacion.md)
- [Registro y analisis de hallazgos](./registro-y-analisis.md)
- [Detalle del hallazgo](./detalle-del-hallazgo.md)
- [Vision general de acciones](../acciones/vision-general.md)
