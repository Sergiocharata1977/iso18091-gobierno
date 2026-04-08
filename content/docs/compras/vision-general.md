---
title: "Compras"
slug: "compras/vision-general"
module: "dealer"
screen: "/compras"
summary: "Explica el modulo de Compras del sistema dealer: gestion de ordenes de compra y seguimiento de proveedores."
roles: ["admin", "gerente", "jefe"]
tags: ["compras", "dealer", "proveedores", "ordenes"]
relatedRoutes: ["/compras"]
order: 20
status: "active"
category: "usuario"
lastValidated: "2026-03-30"
---

## Que es

El modulo de Compras gestiona las ordenes de compra a proveedores dentro del ecosistema dealer. Esta vinculado con las solicitudes de repuestos y el catalogo de productos.

## Para que sirve

Permite registrar y hacer seguimiento de las compras realizadas a proveedores, con trazabilidad desde la solicitud del cliente hasta la recepcion del producto.

## Como se usa

1. Ingresar a **Compras** desde el menu Procesos Operativos.
2. Ver las ordenes de compra en curso y su estado.
3. Crear una nueva orden vinculando a un proveedor y producto del catalogo.
4. Actualizar el estado de la orden a medida que avanza (pendiente → en tramite → recibida).
5. Al completar la recepcion, el stock o el estado de la solicitud del cliente se actualiza automaticamente.

## Errores frecuentes

- Crear ordenes de compra sin vincular a la solicitud origen: se pierde la trazabilidad cliente-proveedor.

## Documentos relacionados

- [Catalogo de productos](../dealer/catalogo-productos.md)
- [Solicitudes y flujos](../dealer/solicitudes-flujo.md)
