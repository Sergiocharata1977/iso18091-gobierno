# PLAN MAESTRO MULTIAGENTE

## A. Contexto y objetivo
Este documento es la fuente unica de verdad para coordinar el trabajo multi-agente sobre el sistema de Sagas de `9001app-firebase`.  
El objetivo es estabilizar la orquestacion, cerrar huecos de correctitud y dejar observabilidad minima para operar sin duplicaciones.  
El Lead define prioridades, integra cambios y valida criterios de cierre antes de merge.  
Los Workers ejecutan tareas atomicas acotadas y reportan evidencia sin reescribir este plan.

## B. Alcance (que entra / que NO entra)
Entra:
- Sagas en backend: planificacion, ejecucion por pasos, aprobaciones humanas, fallos/cancelaciones.
- Tests unitarios e integracion de Sagas/colas vinculadas.
- Endpoint de consulta de estado/timeline de saga.
- Endurecimiento anti-duplicados para dispatch de pasos.

No entra (por ahora):
- Rediseno de UI de front-end.
- Refactor amplio de modulos CRM no vinculados a Sagas.
- Migraciones de datos historicos masivas.
- Automatizacion de compensaciones complejas cross-servicio (queda en diseno inicial).

## C. Roles y reglas de coordinacion
- Lead (Codex): prioriza backlog, asigna ownership, integra PRs, revisa regresiones y cierra hitos.
- Worker A: foco en `SagaService` y tests de correctitud de plan/dependencias.
- Worker B: foco en `AgentQueueService` + endpoint de consulta y pruebas de aprobacion/fallo.
- Regla de propiedad de archivos:
  - Worker A toca solo: `src/services/agents/SagaService.ts`, `src/types/sagas.ts`, `src/__tests__/services/SagaService*.test.ts`.
  - Worker B toca solo: `src/services/agents/AgentQueueService.ts`, `src/app/api/mcp/jobs/route.ts` (o nuevo endpoint saga en `src/app/api/mcp/sagas/**`), `src/__tests__/services/AgentQueueService*.test.ts`, `src/__tests__/api/sagas*.test.ts`.
  - Lead puede tocar cualquier archivo solo para integracion final y conflictos.
- Regla anti-colision: nadie toca archivos fuera de su ownership sin aviso previo en el reporte de tarea.
- Regla de reporte: cada tarea se cierra con evidencia concreta (comando + resultado + diff/commit).

