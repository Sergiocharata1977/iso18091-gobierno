---
title: "Vision general de diseno y desarrollo"
slug: "iso-design/vision-general"
module: "iso-design"
screen: "/iso-design"
summary: "Presenta el modulo premium ISO 8.3 para gestionar proyectos de diseno, planificacion, verificacion y validacion."
roles: ["admin", "gerente"]
tags: ["iso-8.3", "diseno", "desarrollo", "premium"]
relatedRoutes: ["/iso-design", "/api/iso-design", "/api/iso-design/[id]"]
entity: "design_project"
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

El modulo de Diseno y Desarrollo concentra la gestion de proyectos alcanzados por la clausula 8.3 de ISO 9001. Cada proyecto registra entradas de diseno, salidas esperadas, revisiones programadas y las fechas de verificacion y validacion.

La pantalla principal resume el estado del portafolio y lista los proyectos activos. Cada tarjeta deja visible si el trabajo esta en planificacion, diseno, verificacion, validacion o cierre.

## Para que sirve

Sirve para ordenar el ciclo de vida de productos y servicios nuevos o modificados. El objetivo es dejar trazabilidad minima de quien lidera el proyecto, cuales son los requisitos de entrada, que resultados se esperan y cuando se comprueba que el diseno funciona.

Tambien actua como capability premium. Si la organizacion no tiene habilitada `iso-design-development`, la navegacion y las APIs asociadas quedan bloqueadas.

## Como se usa

Entra por `/iso-design`. Si la capability esta activa, veras el tablero del modulo y podras crear proyectos con el boton `Nuevo proyecto`.

Al crear un proyecto, carga nombre, descripcion, tipo, responsable, entradas de diseno, salidas de diseno y fechas de revision. Luego el listado muestra un resumen operativo en tres bloques: plan de diseno, verificacion y validacion.

## Errores frecuentes

- Crear el proyecto sin entradas o salidas de diseno, dejando la trazabilidad incompleta.
- Marcar una validacion como terminada sin registrar fecha efectiva.
- Intentar acceder al modulo sin tener activa la capability premium en el tenant.

## Documentos relacionados

- [Vision general de acciones](../acciones/vision-general.md)
- [README de documentacion](../README.md)
