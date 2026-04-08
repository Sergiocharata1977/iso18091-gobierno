---
title: "OpenClaw — Terminal de comandos IA"
slug: "don-candido/openclaw"
module: "don-candido"
screen: "/admin/openclaw"
summary: "Como conectar herramientas externas al asistente Don Candido usando el protocolo OpenClaw para que ejecute acciones reales desde el chat."
roles: ["admin", "gerente"]
tags: ["don-candido", "openclaw", "ia", "automatizacion", "integracion", "terminal"]
relatedRoutes: ["/admin/openclaw", "/api/public/openclaw/execute", "/api/public/openclaw/skills"]
entity: "openclaw_skill"
order: 50
status: "active"
category: "tecnico"
lastValidated: "2026-03-21"
---

## Que es OpenClaw

OpenClaw es el protocolo que permite a herramientas externas (bots, scripts, sistemas de terceros) ejecutar "skills" del asistente Don Cándido. Una skill es una acción concreta que Don Cándido puede realizar: consultar datos, completar formularios, registrar eventos.

El nombre viene de "Open" (abierto, protocolo público) + "Claw" (garra, la capacidad de tomar acción).

## Dos tipos de skills

### Skills de lectura (read)
Consultan datos sin modificar nada. Ejemplos:
- Listar las solicitudes pendientes de un cliente
- Consultar el estado de un equipo
- Obtener métricas del CRM

Las skills de lectura se ejecutan directamente.

### Skills de escritura (write)
Modifican datos. Requieren confirmación antes de ejecutarse. Ejemplos:
- Registrar un nuevo hallazgo de auditoría
- Actualizar el estado de una solicitud
- Crear un registro de mantenimiento

Las skills de escritura usan un flujo de doble confirmación: el sistema propone la acción → el operador confirma → se ejecuta.

## Como se configura (para el admin)

### 1. Obtener el Tenant Key

Ir a `/admin/openclaw`. En la pantalla se muestra el **Tenant Key** de tu organización. Este es el identificador que las herramientas externas usan para autenticarse.

Si no hay Tenant Key configurado, se usa la `public_api_key` de la organización (visible en la misma pantalla).

### 2. Habilitar skills

En la misma pantalla `/admin/openclaw` verás la lista de skills disponibles. Podés habilitar o deshabilitar cada una para tu organización.

### 3. Compartir con herramientas externas

Una herramienta externa (bot de WhatsApp, script, sistema de terceros) debe hacer POST a:

```
POST /api/public/openclaw/execute
Content-Type: application/json

{
  "tenant_key": "TU_TENANT_KEY",
  "skill_id": "list_solicitudes",
  "parameters": { "status": "pending" }
}
```

La respuesta incluye los datos o, para skills write, un `confirmation_token` para confirmar la acción.

## Marketplace de plugins

El catalogo canonico en `/admin/marketplace` muestra todos los plugins disponibles para tu organizacion. Desde ahi podes:
- Ver qué plugins están instalados
- Instalar plugins del catálogo
- Habilitar o deshabilitar plugins instalados

Cada plugin puede exponer skills adicionales en OpenClaw.

## Casos de uso típicos

- **Bot de WhatsApp propio:** el bot recibe mensajes, los manda a OpenClaw, Don Cándido responde con datos reales del sistema
- **Integración con ERP:** el ERP ejecuta skills para registrar automáticamente eventos en el SGC
- **Dashboard externo:** una pantalla en la planta consulta el estado de equipos sin login
- **Script de automatización:** un script nocturno ejecuta reportes y los envía por email

## Documentos relacionados

- [Don Cándido — Asistente IA](./asistente-ia.md)
- [WhatsApp](./whatsapp.md)
- [Plugin Manifest V1](../../reports/21_PLUGIN_MANIFEST_V1.md)
