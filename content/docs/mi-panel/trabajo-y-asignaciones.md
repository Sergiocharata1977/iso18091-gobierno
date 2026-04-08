---
title: "Trabajo y asignaciones en Mi Panel"
slug: "mi-panel/trabajo-y-asignaciones"
module: "mi-panel"
screen: "/mi-panel"
summary: "Describe como revisar tareas, registros y responsabilidades visibles en Mi Panel para organizar el trabajo diario."
roles: ["admin", "gerente", "auditor", "jefe", "usuario"]
tags: ["mi-panel", "tareas", "asignaciones"]
relatedRoutes: ["/mi-panel", "/api/context/user", "/procesos/registros"]
entity: "user_private_task"
order: 20
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

La seccion de trabajo y asignaciones de Mi Panel muestra el conjunto de responsabilidades que el sistema puede asociar a una persona. Eso incluye procesos asignados, registros pendientes de esos procesos, objetivos, indicadores y tareas privadas que forman parte del contexto personal cargado para el usuario.

No es una lista aislada de pendientes. La idea es que cada elemento tenga relacion con una estructura formal del sistema: un puesto, un departamento, un proceso o una accion operativa conectada al seguimiento ISO.

## Para que sirve

Sirve para priorizar el trabajo sin perder trazabilidad. Si una persona participa en varios procesos, Mi Panel evita que tenga que revisar cada modulo por separado para saber donde intervenir. El resumen ayuda a detectar atrasos, revisar fechas de vencimiento y abrir rapidamente el proceso o modulo relacionado.

Tambien ayuda a responsables de equipo a validar si las cargas estan bien distribuidas. Cuando una persona no ve trabajo asignado o ve informacion incompleta, suele ser una señal de que la configuracion del puesto o del organigrama necesita revision.

## Como se usa

En la vista global del panel revisa primero los indicadores resumidos y las tarjetas con pendientes. Si ves procesos asignados, podes abrir cualquiera desde la barra lateral izquierda para pasar de una vista general a una vista especifica. Una vez dentro del proceso, Canvas resume el estado y Definicion ayuda a entender el marco del trabajo asignado.

Los registros vinculados se cuentan automaticamente y Mi Panel destaca los vencidos comparando su fecha con la fecha actual. Cuando un proceso esta asociado a un modulo de mejoras o auditorias, la interfaz puede ofrecer acceso rapido al modulo relacionado. Esto es util cuando una tarea nace de una auditoria, un hallazgo o un seguimiento documental.

## Errores frecuentes

- Buscar la asignacion solo por nombre de tarea y no por proceso, lo que dificulta entender el contexto.
- Ignorar registros vencidos pensando que se actualizaran solos. El panel informa la situacion, pero la regularizacion debe hacerse en el modulo correspondiente.
- Suponer que todos los usuarios pueden editar asignaciones. La edicion depende del rol y de la configuracion habilitada para la cuenta.

## Documentos relacionados

- [Vision general de Mi Panel](./vision-general.md)
- [Configuracion de asignaciones](./configuracion-de-asignaciones.md)
- [Cadena organizacional](../rrhh/cadena-organizacional.md)
- [Vision general de acciones](../acciones/vision-general.md)
