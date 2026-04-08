---
title: "Detalle de auditoria"
slug: "auditorias/detalle-de-auditoria"
module: "auditorias"
screen: "/mejoras/auditorias/[id]"
summary: "Explica como trabajar dentro de una auditoria especifica, desde la revision general hasta la verificacion de puntos de norma y el cierre."
roles: ["admin", "gerente", "auditor"]
tags: ["auditorias", "detalle", "puntos-de-norma"]
relatedRoutes: ["/mejoras/auditorias/[id]", "/api/audits/[id]", "/api/audits/[id]/verify-norm-point", "/api/audits/[id]/complete"]
entity: "audit"
order: 40
status: "active"
category: "usuario"
lastValidated: "2026-03-04"
---

## Que es

El detalle de auditoria es la pantalla donde la auditoria deja de ser un simple registro planificado y pasa a gestionarse en profundidad. Alli se muestran titulo, alcance, estado, fecha planificada, auditor lider, tipo y progreso de verificacion de puntos de norma.

Ademas de los datos generales, esta vista integra comentarios, informe final, evidencias, lista de hallazgos y herramientas de cierre.

## Para que sirve

Sirve para documentar la ejecucion real de la auditoria. La evaluacion de puntos de norma, los comentarios y los hallazgos deben quedar vinculados a una auditoria concreta para conservar trazabilidad. Por eso esta pantalla es el centro del trabajo del auditor una vez que la auditoria ya fue creada.

Tambien ayuda a la organizacion a cerrar auditorias con criterio, porque el estado se apoya en elementos cargados y no solo en una decision informal.

## Como se usa

Entra desde la lista o el Kanban de auditorias. Revisa primero los datos generales para confirmar que estas trabajando sobre el registro correcto. Luego avanza sobre comentarios e informe, agrega puntos de norma si hiciera falta y usa `Evaluar` para registrar el estado de conformidad de cada punto pendiente.

Si durante la verificacion aparece una desviacion, puedes registrar hallazgos relacionados desde la propia auditoria. Cuando el trabajo este completo y la auditoria siga en progreso, el boton de cierre permite formalizar el fin del ciclo. Conviene revisar hallazgos y evidencias antes de cerrar para no dejar temas sueltos.

## Errores frecuentes

- Querer cerrar la auditoria sin completar verificaciones clave o sin revisar hallazgos derivados.
- Cargar observaciones sueltas en comentarios cuando deberian transformarse en hallazgos.
- Volver atras pensando que el detalle no guarda informacion, cuando la pantalla concentra la mayor parte del trabajo operativo.

## Documentos relacionados

- [Planificacion de auditorias](./planificacion.md)
- [Vision general de hallazgos](../hallazgos/vision-general.md)
- [Creacion de acciones](../acciones/creacion-de-acciones.md)
