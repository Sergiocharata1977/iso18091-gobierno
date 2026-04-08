---
title: "Registro y analisis de hallazgos"
slug: "hallazgos/registro-y-analisis"
module: "hallazgos"
screen: "/mejoras/hallazgos"
summary: "Describe el paso a paso para registrar un hallazgo y completar la informacion que sostiene su analisis posterior."
roles: ["admin", "gerente", "auditor"]
tags: ["hallazgos", "registro", "analisis"]
relatedRoutes: ["/mejoras/hallazgos", "/mejoras/hallazgos/[id]", "/api/findings"]
entity: "finding"
order: 30
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

Registrar y analizar un hallazgo significa convertir una observacion o un problema detectado en un caso util para la mejora. El modulo permite crear el registro inicial desde la pantalla principal y completar despues informacion de descripcion, causa raiz, accion inmediata y seguimiento en el detalle.

La existencia de un detalle con secciones separadas muestra que el sistema espera un tratamiento progresivo y no una carga unica superficial.

## Para que sirve

Sirve para construir evidencia util. Un hallazgo solo aporta valor si explica que paso, donde ocurrio, cual fue su origen y que respuesta tuvo. Esa base es la que luego justifica decisiones, auditorias de seguimiento o apertura de acciones correctivas.

Tambien permite ordenar conversaciones entre areas, porque todos trabajan sobre el mismo registro en lugar de intercambiar versiones informales del problema.

## Como se usa

Desde `/mejoras/hallazgos` crea el hallazgo con nombre claro y descripcion concreta. Luego abre el detalle para completar informacion complementaria. Si el caso ya incluye una causa probable o una correccion inmediata, registrala en el espacio correspondiente. Si todavia no esta definida, deja documentado lo que se sabe y avanza cuando exista evidencia.

Durante el analisis, presta especial atencion al origen, al proceso implicado y al impacto real. Si el hallazgo requiere accion correctiva, el detalle puede dejar esa necesidad explicitada para continuar en el modulo Acciones.

## Errores frecuentes

- Cerrar el registro con una descripcion breve sin completar el contexto minimo.
- Confundir accion inmediata con causa raiz; una corrige el efecto, la otra explica el origen.
- Esperar al cierre para cargar todo junto, perdiendo trazabilidad de fechas y decisiones.

## Documentos relacionados

- [Clasificacion de hallazgos](./clasificacion.md)
- [Detalle del hallazgo](./detalle-del-hallazgo.md)
- [Fases y verificacion de acciones](../acciones/fases-y-verificacion.md)
