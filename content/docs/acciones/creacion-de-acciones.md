---
title: "Creacion de acciones"
slug: "acciones/creacion-de-acciones"
module: "acciones"
screen: "/mejoras/acciones"
summary: "Guia para crear acciones nuevas con informacion suficiente para su ejecucion y posterior verificacion."
roles: ["admin", "gerente", "auditor"]
tags: ["acciones", "alta", "correctiva"]
relatedRoutes: ["/mejoras/acciones", "/api/actions"]
entity: "action"
order: 30
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

La creacion de acciones comienza en la pantalla principal del modulo mediante el boton `Nueva Accion`. El formulario recoge la base de trabajo para el resto del ciclo: titulo, descripcion, tipo de accion, prioridad y origen. Con esa informacion el sistema puede dejar la accion lista para avanzar a su planificacion detallada.

Crear bien una accion es importante porque el detalle posterior se apoya en esa definicion inicial.

## Para que sirve

Sirve para transformar un hallazgo, una desviacion o una necesidad de mejora en un plan rastreable. Una accion mal definida genera dudas sobre responsable, alcance y criterio de efectividad. Una accion bien creada facilita tanto la ejecucion como la revision posterior.

Tambien permite relacionar la accion con el origen que la justifica, por ejemplo un hallazgo o un proceso especifico.

## Como se usa

Antes de crear la accion confirma si el problema ya esta siendo tratado por otra accion. Si no existe, usa `Nueva Accion` y completa un titulo claro, una descripcion concreta y el tipo correcto. Define tambien la prioridad con criterio realista, evitando cargar todo como urgente.

Despues de guardar, vuelve a la lista y abre el detalle para completar la fase 1 de planificacion si todavia no esta cerrada. La carga inicial debe dejar suficientemente claro que se va a corregir, desde que origen y con que alcance general.

## Errores frecuentes

- Crear acciones duplicadas para el mismo problema.
- Usar descripciones vagas que luego no permiten verificar resultados.
- Elegir la prioridad por percepcion y no por impacto o urgencia real.

## Documentos relacionados

- [Vision general de acciones](./vision-general.md)
- [Seguimiento de acciones](./seguimiento.md)
- [Clasificacion de hallazgos](../hallazgos/clasificacion.md)
