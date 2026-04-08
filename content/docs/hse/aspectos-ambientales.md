---
title: "Aspectos e Impactos Ambientales"
slug: "hse/aspectos-ambientales"
module: "hse"
screen: "/hse/aspectos-ambientales"
summary: "Como identificar, evaluar y controlar aspectos ambientales significativos segun ISO 14001:2015, clausula 6.1.2."
roles: ["admin", "hse_manager", "responsable_ambiental"]
tags: ["hse", "iso_14001", "aspectos_ambientales", "impactos", "significatividad", "medio_ambiente"]
relatedRoutes: ["/hse/aspectos-ambientales", "/hse/objetivos-ambientales", "/api/hse/aspectos-ambientales"]
entity: "hse_aspecto_ambiental"
order: 20
status: "active"
category: "usuario"
lastValidated: "2026-03-25"
---

## Que es

El modulo de Aspectos Ambientales es la implementacion de la clausula 6.1.2 de ISO 14001:2015. Permite identificar las actividades, productos y servicios de la organizacion que interactuan con el medio ambiente (aspectos) y evaluar los efectos que esas interacciones pueden causar (impactos).

Cada aspecto se evalua para determinar si es **significativo**, lo que define si requiere un objetivo ambiental, un control operacional especifico o aparece en la comunicacion a partes interesadas.

## Para que sirve

La matriz de aspectos e impactos es el insumo principal para:
- Definir los objetivos ambientales de la organizacion (clausula 6.2)
- Establecer controles operacionales ambientales (clausula 8.1)
- Determinar que aspectos comunicar a contratistas y proveedores
- Evidenciar ante auditores el cumplimiento del analisis de contexto ambiental

## Como se usa

1. Ingresa por `/hse/aspectos-ambientales` para ver la matriz completa.
2. Usa `Nuevo Aspecto` para registrar una actividad con su aspecto e impacto asociado.
3. Completa el proceso o area de origen, la descripcion del aspecto (ej: generacion de residuos peligrosos) y el impacto ambiental potencial (ej: contaminacion del suelo).
4. Evalua la **significatividad** mediante los criterios configurados (frecuencia, severidad, alcance, reversibilidad). El sistema calcula automaticamente si el aspecto es significativo.
5. Para aspectos significativos, el sistema sugiere crear un objetivo ambiental o un control operacional.
6. Filtra por condicion (normal, anormal, emergencia) para ver los aspectos segun el tipo de operacion.

## Criterios de significatividad

La evaluacion considera por defecto:
- **Severidad del impacto** (1-5): cuanto dano puede causar al medio ambiente
- **Frecuencia o probabilidad** (1-5): con que regularidad ocurre el aspecto
- **Alcance** (local, regional, global): extension geografica del impacto

Un aspecto se considera significativo cuando su puntaje supera el umbral configurado por el responsable ambiental. Los aspectos significativos aparecen destacados y generan una alerta en el contexto del asistente Don Candido.

## Errores frecuentes

- Evaluar solo las condiciones normales de operacion y omitir arranques, paradas y situaciones de emergencia.
- No revisar la matriz cuando se incorporan nuevos procesos o equipos.
- Marcar todos los aspectos como significativos, perdiendo el enfoque en los que realmente requieren control prioritario.

## Documentos relacionados

- [Objetivos Ambientales](./objetivos-ambientales.md)
- [Requisitos Legales](./requisitos-legales.md)
- [Vision general del modulo HSE](./vision-general.md)
