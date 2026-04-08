---
title: "Configuracion de asignaciones en Mi Panel"
slug: "mi-panel/configuracion-de-asignaciones"
module: "mi-panel"
screen: "/mi-panel"
summary: "Guia para responsables que necesitan ajustar puesto, departamento, procesos, objetivos e indicadores visibles en Mi Panel."
roles: ["admin", "gerente", "jefe", "super_admin"]
tags: ["mi-panel", "configuracion", "asignaciones"]
relatedRoutes: ["/mi-panel", "/api/rrhh/positions", "/api/rrhh/departments", "/api/processes/definitions", "/api/quality/objectives", "/api/quality/indicators"]
entity: "assignment_configuration"
order: 40
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

Mi Panel incluye una capa de configuracion para usuarios con permisos de edicion. Desde esa interfaz se ajustan las relaciones entre la persona y la estructura del sistema: puesto, departamento, procesos asignados, objetivos y indicadores. La configuracion no cambia solo la vista del panel; cambia el contexto con el que el usuario trabaja todos los dias.

En el codigo actual esa gestion se abre desde el boton de configuracion del encabezado y se apoya en catalogos de RRHH, procesos y calidad para proponer opciones disponibles.

## Para que sirve

Sirve para corregir paneles incompletos, reasignar responsabilidades y mantener consistencia entre la estructura organizacional y el seguimiento operativo. Cuando un colaborador cambia de puesto o asume nuevos procesos, esta configuracion permite actualizar rapidamente lo que ve en Mi Panel sin duplicar registros.

Tambien es una herramienta de control para evitar que una persona quede con indicadores u objetivos que ya no le corresponden.

## Como se usa

Desde Mi Panel abre la configuracion si tu rol permite edicion. El sistema consulta catalogos de puestos, departamentos, procesos, objetivos e indicadores. Primero revisa el puesto, porque de el puede inferirse o heredarse un departamento. Despues valida los procesos asignados y, por ultimo, los objetivos e indicadores relacionados.

Antes de guardar, confirma que la combinacion sea coherente. Un error comun es asignar indicadores sin el proceso asociado, lo que genera paneles poco claros. Tras guardar, refresca el panel para confirmar que el encabezado, la vista global y la barra lateral ya reflejan la nueva estructura.

## Errores frecuentes

- Editar asignaciones sin confirmar el puesto actual del usuario.
- Cargar objetivos o indicadores que no guardan relacion con los procesos elegidos.
- Hacer cambios y no refrescar el panel, pensando que el guardado fallo.

## Documentos relacionados

- [Trabajo y asignaciones](./trabajo-y-asignaciones.md)
- [Perfil](./perfil.md)
- [Vision general de procesos](../procesos/vision-general.md)
- [Indicadores y objetivos de procesos](../procesos/indicadores-y-objetivos.md)
