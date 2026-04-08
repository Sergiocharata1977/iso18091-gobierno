# API Agents

Fecha de relevamiento: 2026-02-19
Base path esperada: `/api/agents`

## Estado general

Los siguientes endpoints solicitados no existen en el codigo actual:

- `src/app/api/agents/process/route.ts`
- `src/app/api/agents/stats/route.ts`
- `src/app/api/agents/jobs/route.ts`
- `src/app/api/agents/profiles/route.ts`

Estado: **Pendiente de implementacion**.

## Endpoints pendientes

### POST `/api/agents/process`

Estado: **Pendiente de implementacion**.

Objetivo sugerido:
- Recibir un `intent` y `payload`.
- Encolar o ejecutar proceso del agente.

### GET `/api/agents/stats`

Estado: **Pendiente de implementacion**.

Objetivo sugerido:
- Exponer metricas agregadas del worker y cola.

### GET `/api/agents/jobs`

Estado: **Pendiente de implementacion**.

Objetivo sugerido:
- Listar jobs por organizacion, estado y prioridad.

### GET `/api/agents/profiles`

Estado: **Pendiente de implementacion**.

Objetivo sugerido:
- Listar perfiles de agentes por puesto y capacidades.

## Rutas relacionadas actualmente disponibles

Aunque `/api/agents/*` no esta implementado, hay rutas MCP que consumen servicios de agentes:

- `GET /api/mcp/jobs`
- `GET /api/mcp/stats`

Estas rutas no reemplazan formalmente el contrato solicitado de `/api/agents/*`.
