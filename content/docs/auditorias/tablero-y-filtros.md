---
title: "Tablero y filtros de auditorias"
slug: "auditorias/tablero-y-filtros"
module: "auditorias"
screen: "/mejoras/auditorias"
summary: "Guia para usar los contadores, la busqueda y las vistas Kanban o lista en el seguimiento de auditorias."
roles: ["admin", "gerente", "auditor"]
tags: ["auditorias", "filtros", "kanban"]
relatedRoutes: ["/mejoras/auditorias", "/api/sdk/audits"]
entity: "audit"
order: 30
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

El tablero de auditorias es la combinacion entre indicadores de estado, buscador, filtros avanzados y selector de vista. En conjunto, estos elementos permiten transformar una lista extensa de auditorias en una vista administrable segun prioridades reales de trabajo.

La pantalla principal muestra tarjetas con total, planificadas, en progreso y completadas. Debajo, el toolbar permite buscar y alternar entre lista y Kanban.

## Para que sirve

Sirve para tener control operativo del programa de auditorias sin depender de planillas externas. Los contadores permiten detectar acumulacion en ciertos estados, mientras que los filtros ayudan a separar auditorias por tipo, anio o situacion. Esto es especialmente util para auditor lider, gerencia y responsables de seguimiento.

La vista Kanban facilita una lectura rapida del flujo, mientras que la lista resulta mas comoda cuando necesitas comparar auditorias por texto o revisar varias en secuencia.

## Como se usa

Abre el modulo y usa primero la busqueda para localizar una auditoria por titulo, numero o alcance. Si el volumen es alto, complementa con filtros por estado, tipo o anio. Observa como cambian los contadores superiores cuando aplicas filtros; eso te ayuda a validar si el conjunto visible es el correcto.

Cuando necesitas una lectura de avance, pasa a Kanban. Si vas a abrir varias auditorias una tras otra, vuelve a la lista. La recomendacion operativa es empezar por filtros amplios, confirmar volumen y luego afinar busqueda.

## Errores frecuentes

- Aplicar varios filtros y olvidar limpiarlos, creyendo que faltan auditorias.
- Elegir Kanban para revisar textos extensos o detalles que se leen mejor en lista.
- Tomar los contadores como total del sistema sin considerar que responden al conjunto filtrado visible.

## Documentos relacionados

- [Vision general de auditorias](./vision-general.md)
- [Planificacion de auditorias](./planificacion.md)
- [Seguimiento de acciones](../acciones/seguimiento.md)