## D. Backlog priorizado
| ID | Descripcion | Prioridad | Owner | Dependencias | Estado | Archivos | Evidencia/PR |
|---|---|---|---|---|---|---|---|
| SAGA-01 | Validar plan `saga.plan` en flujo real (`onJobComplete`) con errores claros | Alta | Lead | Ninguna | Hecho | `src/services/agents/SagaService.ts` | Diff local aplicado (12-Feb-2026) |
| SAGA-02 | Tests unitarios de validacion/normalizacion de plan y rechazo de aprobacion | Alta | Lead | SAGA-01 | Hecho | `src/__tests__/services/SagaService.test.ts` | `jest --config jest.config.ts SagaService.test.ts` OK |
| SAGA-03 | Tests de `evaluateSagaProgress`: dependencias, no-dispatch en pausa/fallo, linking `job_id` | Alta | Lead | SAGA-02 | Hecho | `src/services/agents/SagaService.ts`, `src/__tests__/services/SagaService.evaluate.test.ts` | `jest --config jest.config.ts SagaService.evaluate.test.ts` OK |
| SAGA-04 | Tests de `AgentQueueService` para `requestApproval`, `approveJob`, `failJob` y hooks saga | Alta | Lead | Ninguna | Hecho | `src/services/agents/AgentQueueService.ts`, `src/__tests__/services/AgentQueueService.saga.test.ts` | `jest --config jest.config.ts AgentQueueService.saga.test.ts` OK |
| SAGA-05 | Endpoint lectura saga/timeline (`GET /api/mcp/sagas/[id]`) | Media | Worker B | SAGA-04 | Hecho | `src/app/api/mcp/sagas/[id]/route.ts` (nuevo), `src/services/agents/SagaService.ts`, `src/__tests__/api/sagas.get.test.ts` | `npm test -- --config jest.config.ts sagas.get.test.ts --runInBand` OK (3/3) |
| SAGA-06 | Diseno de compensacion minima por paso (`compensate_intent` y politica) sin ejecutar rollback automatico | Media | Worker A | SAGA-03 | Hecho | `src/types/sagas.ts`, `src/services/agents/SagaService.ts`, `src/__tests__/services/SagaService.test.ts`, `docs/PLAN_MAESTRO_MULTIAGENTE.md` | `npm test -- --config jest.config.ts SagaService.test.ts --runInBand` OK (4/4); `npm test -- --config jest.config.ts SagaService.evaluate.test.ts --runInBand` OK (3/3), 12-Feb-2026 |
| SAGA-07 | Endurecer anti-duplicados (lease/heartbeat/idempotency/retry) a nivel plan tecnico y checklist de implementacion | Alta | Lead | Ninguna | Hecho | `docs/PLAN_MAESTRO_MULTIAGENTE.md`, `src/services/agents/AgentQueueService.ts`, `src/services/agents/AgentWorkerService.ts`, `src/types/agents.ts`, `src/__tests__/services/AgentQueueService.saga.test.ts` | `npm test -- --config jest.config.ts AgentQueueService.saga.test.ts --runInBand` OK (10/10), `npm run type-check` OK |
| SAGA-08 | Pipeline liviano para hardware limitado: validar en CI cloud y mantener checks locales minimos | Media | Lead | Ninguna | Hecho | `.github/workflows/saga-light-ci.yml`, `docs/PLAN_MAESTRO_MULTIAGENTE.md` | Workflow `SAGA Lightweight CI` creado (12-Feb-2026). Ejecuta solo 3 suites saga con `--config jest.config.ts --runInBand` en push/PR |

### Detalle de tareas atomicas (1-3 horas)
1. `SAGA-03` (Worker A)
- Archivos exactos: `src/services/agents/SagaService.ts`, `src/__tests__/services/SagaService.evaluate.test.ts`.
- Done:
  - Cubre paso pendiente con dependencia no resuelta (no encola).
  - Cubre saga en `paused/failed/cancelled` (no encola).
  - Cubre vinculo `step.id -> job_id` tras dispatch exitoso.
- Tests/comandos:
  - `npm test -- --config jest.config.ts SagaService.evaluate.test.ts --runInBand`
- Salida esperada:
  - 1 commit o diff unico con tests verdes.

2. `SAGA-04` (Worker B)
- Archivos exactos: `src/services/agents/AgentQueueService.ts`, `src/__tests__/services/AgentQueueService.saga.test.ts`.
- Done:
  - `requestApproval` dispara `SagaService.onJobPendingApproval`.
  - `approveJob` aprobado dispara `onJobApprovalResolved(..., true)`.
  - `approveJob` rechazado dispara `onJobApprovalResolved(..., false)`.
  - `failJob` definitivo dispara `onJobFailed`.
- Tests/comandos:
  - `npm test -- --config jest.config.ts AgentQueueService.saga.test.ts --runInBand`
- Salida esperada:
  - commit o diff con mocks de Firestore y assertions de hooks.

3. `SAGA-05` (Worker B)
- Archivos exactos: `src/app/api/mcp/sagas/[id]/route.ts`, `src/services/agents/SagaService.ts`, `src/__tests__/api/sagas.get.test.ts`.
- Done:
  - Endpoint devuelve estado global, pasos, timestamps y errores.
  - Protegido por auth organizacional.
  - Respuestas `404/403/200` cubiertas por tests.
- Tests/comandos:
  - `npm test -- --config jest.config.ts sagas.get.test.ts --runInBand`
- Salida esperada:
  - diff con endpoint + pruebas.

## E. Plan por fases / hitos
- Fase 0 (cerrada): base de Saga + hooks de aprobacion/fallo/cancelacion implementados.
- Fase 1 (en curso): correctitud funcional y cobertura de pruebas criticas (`SAGA-03`, `SAGA-04`).
- Fase 2: endpoint de observabilidad y timeline (`SAGA-05`).
- Fase 3: diseno/implementacion incremental de compensacion (`SAGA-06`).
- Fase 4: hardening operativo + CI liviano para equipos con bajo rendimiento (`SAGA-08`).

