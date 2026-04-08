---
title: "Editor de Registros Configurables"
slug: "registros/editor-registros"
module: "registros"
screen: "/registros"
summary: "Como crear y usar registros operativos personalizados sin codigo, para evidenciar el cumplimiento de requisitos ISO sin duplicar modulos existentes."
roles: ["admin", "gerente"]
tags: ["registros", "editor", "formularios", "personalizable", "iso_9001", "evidencia"]
relatedRoutes: ["/registros", "/api/registers"]
entity: "custom_register_schema"
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-25"
---

## Que es

El Editor de Registros es una herramienta de configuracion sin codigo que permite crear formularios y registros operativos personalizados adaptados a las necesidades especificas de cada organizacion. Los registros generados sirven como evidencia documentada del cumplimiento ISO 9001 (clausula 7.5) y de otras normas del sistema integrado.

A diferencia de los modulos especializados (auditorias, hallazgos, RRHH), el editor de registros esta pensado para capturar datos operativos propios de cada organizacion que no encajan en los modulos estandar.

## Para que sirve

Ejemplos de uso tipico:
- Registro de temperatura de almacenamiento (inocuidad alimentaria)
- Checklist de mantenimiento preventivo de equipos
- Registro de calibracion de instrumentos de medicion
- Control de recepcion de materias primas
- Planilla de inspeccion de vehiculos
- Registro de asistencia a capacitaciones externas

Cada registro queda vinculado a la organizacion y puede ser exportado como evidencia en auditorias.

## Como se usa

### Crear un nuevo tipo de registro

1. Ingresa por `/registros` y selecciona `Nuevo Tipo de Registro`.
2. Asigna un nombre descriptivo (ej: "Control de temperatura - Camara Fria 1").
3. Agrega los campos que necesitas usando el editor visual:
   - **Texto corto / largo**: para descripciones y observaciones
   - **Numero**: para valores numericos (temperatura, peso, cantidad)
   - **Fecha / hora**: para timestamps de medicion
   - **Lista de opciones**: para estados o categorias predefinidas
   - **Checkbox**: para items de verificacion tipo checklist
4. Configura quienes pueden crear entradas (roles) y quienes solo pueden ver.
5. Guarda el schema. Ya podes empezar a cargar entradas.

### Cargar entradas

1. Desde el listado de registros, selecciona el tipo y usa `Nueva Entrada`.
2. Completa los campos del formulario generado.
3. Guarda. La entrada queda registrada con fecha, hora y usuario que la cargo.

### Exportar para auditorias

Desde el listado de entradas podes filtrar por rango de fechas y exportar a CSV o PDF para presentar como evidencia.

## Diferencias con modulos especializados

| Modulo especializado | Editor de registros |
|---|---|
| Auditorias, hallazgos, RRHH | Registros operativos propios |
| Flujos y estados definidos | Estructura libre |
| Integracion con acciones y normas | Captura de datos con evidencia |
| No configurable | 100% configurable por admin |

Ambos complementan la evidencia documentada del sistema de gestion. No se duplica: los hallazgos van al modulo de hallazgos, los registros operativos van al editor.

## Errores frecuentes

- Crear un registro para algo que ya tiene modulo dedicado (ej: crear "registro de auditorias" cuando existe el modulo de auditorias).
- Usar campos de texto libre para datos que deberían ser listas de opciones, dificultando el analisis posterior.
- No asignar responsables de carga, generando registros vacios sin seguimiento.

## Documentos relacionados

- [Vision general de documentos](../documentos/vision-general.md)
- [Vision general de hallazgos](../hallazgos/vision-general.md)
