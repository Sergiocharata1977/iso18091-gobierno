---
title: "Control de EPP"
slug: "hse/epp"
module: "hse"
screen: "/hse/epp"
summary: "Como gestionar el inventario, asignacion y vencimiento de Equipos de Proteccion Personal (EPP) para cumplir ISO 45001."
roles: ["admin", "hse_manager", "supervisor", "almacen"]
tags: ["hse", "epp", "iso_45001", "equipos_proteccion", "inventario", "vencimiento"]
relatedRoutes: ["/hse/epp", "/api/hse/epp"]
entity: "hse_epp"
order: 30
status: "active"
category: "usuario"
lastValidated: "2026-03-25"
---

## Que es

El modulo de EPP gestiona el inventario, la asignacion a trabajadores y el seguimiento de vencimientos de los Equipos de Proteccion Personal. Cubre el requisito de la clausula 8.1.2 de ISO 45001:2018 sobre controles de ingenieria y proteccion personal.

## Para que sirve

Permite mantener un registro actualizado de cada tipo de EPP (cascos, guantes, arneses, calzado de seguridad, proteccion respiratoria, etc.), saber cuantos hay disponibles, a quien estan asignados y cuando vencen.

El sistema genera alertas cuando hay EPP con fecha de vencimiento proxima o vencidos, visible en el panel principal y en el asistente Don Candido cuando el pack_hse esta activo.

## Como se usa

### Registrar EPP

1. Ingresa por `/hse/epp` y usa `Nuevo EPP` para agregar un tipo de equipo al inventario.
2. Completa el tipo, descripcion, norma de referencia (ej: EN 397 para cascos), fecha de adquisicion y fecha de vencimiento.
3. Indica la cantidad disponible en stock.

### Asignar EPP a un trabajador

1. Desde el listado de EPP, selecciona el equipo y usa `Asignar`.
2. Busca al trabajador por nombre o legajo.
3. Confirma la asignacion. El sistema descuenta del stock disponible y registra la fecha de entrega.
4. Podes registrar la devolucion cuando el equipo se renueva o el trabajador se desvincula.

### Controlar vencimientos

- El tablero muestra una vista de estado de todos los EPP con semaforo de vencimiento.
- **Verde**: vigente, mas de 30 dias para vencer.
- **Amarillo**: proximo a vencer (menos de 30 dias).
- **Rojo**: vencido o sin fecha registrada.

Los EPP vencidos generan una alerta en Mi Panel que solo desaparece cuando se actualizan.

## Errores frecuentes

- No registrar la fecha de vencimiento al agregar un EPP, dejando el campo en blanco.
- Asignar EPP vencidos sin darse cuenta porque no se revisa el tablero periodicamente.
- No registrar devoluciones, generando desajuste entre el stock fisico y el registrado.

## Documentos relacionados

- [Incidentes SST](./incidentes-sst.md)
- [Identificacion de Peligros](./peligros.md)
- [Vision general del modulo HSE](./vision-general.md)