### Controles anti-duplicados (plan tecnico)
- Checklist implementable SAGA-07 (estado al 2026-02-12):
  - [x] Claim atomico: SagaService.evaluateSagaProgress reserva pending -> running en transaccion antes de encolar.
  - [x] Lease/heartbeat: lock con lease_owner + lease_expires_at, heartbeat seguro por owner y reclaim de lease vencido.
  - [x] Idempotency key: AgentQueueService.enqueueJob deduplica por idempotency_key (explicita o derivada workflow_id:step_index:intent) y evita doble alta.
  - [x] Retry policy: getQueuedJobs y getNextPendingJob ya filtran jobs con next_retry futuro; solo salen reintentos vencidos.

## F. Estado actual
Hecho:
- Validacion de plan integrada en flujo real de saga.plan.
- Tests iniciales de SagaService para plan invalido, normalizacion y rechazo de aprobacion.
- SAGA-08 implementada: pipeline cloud liviano en .github/workflows/saga-light-ci.yml.
- SAGA-06 implementada:
  - SagaStep soporta compensate_intent opcional por paso.
  - onJobFailed registra politica minima de compensacion sin rollback automatico (manual_per_step o none).
  - Cobertura agregada en SagaService.test.ts para fallo tardio con pasos compensables previos.
- El workflow corre exclusivamente:
  - src/__tests__/services/SagaService.test.ts
  - src/__tests__/services/SagaService.evaluate.test.ts
  - src/__tests__/services/AgentQueueService.saga.test.ts
  - Comando CI: npm test -- --config jest.config.ts --runInBand <suites>
- SAGA-07 avance concreto:
  - Dedupe por idempotencia en enqueueJob.
  - Gating de retry por next_retry al leer cola (getQueuedJobs y getNextPendingJob).
  - Lease metadata agregado en jobs (`lease_owner`, `lease_expires_at`, `lease_heartbeat_at`).
  - `lockJob` soporta reclaim de lease vencido sin robar leases activos.
  - `heartbeatJob` renueva lease solo para el owner actual.
  - AgentWorker usa lease_owner estable y omite jobs con lease activo en otro worker.
  - Pruebas unitarias ampliadas en AgentQueueService.saga.test.ts (10/10).

En progreso:
- Ninguno en frente Sagas (SAGA-01..SAGA-08 completadas).

Riesgos:
- Endpoint de consulta implementado; falta validar uso en entorno integrado.
- La deduplicacion por idempotency_key no define aun ventana TTL de re-ejecucion intencional.
- Build local en hardware limitado puede ocultar errores hasta CI cloud.

## G. Decisiones tomadas (log)
- 2026-02-12: Se define este archivo como unica fuente de verdad del plan multi-agente.
- 2026-02-12: Se adopta ownership estricto por archivo para evitar colisiones.
- 2026-02-12: Se prioriza correctitud y tests (SAGA-03/04) antes de nuevas features.
- 2026-02-12: Se acuerda validacion pesada en CI/Vercel y ejecucion local minima por limitaciones de hardware.
- 2026-02-12: Se mantiene politica de no reescribir el plan; solo agregar estado/evidencias.
- 2026-02-12: SAGA-03 completada con tests dedicados de evaluateSagaProgress.
- 2026-02-12: SAGA-04 completada con pruebas de hooks saga en AgentQueueService.
- 2026-02-12: SAGA-08 se implementa en workflow dedicado SAGA Lightweight CI para push/PR en main/develop, con filtros por paths, cache npm y cancelacion de ejecuciones en progreso para mantener tiempos bajos.
- 2026-02-12: SAGA-05 completada con endpoint GET /api/mcp/sagas/[id], auth organizacional y pruebas de 404/403/200.
- 2026-02-12: SAGA-06 completada con compensacion minima por paso: se agrega compensate_intent al modelo y se registra error.compensation en onJobFailed sin rollback cross-servicio.
- 2026-02-12: Se implementa idempotencia minima en cola con idempotency_key (explicita o derivada de saga) para evitar doble enqueue.
- 2026-02-12: Se decide aplicar retry gating leyendo solo jobs queued con next_retry <= now, sin cambiar politica de backoff existente.
- 2026-02-12: SAGA-07 cerrada con lease/heartbeat/reclaim: lockJob ahora recupera leases vencidos, heartbeat valida owner y AgentWorker respeta lease activo.

