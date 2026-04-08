---
title: "Contabilidad Central"
slug: "contabilidad/vision-general"
module: "contabilidad"
screen: "/contabilidad"
summary: "Resumen funcional del módulo contable: período actual, libro diario, balance, resultados y consultas operativas."
roles:
  - "admin"
  - "gerente"
  - "jefe"
tags:
  - "contabilidad"
  - "balance"
  - "asientos"
  - "facturacion"
  - "caja"
relatedRoutes:
  - "/contabilidad"
  - "/contabilidad/balance"
  - "/contabilidad/libro-diario"
  - "/contabilidad/mayor"
  - "/contabilidad/resultados"
  - "/contabilidad/periodos"
order: 40
status: "active"
category: "usuario"
lastValidated: "2026-03-26"
---

El módulo **Contabilidad Central** consolida el libro contable del tenant. Desde aquí se pueden consultar:

- El **período contable actual** y su estado (`abierto` o `cerrado`).
- Los **asientos** del libro diario generados por otros módulos o por carga manual.
- El **mayor** por cuenta contable.
- El **balance de sumas y saldos**.
- El **estado de resultados** del período.

## Qué puede responder Don Cándido con contexto contable

Si el contexto contable está disponible, Don Cándido puede ayudar con preguntas como:

- "¿Cuál es el saldo de caja?"
- "¿Cuánto se facturó este mes?"
- "¿El balance cuadra?"
- "¿Cuáles fueron los últimos asientos?"

## Cómo interpretar las vistas

- **Libro diario:** muestra asientos ordenados por fecha y documento.
- **Mayor:** muestra movimientos y saldo acumulado por cuenta.
- **Balance:** agrupa saldos por naturaleza contable.
- **Resultados:** resume ingresos, egresos y resultado neto del período.
- **Períodos:** controla apertura y cierre. Un período cerrado bloquea nuevos asientos.

## Limitaciones

Don Cándido responde con el contexto del tenant y del período actual cargado. Si el usuario pide un detalle que no está presente en el contexto, debe aclararlo y derivar al módulo de Contabilidad para validar el dato exacto.
