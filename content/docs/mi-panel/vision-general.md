---
title: "Vision general de Mi Panel"
slug: "mi-panel/vision-general"
module: "mi-panel"
screen: "/mi-panel"
summary: "Explica que muestra Mi Panel, como ingresar y como interpretar sus bloques principales de trabajo personal."
roles: ["admin", "gerente", "auditor", "jefe", "usuario"]
tags: ["mi-panel", "inicio", "resumen-personal"]
relatedRoutes: ["/mi-panel", "/dashboard/mi-panel", "/api/context/user"]
entity: "mi_panel_context"
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

Mi Panel es la vista personal desde la que cada usuario consulta su situacion operativa dentro del sistema. Reune informacion de procesos asignados, registros pendientes, objetivos, indicadores y actividad vinculada al trabajo diario. En lugar de recorrer varios modulos para saber que hacer, la pantalla concentra lo relevante segun el perfil y el contexto cargado para la persona.

El acceso principal se hace desde la ruta `/mi-panel`. Tambien existe un acceso alias desde `/dashboard/mi-panel`, que redirige a la misma experiencia. Cuando un responsable con permisos de supervision revisa el panel de otra persona, el sistema puede cargar el contexto de ese usuario para mostrar su estado actual.

## Para que sirve

Sirve para ordenar el trabajo individual y dar visibilidad inmediata sobre pendientes, vencimientos y relacion con los procesos del sistema de gestion. Para un usuario operativo, Mi Panel funciona como tablero de seguimiento. Para un jefe, gerente o auditor, ademas permite entender si la asignacion de procesos, objetivos e indicadores esta correctamente distribuida.

Tambien es una referencia util para conversaciones con Don Candido, porque el panel resume sesiones IA registradas y datos que luego pueden servir para tomar decisiones de seguimiento.

## Como se usa

Al abrir la pantalla, primero se carga el contexto del usuario desde `/api/context/user`. Si la carga fue correcta, en el encabezado se muestran nombre, puesto, departamento, rol y organizacion. Debajo aparece una vista global cuando todavia no seleccionaste un proceso especifico. Esa vista resume procesos asignados, registros pendientes, alertas y sesiones IA.

Si elegis un proceso en la barra lateral, la parte central cambia a una vista de detalle. Alli podes alternar entre las pestañas `Canvas`, `Definicion` y `Metricas`. Canvas prioriza el entendimiento rapido del proceso y sus registros. Definicion expone la configuracion documental del proceso. La pestana Metricas figura en la interfaz, pero hoy muestra una vista pendiente en lugar de un tablero definitivo.

## Errores frecuentes

- Entrar a Mi Panel esperando un tablero general del sistema, cuando en realidad la vista esta centrada en la persona logueada o en el usuario supervisado.
- Interpretar una ausencia de procesos como falla del modulo, cuando muchas veces el problema esta en la asignacion del puesto, departamento o procesos.
- Tomar la pestana `Metricas` como funcionalidad completa. Actualmente la interfaz la presenta, pero la vista esta marcada como pendiente.

## Documentos relacionados

- [Trabajo y asignaciones](./trabajo-y-asignaciones.md)
- [Perfil](./perfil.md)
- [Configuracion de asignaciones](./configuracion-de-asignaciones.md)
- [Vision general de procesos](../procesos/vision-general.md)
