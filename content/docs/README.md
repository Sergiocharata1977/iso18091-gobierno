# Gobierno de `content/docs`

Este directorio concentra la documentacion funcional migrada desde `docs-9001app` hacia el hub interno de ayuda.

## Convencion de nombres

- Cada archivo debe usar `kebab-case`.
- La ruta debe respetar `content/docs/{modulo}/{slug}.md`.
- El valor de `slug` en frontmatter debe coincidir con la ruta relativa sin extension.

## Template obligatorio

Todos los documentos deben incluir este frontmatter:

```md
---
title: 'Titulo visible'
slug: 'modulo/slug'
module: 'modulo'
screen: '/ruta-principal'
summary: 'Resumen corto orientado a uso.'
roles: ['admin', 'gerente', 'jefe', 'usuario']
tags: ['modulo', 'tema']
relatedRoutes: ['/ruta-principal']
entity: 'entidad'
order: 10
status: 'active'
category: 'usuario'
lastValidated: '2026-03-03'
---
```

## Secciones fijas

Todos los documentos deben mantener estas secciones, en este orden:

1. `## Que es`
2. `## Para que sirve`
3. `## Como se usa`
4. `## Errores frecuentes`
5. `## Documentos relacionados`

## Reglas de validacion

- `lastValidated` es obligatorio en todos los documentos.
- Si una guia fue adaptada desde contenido tecnico, debe reescribirse como ayuda de usuario y no como documento de arquitectura.
- El contenido debe referirse a rutas y pantallas reales del producto, evitando roadmap, deuda tecnica o estados temporales.
- El catalogo canonico de plugins/capabilities es `/admin/marketplace`. Si una capability tiene manifest formal en `PLATFORM_PLUGIN_MANIFESTS`, la documentacion debe referirse al plugin del marketplace y no al seed legacy.

## Proceso de revision por cambios de UX

1. Cuando cambia una pantalla, revisar los documentos del modulo y sus `relatedRoutes`.
2. Actualizar pasos, etiquetas visibles, mensajes de error y enlaces internos afectados.
3. Volver a validar el documento en ambiente funcional y actualizar `lastValidated`.
4. Si el cambio altera navegacion o tareas clave, agregar o ajustar documentos relacionados del mismo modulo.