## H. Proximos pasos inmediatos (max 5)
1. Ejecutar validacion integrada en entorno cloud (Vercel/GitHub Actions) para confirmar comportamiento runtime de leases.
2. Definir TTL/estrategia de re-ejecucion intencional para `idempotency_key`.
3. Agregar endpoint administrativo para inspeccion de leases activos y expirados (pendiente de confirmar).
4. Revisar consumidores del contrato `error.compensation` para UI/reporteria.
5. Mantener suites Sagas como gating obligatorio en CI liviano.

## I. Coordinacion activa MCP API (12-Feb-2026)
- Asignacion temporal de bloque para hardening auth MCP (Agente 1 MCP / Codex):
  - `src/app/api/mcp/ejecuciones/route.ts`
  - `src/app/api/mcp/evidencias/route.ts`
  - `src/app/api/mcp/excel/export/route.ts`
  - `src/app/api/mcp/registro/route.ts`
  - `src/app/api/mcp/sheets/read/route.ts`
  - `src/app/api/mcp/sheets/write/route.ts`
  - `src/app/api/mcp/sheets/export/route.ts`
  - `src/app/api/mcp/stats/route.ts`
  - `src/app/api/mcp/tareas/route.ts`
  - `src/app/api/mcp/tareas/completar/route.ts`
  - `src/app/api/mcp/templates/route.ts`
- Exclusiones por ownership:
  - `src/app/api/mcp/jobs/route.ts` permanece en Worker B.
- Estado:
  - En progreso (objetivo: migrar a `withAuth`, eliminar trust en `organization_id`/`user_id` de cliente, mantener contratos JSON).

## J. Coordinacion activa SDK Quality/Norm-Points (12-Feb-2026)
- Asignacion temporal de bloque para hardening auth SDK (Agente 2 SDK / Codex):
  - `src/app/api/sdk/quality/objectives/route.ts`
  - `src/app/api/sdk/quality/objectives/[id]/route.ts`
  - `src/app/api/sdk/quality/indicators/route.ts`
  - `src/app/api/sdk/quality/indicators/[id]/route.ts`
  - `src/app/api/sdk/quality/measurements/route.ts`
  - `src/app/api/sdk/quality/measurements/[id]/route.ts`
  - `src/app/api/sdk/norm-points/route.ts`
  - `src/app/api/sdk/norm-points/[id]/route.ts`
  - `src/app/api/sdk/norm-points/mandatory/route.ts`
  - `src/app/api/sdk/norm-points/chapter/[chapter]/route.ts`
- Estado:
  - Completado (se aplico `withAuth` + roles minimos por operacion, scope forzado por organizacion desde token, y se mantuvo el contrato JSON actual).
- Criterios de cierre:
  - `npm run type-check` OK.
  - 2 pruebas de seguridad cross-org (lectura/escritura) en verde.
- Evidencia:
  - `npm run type-check` OK.
  - `npm test -- --config jest.config.ts src/__tests__/api/sdk-quality-security.test.ts --runInBand` OK (2/2).
- Riesgos:
  - Documentos legacy sin `organization_id` pueden quedar fuera de resultados por el scope estricto.
  - Persiste heterogeneidad de middleware auth en otras rutas SDK fuera de este bloque.
- Pendientes:
  - Extender tests cross-org a `sdk/quality/indicators`, `sdk/quality/measurements` y `sdk/norm-points`.
  - Evaluar helper unico para validacion de org/roles y reducir duplicacion.

