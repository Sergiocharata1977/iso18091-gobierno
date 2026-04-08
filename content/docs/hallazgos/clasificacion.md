---
title: "Clasificacion de hallazgos"
slug: "hallazgos/clasificacion"
module: "hallazgos"
screen: "/mejoras/hallazgos"
summary: "Guia para clasificar hallazgos con criterio antes de avanzar a acciones, analisis o cierres."
roles: ["admin", "gerente", "auditor"]
tags: ["hallazgos", "clasificacion", "prioridad"]
relatedRoutes: ["/mejoras/hallazgos", "/api/findings"]
entity: "finding"
order: 20
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

La clasificacion de hallazgos es el criterio con el que decides que tipo de situacion estas registrando y que tratamiento necesita. Aunque el detalle exacto depende del formulario y de las reglas internas de la organizacion, en el sistema ya existe un recorrido pensado para separar registro inicial, acciones inmediatas y analisis posterior.

En la practica, una buena clasificacion evita que todo termine tratado con la misma urgencia o con el mismo tipo de accion.

## Para que sirve

Sirve para definir prioridad, responsables y profundidad de tratamiento. Una no conformidad con impacto directo en el sistema no deberia gestionarse igual que una observacion o una buena practica. Clasificar bien desde el inicio reduce errores posteriores, especialmente al momento de abrir acciones correctivas.

Tambien mejora la lectura gerencial, porque el conjunto de hallazgos se vuelve comparable y permite decidir donde intervenir primero.

## Como se usa

Antes de guardar un hallazgo, confirma si estas ante una desviacion que exige accion correctiva, una observacion que necesita seguimiento o una situacion que conviene documentar para mejora. Usa descripciones concretas y evita titulos ambiguos. Si el hallazgo proviene de auditoria, deja claro ese origen.

Cuando haya dudas entre dos categorias, prioriza el criterio mas util para el tratamiento posterior y valida con el auditor o responsable del proceso. Si una revision posterior demuestra que la clasificacion fue insuficiente, corrige el registro antes de abrir acciones derivadas.

## Errores frecuentes

- Clasificar por costumbre y no por evidencia.
- Usar categorias severas para todos los casos, saturando el modulo de prioridades altas.
- Registrar hallazgos sin indicar origen, proceso o contexto suficiente para clasificarlos luego.

## Documentos relacionados

- [Vision general de hallazgos](./vision-general.md)
- [Registro y analisis de hallazgos](./registro-y-analisis.md)
- [Creacion de acciones](../acciones/creacion-de-acciones.md)
