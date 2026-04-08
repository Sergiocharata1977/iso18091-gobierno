---
title: "Cadena organizacional"
slug: "rrhh/cadena-organizacional"
module: "rrhh"
screen: "/rrhh/personal"
summary: "Explica como se relacionan departamentos, puestos y personal en RRHH."
roles: ["admin", "gerente", "jefe"]
tags: ["rrhh", "departamentos", "puestos", "personal"]
relatedRoutes: ["/rrhh/departments", "/rrhh/positions", "/rrhh/personal"]
entity: "personnel"
order: 20
status: "active"
category: "usuario"
lastValidated: "2026-03-03"
---

## Que es

La cadena organizacional define la relacion entre departamentos, puestos y personas dentro de la aplicacion.

## Para que sirve

Permite ordenar la estructura real de la empresa, evitar asignaciones inconsistentes y heredar correctamente el departamento cuando se elige un puesto para un empleado.

## Como se usa

1. Crear primero los departamentos raiz y, si corresponde, sus subdepartamentos.
2. Crear los puestos indicando a que departamento pertenecen.
3. Al alta o edicion de personal, seleccionar el puesto correcto.
4. Verificar que el departamento mostrado coincida con el puesto elegido.
5. Usar esta estructura como base para reportes, evaluaciones y asignaciones cruzadas con otros modulos.

## Errores frecuentes

- Crear puestos sin departamento: la estructura queda incompleta y rompe la trazabilidad.
- Cambiar manualmente el departamento de una persona sin revisar su puesto: puede generar incoherencias.
- Mezclar departamentos operativos con puestos: un departamento agrupa, un puesto define una funcion concreta.

## Documentos relacionados

- [Vision general de RRHH](./vision-general.md)
- [Capacitaciones y evaluaciones](./capacitaciones-y-evaluaciones.md)
- [Mapa de procesos](../procesos/mapa-de-procesos.md)
