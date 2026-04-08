# Integracion IoT y Maquinaria v1 (2026-02-15)

## Alcance
- Ingesta de telemetria de sensores (batch) con pipeline `API -> normalizacion -> persistencia`.
- Conector bidireccional simulado para tareas de maquinaria:
  - Envio de tareas desde SIG Agro.
  - Consulta de tareas pendientes por maquinaria.
  - Recepcion de estados/acks desde maquinaria.
- Idempotencia, reintentos y logging tecnico con codigos normalizados.

## Endpoints v1
- `POST /api/agro/iot/telemetry`
  - Ingesta batch de lecturas de sensores.
  - Control de calidad de dato (`accepted`, `suspect`, `rejected`).
  - Codigos: `IOT_BATCH_PROCESSED`, `IOT_INVALID_PAYLOAD`, `IOT_INGEST_FAILED`.
- `POST /api/agro/iot/maquinaria/tasks`
  - Despacho de tarea a maquinaria simulada.
  - Codigos: `MACH_TASK_DISPATCHED`, `MACH_TASK_DUPLICATE`.
- `GET /api/agro/iot/maquinaria/tasks?machine_id=...`
  - Pull de tareas por maquina (simulacion).
  - Codigo: `MACH_TASKS_FETCHED`.
- `POST /api/agro/iot/maquinaria/tasks/status`
  - Recepcion de ack/estado desde maquinaria.
  - Codigos: `MACH_STATUS_RECEIVED`, `MACH_TASK_NOT_FOUND`, `MACH_TASK_ORG_MISMATCH`, `MACH_TASK_MACHINE_MISMATCH`.

## Persistencia
- `sensor_readings`
  - Normalizado y enriquecido con:
    - `normalized_value`, `normalized_unit`
    - `quality_status`, `quality_score`, `quality_flags`
    - `idempotency_key`, `processing_status`, `ingestion_attempts`
    - `raw_payload`, `correlation_id`, `gateway_id`
- `machinery_tasks`
  - Tareas outbound con estados (`sent`, `acked`, `in_progress`, `completed`, `failed`).
- `integration_logs`
  - Eventos tecnicos por integracion (`telemetry_ingest`, `machinery_connector`) con `code`, `level` y metadata.

## Estrategias tecnicas
- Idempotencia:
  - Sensores: document ID deterministico por hash `organization_id + idempotency_key`.
  - Maquinaria: document ID deterministico por hash `organization_id + idempotency_key`.
- Reintentos:
  - Persistencia con backoff exponencial (hasta 3 intentos) para operaciones de Firestore.
- Calidad de dato:
  - Reglas de rango por metrica y control de timestamps futuros/viejos.
  - Rechazo temprano para lecturas con score bajo.

## Flujo E2E simulado (resumen)
1. Gateway envia lote a `POST /api/agro/iot/telemetry`.
2. API valida, normaliza, califica y persiste lecturas.
3. Operador crea tarea a maquinaria en `POST /api/agro/iot/maquinaria/tasks`.
4. Maquinaria simulada hace pull con `GET /api/agro/iot/maquinaria/tasks`.
5. Maquinaria reporta progreso/resultado con `POST /api/agro/iot/maquinaria/tasks/status`.
