---
title: "SGSI - Seguridad de la Informacion ISO 27001"
slug: "sgsi/vision-general"
module: "sgsi"
screen: "/sgsi/dashboard"
summary: "Explica el modulo SGSI: gestion de riesgos de seguridad, activos, controles y cumplimiento ISO 27001."
roles: ["admin", "gerente", "super_admin"]
tags: ["sgsi", "iso27001", "seguridad", "informacion", "riesgos", "activos"]
relatedRoutes: ["/sgsi/dashboard", "/sgsi/contexto", "/sgsi/riesgos", "/sgsi/soa", "/sgsi/controles", "/sgsi/activos", "/sgsi/accesos", "/sgsi/incidentes", "/sgsi/audit-log", "/sgsi/proveedores", "/sgsi/continuidad", "/sgsi/clasificacion", "/sgsi/vulnerabilidades", "/sgsi/framework-mapper"]
order: 10
status: "active"
category: "usuario"
lastValidated: "2026-03-30"
---

## Que es

El SGSI (Sistema de Gestion de Seguridad de la Informacion) implementa los requisitos de ISO 27001/27002. Cubre la gestion de activos de informacion, riesgos, controles de seguridad, accesos, incidentes y continuidad del negocio.

## Para que sirve

Permite a la organizacion gestionar los riesgos de seguridad de la informacion de forma sistematica, documentar controles y demostrar cumplimiento ante auditorias ISO 27001.

## Estructura del modulo

1. **Dashboard SGSI** → vision consolidada del estado de cumplimiento
2. **Contexto del SGSI** → alcance, partes interesadas y contexto de la organizacion
3. **Gestion de Riesgos** → identificacion, evaluacion y tratamiento de riesgos de informacion
4. **Declaracion de Aplicabilidad (SOA)** → que controles aplican y cuales no, con justificacion
5. **Catalogo de Controles** → implementacion de los 93 controles del Anexo A ISO 27002
6. **Inventario de Activos** → registro de activos de informacion criticos
7. **Gestion de Accesos** → control de privilegios y autorizaciones
8. **Incidentes de Seguridad** → registro y respuesta a incidentes
9. **Log de Auditoria** → trazabilidad de acciones en el sistema
10. **Proveedores Criticos** → evaluacion de terceros que manejan informacion sensible
11. **Continuidad y Backups** → planes de contingencia y recuperacion
12. **Clasificacion de Datos** → niveles de confidencialidad de activos de informacion
13. **Vulnerabilidades** → gestion de vulnerabilidades tecnicas detectadas
14. **Mapeo de Frameworks** → cruce de controles entre ISO 27001, NIST, CIS, etc.

## Errores frecuentes

- Completar la SOA sin primero hacer la evaluacion de riesgos: el orden logico es riesgos → tratamiento → SOA.
- No actualizar el inventario de activos cuando cambia la infraestructura.

## Documentos relacionados

- [Vision general de procesos](../procesos/vision-general.md)
- [Vision general de mejoras](../hallazgos/modulo-mejoras.md)
