---
title: "Terminales y Sentinel"
slug: "terminales/vision-general"
module: "terminales"
screen: "/terminales"
summary: "Explica como gestionar las terminales Sentinel: agentes IA locales instalados en PCs de empleados."
roles: ["admin", "gerente", "super_admin"]
tags: ["terminales", "sentinel", "agente-local", "politicas", "rpa"]
relatedRoutes: ["/terminales", "/terminales/politicas"]
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-30"
---

## Que es

Terminales es el panel de gestion de los agentes Sentinel: pequenos programas de IA instalados en las PCs de los empleados que pueden ejecutar tareas supervisadas (navegacion, formularios, capturas) segun politicas definidas en el SGC.

## Para que sirve

Permite a los administradores ver que terminales estan conectadas, revisar el historial de acciones ejecutadas por Sentinel, configurar politicas de uso y poner en cuarentena terminales sospechosas.

## Como se usa

1. Ingresar a **Terminales** desde el menu lateral.
2. Ver el listado de terminales registradas con estado (activa, inactiva, cuarentena).
3. Hacer clic en una terminal para ver su historial de acciones.
4. Ir a **Politicas** para definir que acciones puede ejecutar Sentinel por departamento, puesto o terminal individual.
5. Usar el boton de cuarentena para bloquear inmediatamente una terminal comprometida.

## Como se instala Sentinel

1. El administrador genera un codigo de vinculacion desde el panel.
2. El empleado instala el agente `don-candido-agent` en su PC.
3. El agente se registra con el codigo y queda vinculado a la organizacion.

## Errores frecuentes

- Definir politicas muy amplias: Sentinel debe operar con el minimo privilegio necesario.
- No revisar el log de acciones periodicamente: las anomalias aparecen en el historial.

## Documentos relacionados

- [Centro Agentico](../centro-agentico/vision-general.md)
- [Sistema multiagente](../don-candido/sistema-multiagente.md)
