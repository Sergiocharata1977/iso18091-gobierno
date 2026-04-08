---
title: "Catalogo de productos dealer"
slug: "dealer/catalogo-productos"
module: "dealer"
screen: "/dealer/catalogo"
summary: "Como cargar y mantener el catalogo de maquinarias e implementos que se muestran en los formularios de la web."
roles: ["admin", "gerente"]
tags: ["catalogo", "productos", "maquinaria", "dealer", "precios"]
relatedRoutes: ["/dealer/catalogo"]
entity: "producto"
order: 20
status: "active"
category: "usuario"
lastValidated: "2026-03-08"
---

## Que es

Es la pantalla interna donde el equipo dealer administra los productos que se publican como opciones en los formularios comerciales de la web.

## Para que sirve

Sirve para mantener actualizado el catalogo de maquinarias, implementos, repuestos u otros productos, con su nombre, categoria, marca, modelo, descripcion, precios, imagen principal y estado de publicacion.

## Como se usa

1. Ingresar a `Dealer > Catalogo` en la ruta `/dealer/catalogo`.
2. Usar los filtros de categoria y estado para encontrar productos activos o inactivos.
3. Hacer clic en `Nuevo producto` para cargar un registro nuevo o seleccionar uno existente para editarlo.
4. Completar como minimo `Nombre` y `Categoria`. De forma opcional, agregar `Marca`, `Modelo`, `Descripcion`, `Precio contado`, `Precio lista` e `Imagen principal`.
5. Marcar `Destacado` si el producto debe tener prioridad visual en los formularios o listados que consumen el catalogo.
6. Revisar el switch `Activo` antes de guardar. Si queda inactivo, el producto no deberia usarse como opcion vigente.
7. Guardar los cambios. La pantalla confirma si el producto fue creado o actualizado correctamente.
8. Para retirar un producto sin perder historial, usar `Eliminar` o desactivarlo desde el switch de estado. En ambos casos la baja es logica y el producto queda inactivo.

## Errores frecuentes

- Intentar guardar sin `Nombre`: la pantalla muestra el mensaje `El nombre es obligatorio`.
- Cargar una URL invalida en la imagen principal: la API rechaza el dato y no guarda el producto.
- Confundir `Eliminar` con borrado definitivo: en esta pantalla la accion solo da de baja logica y deja el producto inactivo.
- Revisar solo productos activos cuando el registro fue desactivado: cambiar el filtro de estado a `Todos` o `Inactivos`.

## Documentos relacionados

- [Solicitudes dealer - Flujo y estados](./solicitudes-flujo.md)
- [Notificaciones WhatsApp - Dealer](./whatsapp-notificaciones.md)
