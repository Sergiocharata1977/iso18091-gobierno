---
title: "Planificacion de auditorias"
slug: "auditorias/planificacion"
module: "auditorias"
screen: "/mejoras/auditorias"
summary: "Explica como organizar una auditoria interna desde la pantalla principal y que datos conviene definir antes de ejecutarla."
roles: ["admin", "gerente", "auditor"]
tags: ["auditorias", "planificacion", "programa"]
relatedRoutes: ["/mejoras/auditorias", "/api/sdk/audits"]
entity: "audit"
order: 20
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

La planificacion de auditorias es el paso inicial para dar de alta una auditoria interna en el sistema. En la pantalla principal del modulo existe un boton `Nueva Auditoria` que abre un formulario de carga. Desde alli se registran datos basicos que luego sostienen todo el proceso de ejecucion y cierre.

Aunque ISO 9001 exige criterio y metodo, en la practica una buena planificacion empieza por dejar claros alcance, responsable y fecha prevista.

## Para que sirve

Sirve para evitar auditorias improvisadas. Cuando la planificacion esta completa, el equipo puede saber que se auditara, quien lidera el trabajo y en que momento deberian comenzar las verificaciones. Ademas, la informacion inicial ayuda a clasificar la auditoria y a distinguirla de otras ya cargadas.

Una planificacion clara reduce retrabajos durante la ejecucion, especialmente cuando luego se deben cargar puntos de norma, evidencias y hallazgos.

## Como se usa

Antes de crear la auditoria revisa si ya existe una similar mediante la busqueda y los filtros. Si no esta cargada, usa `Nueva Auditoria`. El formulario debe completarse con datos suficientes para que el registro sea identificable: titulo, alcance, tipo, auditor lider y fecha planificada. El sistema envia la informacion a `/api/sdk/audits` y, si la operacion resulta exitosa, redirige al detalle.

Una vez creada, verifica inmediatamente que el registro aparezca con el estado esperado y que la fecha planificada sea correcta. Ese control temprano evita iniciar la ejecucion con informacion equivocada o incompleta.

## Errores frecuentes

- Crear una auditoria con un titulo generico que luego no permite distinguirla.
- Dejar el alcance demasiado ambiguo, dificultando la verificacion posterior.
- Cargar la auditoria y no revisar el detalle, perdiendo tiempo cuando llega la fecha de ejecucion.

## Documentos relacionados

- [Vision general de auditorias](./vision-general.md)
- [Detalle de auditoria](./detalle-de-auditoria.md)
- [Clasificacion de hallazgos](../hallazgos/clasificacion.md)