## K. Coordinacion activa SDK News/Documents/Calendar (12-Feb-2026)
- Asignacion temporal de bloque para hardening auth SDK (Agente 5 SDK / Codex):
  - `src/app/api/sdk/news/posts/route.ts`
  - `src/app/api/sdk/news/posts/[id]/route.ts`
  - `src/app/api/sdk/news/posts/[id]/comments/route.ts`
  - `src/app/api/sdk/news/posts/[id]/reactions/route.ts`
  - `src/app/api/sdk/documents/route.ts`
  - `src/app/api/sdk/documents/[id]/route.ts`
  - `src/app/api/sdk/documents/[id]/version/route.ts`
  - `src/app/api/sdk/calendar/events/route.ts`
  - `src/app/api/sdk/calendar/events/upcoming/route.ts`
  - `src/app/api/sdk/calendar/events/[id]/route.ts`
  - `src/app/api/sdk/calendar/stats/route.ts`
- Estado:
  - Completado (se aplico `withAuth` + aislamiento por organizacion + sin confianza en `organization_id`/`userId` de cliente).
- Criterios de cierre:
  - `npm run type-check` OK.
  - Validacion 401/403 y denegacion cross-tenant OK (`src/__tests__/api/sdk.documents.security.test.ts`).
- Evidencia:
  - `npm run type-check` OK.
  - `npm test -- --config jest.config.ts src/__tests__/api/sdk.quality.org-scope.test.ts --runInBand` OK (2/2).
- Riesgos:
  - Dataset de `normPoints` puede contener mezcla de datos globales y por organizacion; se aplico filtro defensivo por org cuando el campo existe.
  - Persisten diferencias historicas de formato de error entre rutas SDK (`400` vs `500`) fuera de este alcance.
- Pendientes:
  - Extender pruebas cross-org especificas para `sdk/norm-points/[id]` con fixtures multi-tenant reales.
  - Evaluar estandarizacion transversal de respuestas de validacion en SDK.

### Uso rapido de SAGA-08
- Automatico: se ejecuta en `push` y `pull_request` a `main`/`develop` cuando cambian archivos de Sagas/tests/workflow.
- Manual: `Actions -> SAGA Lightweight CI -> Run workflow`.
- Local opcional (misma idea que CI): `npm test -- --config jest.config.ts SagaService.test.ts SagaService.evaluate.test.ts AgentQueueService.saga.test.ts --runInBand`.

## K. Coordinacion activa SDK Findings/Actions (12-Feb-2026)
- Asignacion temporal de bloque para hardening auth SDK (Agente 4 SDK / Codex):
  - `src/app/api/sdk/findings/route.ts`
  - `src/app/api/sdk/findings/stats/route.ts`
  - `src/app/api/sdk/findings/[id]/route.ts`
  - `src/app/api/sdk/findings/[id]/close/route.ts`
  - `src/app/api/sdk/findings/[id]/immediate-action-execution/route.ts`
  - `src/app/api/sdk/findings/[id]/immediate-action-planning/route.ts`
  - `src/app/api/sdk/findings/[id]/root-cause-analysis/route.ts`
  - `src/app/api/sdk/actions/route.ts`
  - `src/app/api/sdk/actions/stats/route.ts`
  - `src/app/api/sdk/actions/[id]/route.ts`
  - `src/app/api/sdk/actions/[id]/execution/route.ts`
  - `src/app/api/sdk/actions/[id]/verify-effectiveness/route.ts`
- Estado:
  - Completado.
- Cambios aplicados:
  - Todas las rutas migradas a `withAuth`.
  - Tenant scope forzado por `auth.organizationId` y rechazo de org arbitraria en body/query.
  - `auth.uid` usado en escrituras (sin confiar `userId` del cliente).
  - Control de rol sensible en `close`, `execution` y `verify-effectiveness`.
  - Contratos JSON existentes mantenidos.
- Riesgos/pedientes:
  - `npm run type-check` global sigue fallando por errores preexistentes fuera del bloque (`sdk/calendar` y `sdk/documents`), a resolver por owner correspondiente.

## L. Coordinacion activa Seed/Destructivo (12-Feb-2026)

