---
title: "Perfil desde Mi Panel"
slug: "mi-panel/perfil"
module: "mi-panel"
screen: "/perfil"
summary: "Explica como acceder al perfil personal y que informacion basica de identidad y contexto se reutiliza dentro de Mi Panel."
roles: ["admin", "gerente", "auditor", "jefe", "usuario"]
tags: ["mi-panel", "perfil", "identidad"]
relatedRoutes: ["/perfil", "/mi-panel", "/api/context/user"]
entity: "personnel"
order: 30
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

La ruta `/perfil` funciona como un acceso directo relacionado con Mi Panel. En la implementacion actual, esa ruta redirige a `/mi-panel?tab=perfil`, por lo que el perfil no se maneja como modulo separado sino como entrada vinculada al panel personal. Su objetivo es llevar al usuario a su informacion principal sin obligarlo a navegar por menus mas amplios.

Dentro del contexto de Mi Panel, el perfil se apoya en los datos de personal y usuario: nombre, correo, puesto, departamento, fotografia y organizacion. Esa informacion aparece en el encabezado y sirve de base para entender por que el sistema muestra ciertas asignaciones o permisos.

## Para que sirve

Sirve para validar que la identidad operativa este bien representada en el sistema. Si el puesto o el departamento no coinciden con la realidad, pueden verse afectadas las asignaciones de procesos, objetivos o indicadores. Por eso conviene revisar esta informacion cuando el panel no refleja el trabajo esperado.

Tambien ayuda a supervisores y administradores a distinguir si un problema es de acceso, de configuracion organizacional o de datos personales incompletos.

## Como se usa

Ingresa por `/perfil` o desde accesos internos que lleven a Mi Panel. Una vez dentro, revisa en el encabezado el nombre visible, el puesto, el departamento y la organizacion asociada. Si esos datos son correctos, las asignaciones deberian responder a esa estructura. Si no coinciden, corresponde pedir ajuste al responsable con permisos de configuracion.

En la version observada del codigo, la redireccion existe de forma explicita, mientras que la visualizacion detallada por pestana depende de la experiencia cargada en Mi Panel. Si en tu cuenta no aparece una seccion diferenciada de perfil tras la redireccion, usa igualmente la informacion del encabezado como referencia valida del contexto personal. [VERIFICAR]

## Errores frecuentes

- Pensar que `/perfil` abre una pantalla totalmente independiente. Hoy el acceso deriva a Mi Panel.
- Corregir tareas o procesos antes de confirmar si el puesto y el departamento del usuario estan bien informados.
- Confundir el perfil del usuario con permisos globales del sistema; ambos se relacionan, pero no son lo mismo.

## Documentos relacionados

- [Vision general de Mi Panel](./vision-general.md)
- [Trabajo y asignaciones](./trabajo-y-asignaciones.md)
- [Capacitaciones y evaluaciones](../rrhh/capacitaciones-y-evaluaciones.md)
