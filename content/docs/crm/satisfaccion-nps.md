---
title: "CRM — Satisfaccion y NPS"
slug: "crm/satisfaccion-nps"
module: "crm"
screen: "/crm/satisfaccion"
summary: "Como ver el NPS de la organizacion, la distribucion de puntuaciones y las respuestas de clientes a encuestas de satisfaccion."
roles: ["admin", "gerente"]
tags: ["crm", "nps", "encuestas", "satisfaccion", "clientes"]
relatedRoutes: ["/crm/satisfaccion", "/mejoras/encuestas", "/api/crm/satisfaccion"]
entity: "survey_response"
order: 50
status: "active"
category: "usuario"
lastValidated: "2026-03-12"
---

## Que es

La pagina `/crm/satisfaccion` muestra el Net Promoter Score (NPS) de la organizacion calculado en tiempo real a partir de las respuestas de encuestas de clientes. Es el panel central para medir la experiencia del cliente con el dealer.

El NPS se calcula como: porcentaje de promotores (puntuacion 9-10) menos porcentaje de detractores (puntuacion 0-6). Los pasivos (7-8) no suman ni restan.

## Para que sirve

Sirve para monitorear de forma continua la satisfaccion de clientes post-compra y post-servicio, identificar tendencias, detectar clientes insatisfechos (detractores) y tomar acciones correctivas dentro del CRM.

Complementa el modulo de encuestas en `/mejoras/encuestas` que gestiona las encuestas ISO anuales. Las encuestas NPS son disparadas automaticamente por el sistema cuando se registra una compra o se cierra un servicio.

## Como se usa

### Ver el NPS actual

Ingresar a `/crm/satisfaccion`. La pantalla muestra:

- **NPS Score** visible en grande: numero entre -100 y 100
- **Distribucion de puntuaciones**: grafico de barras del 0 al 10 con cantidad de respuestas por puntuacion
- **Ultimas 20 respuestas**: tabla con fecha, nombre del cliente, puntuacion y comentarios
- **Filtro de periodo**: ultimo mes, ultimo trimestre, este ano

### Filtrar por periodo

Usar el selector de periodo en la parte superior para acotar las metricas. El NPS y la distribucion se recalculan al cambiar el filtro.

### Disparar encuestas manualmente

Las encuestas se disparan automaticamente cuando el sistema registra una compra o cierra una solicitud de servicio. Tambien es posible crear encuestas manuales desde `/mejoras/encuestas` asignando el tipo `post_compra` o `post_servicio` y un cliente.

El cliente recibe el link de la encuesta en su App Cliente. No se requiere que el cliente tenga sesion activa para responderla: el link usa un token unico de acceso anonimo.

## Errores frecuentes

- El NPS muestra 0 con pocas respuestas: normal hasta acumular al menos 10 respuestas. El calculo es estadisticamente valido a partir de esa cantidad.
- El cliente no recibio la encuesta: verificar que el sistema haya generado el `externalToken` (campo en Firestore) y que la encuesta este en estado `active`.
- Las respuestas no aparecen en el dashboard: las respuestas se almacenan en la subcoleccion `responses` del documento de encuesta. Verificar que el POST al endpoint publico haya completado correctamente.

## Documentos relacionados

- [App Cliente — Vision general](../app-cliente/vision-general.md)
- [CRM — Vision general](./vision-general.md)
