---
title: "Incidentes SST"
slug: "hse/incidentes-sst"
module: "hse"
screen: "/hse/incidentes"
summary: "Como registrar y gestionar incidentes, accidentes y casi-accidentes de seguridad y salud en el trabajo (ISO 45001)."
roles: ["admin", "hse_manager", "supervisor"]
tags: ["hse", "incidentes", "sst", "iso_45001", "accidentes", "casi-accidente"]
relatedRoutes: ["/hse/incidentes", "/hse/peligros", "/api/hse/incidentes"]
entity: "hse_incidente"
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-25"
---

## Que es

El modulo de Incidentes SST registra y gestiona todos los eventos relacionados con seguridad y salud en el trabajo: accidentes con lesion, accidentes sin lesion (daño material), incidentes y casi-accidentes. Es parte del Pack HSE y cubre el requisito de la clausula 9.1.3 y 10.2 de ISO 45001:2018.

## Para que sirve

Permite documentar cada evento de manera trazable, identificar la causa raiz, registrar las acciones inmediatas tomadas y derivar hallazgos o acciones correctivas cuando corresponde.

El tablero muestra incidentes abiertos, en investigacion y cerrados, con indicadores de frecuencia y gravedad. Los incidentes graves generan una alerta visible en Mi Panel y en el asistente Don Candido.

## Como se usa

1. Ingresa por `/hse/incidentes` y usa `Nuevo Incidente` para abrir el formulario.
2. Completa el tipo de evento (accidente, incidente, casi-accidente), fecha, area afectada, descripcion del hecho y personas involucradas.
3. Evalua la gravedad (leve, moderado, grave, fatal) y el tipo de lesion si aplica.
4. Registra la accion inmediata tomada en el campo correspondiente.
5. El sistema crea el registro en estado `abierto`. El responsable HSE puede avanzar el estado a `en_investigacion` y luego a `cerrado` una vez completado el informe de causa raiz.
6. Para incidentes graves (gravedad `grave` o `fatal`), el sistema activa una alerta en el panel principal y en el contexto del asistente IA.

## Investigacion de causa raiz

Desde el detalle del incidente podes acceder a la seccion de investigacion. Alli se registra:
- Descripcion detallada del hecho
- Causa inmediata (el acto o condicion insegura que desencadeno el evento)
- Causa raiz (el factor organizacional o de sistema subyacente)
- Medidas correctivas propuestas

El sistema permite derivar directamente desde la investigacion hacia el modulo de Hallazgos o Acciones Correctivas.

## Errores frecuentes

- Registrar solo accidentes graves y omitir casi-accidentes, perdiendo oportunidad de prevencion.
- No completar la investigacion de causa raiz y cerrar el incidente sin acciones derivadas.
- Duplicar el mismo evento en distintos registros por falta de coordinacion entre areas.

## Documentos relacionados

- [Identificacion de Peligros](./peligros.md)
- [EPP](./epp.md)
- [Vision general de hallazgos](../hallazgos/vision-general.md)
- [Creacion de acciones](../acciones/creacion-de-acciones.md)