## M. Actualizacion SIPOC + Registros + IA (17-Feb-2026)
- Objetivo: simplificar operacion de procesos y evitar duplicidad de registros.
- Regla funcional oficial:
  - `tipo_registros = vincular`: proceso con modulo exclusivo (mejoras/auditorias/nc), sin ABM general de registros.
  - `tipo_registros = crear`: proceso sin modulo exclusivo, usa ABM de Registros de Procesos.
  - `tipo_registros = ambos`: habilita ambas modalidades.
- Cambios funcionales aplicados:
  - Definiciones: alta/edicion con `tipo_registros` y `modulo_vinculado`.
  - Registros: bloqueo de alta en ABM cuando definicion es `vincular`.
  - Registros: validacion de definicion + org en backend.
  - Registros: creacion automatica de etapas desde `etapas_default`.
  - UX Registros: nuevo boton IA contextual `¿Que hago aca?` para guiar uso y siguientes pasos.
- Estabilidad IA:
  - Chat agrega fallback para consultas de mensajes cuando falta indice compuesto (`FAILED_PRECONDITION`), evitando corte total de conversacion.
  - Frontend mejora deteccion de error de indice (es/en).
- Asignacion temporal de bloque para hardening seed/destructivo (Agente 10 / Codex):
  - `src/app/api/seed/agro-context/route.ts`
  - `src/app/api/seed/audits/route.ts`
  - `src/app/api/seed/iso-9001/route.ts`
  - `src/app/api/seed/quality-data/route.ts`
  - `src/app/api/seed/quality-modules/route.ts`
  - `src/app/api/seed/rrhh/route.ts`
  - `src/app/api/seed/rrhh/check/route.ts`
  - `src/app/api/seed/rrhh/clear/route.ts`
  - `src/app/api/seed/rrhh/diagnose/route.ts`
  - `src/app/api/seed/rrhh/fresh/route.ts`
  - `src/app/api/seed/rrhh/massive/route.ts`
  - `src/app/api/seed/super-admin/route.ts`
  - `src/app/api/processes/seed/route.ts`
  - `src/app/api/processes/seed-massive/route.ts`
- Estado:
  - Completado.
- Cambios aplicados:
  - Endpoints migrados a `withAuth` con roles `admin`/`super_admin`.
  - Guard de entorno para bloquear ejecucion en `production` (override solo con `ALLOW_PROD_SEED_ENDPOINTS=true`).
  - Auditoria de ejecucion agregada con helper comun `src/lib/api/seedSecurity.ts`.
  - Contratos JSON existentes preservados, agregando solamente respuesta de bloqueo `403` para entorno productivo.
- Evidencia:
  - `npm run type-check` OK.
- Riesgos residuales:
  - Si se habilita override en produccion, los endpoints siguen siendo destructivos/seed y requieren control operacional estricto.
  - No se agregaron tests automatizados dedicados en este bloque; cobertura queda en validacion de tipado y revision manual.

## L. Coordinacion activa SDK Audits/Processes/Soporte (12-Feb-2026)
- Asignacion temporal de bloque para hardening auth SDK (Agente 6 SDK / Codex):
  - `src/app/api/sdk/audits/route.ts`
  - `src/app/api/sdk/audits/[id]/route.ts`
  - `src/app/api/sdk/processes/route.ts`
  - `src/app/api/sdk/processes/[id]/route.ts`
  - `src/app/api/sdk/foda/route.ts`
  - `src/app/api/sdk/foda/[id]/route.ts`
  - `src/app/api/sdk/flujogramas/route.ts`
  - `src/app/api/sdk/flujogramas/[id]/route.ts`
  - `src/app/api/sdk/policies/route.ts`
  - `src/app/api/sdk/policies/[id]/route.ts`
  - `src/app/api/sdk/reuniones/route.ts`
  - `src/app/api/sdk/reuniones/[id]/route.ts`
  - `src/app/api/sdk/organigramas/route.ts`
  - `src/app/api/sdk/organigramas/[id]/route.ts`
- Estado:
  - Completado (2026-02-12 17:40:43).
