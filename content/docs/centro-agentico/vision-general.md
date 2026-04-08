---
title: "Centro Agentico"
slug: "centro-agentico/vision-general"
module: "agentes"
screen: "/centro-agentico"
summary: "Explica el Centro Agentico: panel de control para los agentes de IA autonomos del sistema."
roles: ["admin", "gerente", "super_admin"]
tags: ["agentes", "ia", "centro-agentico", "automatizacion", "sentinel"]
relatedRoutes: ["/centro-agentico", "/agentes", "/terminales"]
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-30"
---

## Que es

El Centro Agentico es el panel de supervision y control de los agentes de IA autonomos que operan en el sistema: AgentWorkerService (procesamiento en background), SagaService (workflows multi-paso) y Sentinel (agente local en terminales de empleados).

## Para que sirve

Permite monitorear el estado de los agentes, revisar el historial de acciones ejecutadas automaticamente y configurar los limites de autonomia de cada agente.

## Como se usa

1. Ingresar a **Centro Agentico** desde el menu lateral.
2. Ver el estado de los agentes activos y sus ultimas ejecuciones.
3. Revisar el log de acciones automaticas (asignaciones, alertas, integraciones).
4. Pausar o redirigir un agente si su comportamiento no es el esperado.
5. Configurar politicas de autonomia (que acciones requieren confirmacion humana).

## Errores frecuentes

- Ignorar acciones pendientes de confirmacion: los workflows en pausa esperan una decision humana.
- No revisar el log de errores: algunos agentes pueden fallar silenciosamente si no hay configuracion de notificaciones.

## Documentos relacionados

- [Asistente IA Don Candido](../don-candido/asistente-ia.md)
- [Sistema multiagente](../don-candido/sistema-multiagente.md)
- [Vision general de Terminales](../terminales/vision-general.md)