- Criterios de cierre:
  - `withAuth` aplicado en todas las rutas del bloque.
  - `organization_id` forzado desde `auth.organizationId` (sin trust en body/query).
  - Control de rol en operaciones sensibles (DELETE).
  - `npm run type-check` en verde.
- Evidencia:
  - `npm run type-check` OK.
- Riesgos:
  - Registros legacy sin `organization_id` quedan fuera de listados y denegados por ID bajo scope estricto.
  - Persiste duplicacion de validaciones de org/rol entre rutas SDK, con costo de mantenimiento.
- Pendientes:
  - Extender cobertura de pruebas de seguridad cross-org a estas rutas (401/403/read-write).
  - Consolidar helper reutilizable para validacion de organizacion y control de rol por endpoint.




## L. Coordinacion activa Planificacion/Gobierno (12-Feb-2026)
- Asignacion temporal de bloque para hardening auth (Agente 8 Planificacion/Gobierno / Codex):
  - src/app/api/planificacion-revision-direccion/route.ts`n  - src/app/api/planificacion-revision-direccion/latest/route.ts`n  - src/app/api/planificacion-revision-direccion/[id]/route.ts`n  - src/app/api/planificacion-revision-direccion/[id]/politicas/route.ts`n  - src/app/api/planificacion-revision-direccion/[id]/vigente/route.ts`n  - src/app/api/planificacion-revision-direccion/v2/route.ts`n  - src/app/api/planificacion-revision-direccion/v2/[id]/route.ts`n  - src/app/api/planificacion-revision-direccion/v2/[id]/vigente/route.ts`n  - src/app/api/politicas/route.ts`n  - src/app/api/politicas/[id]/route.ts`n  - src/app/api/reuniones-trabajo/route.ts`n  - src/app/api/relacion-procesos/route.ts`n  - src/app/api/declarations/route.ts`n  - src/app/api/context/user/route.ts`n  - src/app/api/ia/context/route.ts`n  - src/app/api/organigramas/route.ts`n  - src/app/api/personnel-list/route.ts`n  - src/app/api/analisis-foda/route.ts`n  - src/app/api/surveys/[id]/route.ts`n  - src/app/api/surveys/[id]/responses/route.ts`n- Estado:
  - Completado (withAuth + roles por accion + scope por organizacion desde token cuando existe organization_id).
- Evidencia:
  - 
pm run type-check OK.
- Riesgos/Pendientes:
  - Persisten colecciones legacy sin organization_id obligatorio (surveys, declarations, planificacion), limitando validacion cross-org por recurso y tests de seguridad finos.

## M. Coordinacion activa IA Externa/Costos (12-Feb-2026)
- Asignacion temporal de bloque para hardening de endpoints con costo/proveedores (Agente 9 IA externa/costos / Codex):
  - `src/app/api/openai/session/route.ts`
  - `src/app/api/whisper/transcribe/route.ts`
  - `src/app/api/elevenlabs/speech/route.ts`
  - `src/app/api/elevenlabs/text-to-speech/route.ts`
  - `src/app/api/elevenlabs/voice-config/route.ts`
  - `src/app/api/send-email/route.ts`
  - `src/app/api/direct-actions/request/route.ts`
  - `src/app/api/direct-actions/confirm/route.ts`
  - `src/app/api/billing/mobbex/subscribe/route.ts`
  - `src/app/api/demo-requests/activate/route.ts`
  - `src/app/api/temp/reset-password/route.ts`
- Estado:
  - Completado.
- Cambios aplicados:
  - `withAuth` obligatorio aplicado en todas las rutas del bloque.
  - Roles altos para endpoints sensibles de costo/reset.
  - Rate limiting por `organizationId + uid` en endpoints IA y de mail.
  - Identidad del actor forzada por `auth` (sin confiar `userId`/`organization_id` del cliente).
- Evidencia:
  - `npm run type-check` OK.
  - `npm test -- --config jest.config.ts src/__tests__/api/agent9.security.test.ts --runInBand --forceExit` OK (2/2, verificacion `401/403`).
- Riesgos residuales:
  - El rate limit en memoria no es distribuido entre instancias; conviene moverlo a Redis/servicio central en produccion.

