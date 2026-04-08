# Plan Plugin Contabilidad Industrial Manufactura — Ejecución multi-agente

**Fecha:** 2026-04-06
**Feature:** Nuevo plugin vertical de costeo industrial y manufactura por etapas integrado con `contabilidad_central`, Kanban e ISO 9001
**Proyectos afectados:** 9001app-firebase

---

## Criterios rectores del plan

- El plugin nace como extensión vertical de `contabilidad_central`, no como subsistema contable paralelo.
- La base funcional del MVP es `WIP / producción en proceso + transferencia por etapas + costo estándar vs real + eventos contables`.
- La UX principal debe ser operativa: tablero industrial, kanban de producción, detalle de orden y carga de costos.
- La primera versión debe soportar costeo híbrido: base por orden/ruta/etapa con acumulación tipo proceso, evitando depender solo de backflush.
- La absorción de CIF debe contemplar capacidad normal para overhead fijo y desvíos explícitos, consistente con IAS 2.

---

## Resumen de olas

| Ola | Agentes | Paralelos entre sí | Dependen de |
|-----|---------|---------------------|-------------|
| 1 | A, B, C | Sí | Nada |
| 2 | A, B, C | Sí | Ola 1 completa |
| 3 | A, B, C | Sí | Ola 2 completa |
| 4 | A, B | Sí | Ola 3 completa |

---

## Ola 1 — Fundaciones del plugin
> Ejecutar Agente A + Agente B + Agente C en PARALELO

## Agente A — Manifest, scopes y registro del plugin
**Puede ejecutarse en paralelo con:** Agente B, Agente C
**Depende de:** nada — es la primera ola

### Objetivo
Registrar formalmente el plugin `contabilidad_industrial_manufactura` en la arquitectura de plugins, con manifest, navegación, scopes y eventos declarados.

### Archivos a crear
- `src/config/plugins/contabilidad_industrial_manufactura.manifest.ts` — manifest completo del plugin con identidad, compatibilidad, permisos, rutas y eventos

### Archivos a modificar
- `src/config/plugins/index.ts` — registrar el nuevo manifest
- `src/config/plugins/nav-feature-map.ts` — mapear navegación y feature flags si aplica
- `src/types/plugins.ts` — agregar el nuevo `PluginCapabilityId` si el proyecto aún los enumera manualmente

### Prompt completo para el agente
Trabajas en `9001app-firebase`, un proyecto Next.js 14 + TypeScript strict + Firebase/Firestore + arquitectura multi-tenant + sistema formal de plugins por manifest.

Tu tarea es crear el manifest del nuevo plugin vertical de manufactura y costeo industrial. El nombre técnico recomendado es `contabilidad_industrial_manufactura`. Debe convivir con `contabilidad_central`, no reemplazarlo.

**Antes de escribir, lee estos archivos:**
1. `src/config/plugins/contabilidad_central.manifest.ts`
2. `src/config/plugins/iso_design_development.manifest.ts`
3. `src/config/plugins/pack-hse.manifest.ts`
4. `src/config/plugins/index.ts`
5. `src/config/plugins/nav-feature-map.ts`
6. `src/types/plugins.ts`
7. `reports/05_CONTABILIDAD_CENTRAL.md`
8. `reports/74_ARQUITECTURA_PRODUCTO_CORE_PLUGINS_2026-03-25.md`

**Implementa exactamente esto:**
- Crear `src/config/plugins/contabilidad_industrial_manufactura.manifest.ts`.
- `plugin_id`: `contabilidad_industrial_manufactura`
- `slug`: `contabilidad-industrial-manufactura`
- `display_name`: `Contabilidad Industrial`
- `category`: `finance`
- `tier`: `premium`
- `compatibility.required_capabilities`: incluir `contabilidad_central`
- `compatibility.optional_capabilities`: considerar `iso_design_development`, `iso_infrastructure`, `pack_hse`
- Definir scopes mínimos:
  - `industrial_costing:read`
  - `industrial_costing:write`
  - `industrial_costing:approve`
  - `industrial_costing:admin`
  - `industrial_costing:close_stage`
  - `industrial_costing:view_financial_detail`
- Declarar rutas de navegación mínimas:
  - `/industrial-costing`
  - `/industrial-costing/kanban`
  - `/industrial-costing/orders`
  - `/industrial-costing/settings`
  - `/industrial-costing/reports`
- Declarar rutas API tentativas bajo `/api/industrial-costing/...`
- Declarar eventos emitidos y consumidos de alto nivel, sin implementar lógica todavía.
- Registrar el manifest en `src/config/plugins/index.ts`.
- Si `src/types/plugins.ts` enumera capacidades manuales, agregar `contabilidad_industrial_manufactura`.

**No hagas:**
- No implementar páginas, APIs ni servicios reales.
- No tocar `contabilidad_central.manifest.ts`.
- No agregar reglas contables todavía.

**Criterio de éxito:**
- El plugin aparece registrado formalmente en la plataforma.
- El manifest declara dependencia explícita con `contabilidad_central`.
- Quedan definidos scopes, rutas y eventos coherentes para la implementación posterior.

---

## Agente B — Contratos de dominio, colecciones y validaciones
**Puede ejecutarse en paralelo con:** Agente A, Agente C
**Depende de:** nada — es la primera ola

### Objetivo
Definir el contrato de datos industrial: entidades TypeScript, colecciones Firestore, enums de estados, snapshots de costo y validaciones Zod del plugin.

### Archivos a crear
- `src/features/industrial-costing/types.ts` — tipos principales del dominio industrial
- `src/features/industrial-costing/schemas.ts` — validaciones Zod para requests y documentos
- `src/features/industrial-costing/constants.ts` — estados, modos de costeo, tipos de costo, nombres de colecciones

### Archivos a modificar
- ninguno

### Prompt completo para el agente
Trabajas en `9001app-firebase`. Debes crear el contrato de dominio del nuevo plugin `contabilidad_industrial_manufactura` para fabricación por etapas, costeo industrial y trazabilidad de WIP.

**Antes de escribir, lee estos archivos:**
1. `src/lib/validations/plugins.ts`
2. `src/types/kanbanSchema.ts`
3. `src/services/ai-core/accountingContextBuilder.ts`
4. `reports/05_CONTABILIDAD_CENTRAL.md`
5. `reports/74_ARQUITECTURA_PRODUCTO_CORE_PLUGINS_2026-03-25.md`

**Diseña y crea exactamente estas piezas:**

1. `src/features/industrial-costing/constants.ts`
- enums/literales para:
  - `ManufacturingOrderStatus`
  - `ManufacturingStageStatus`
  - `IndustrialCostType` (`material_directo`, `mano_obra_directa`, `cif`)
  - `IndustrialCostingMode` (`orden`, `lote`, `unidad`, `hibrido`)
  - `IndustrialEntryMode` (`manual`, `semi_automatico`, `automatico`, `ajuste`, `reclasificacion`, `reversion`)
  - `IndustrialVarianceType`
  - nombres de colecciones Firestore sugeridas

2. `src/features/industrial-costing/types.ts`
- interfaces mínimas:
  - `ManufacturingOrder`
  - `ManufacturingRoute`
  - `ManufacturingStageDefinition`
  - `ManufacturingStageExecution`
  - `MaterialConsumption`
  - `LaborEntry`
  - `OverheadAllocation`
  - `StageTransfer`
  - `CostSnapshot`
  - `ScrapRecord`
  - `ReworkRecord`
  - `IndustrialCostRule`
  - `WorkCenter`
  - `BillOfMaterials`
  - `ManufacturingKanbanState`
  - `CostSummary`
- Cada entidad debe dejar claro:
  - `organization_id`
  - qué es maestro vs transaccional
  - qué timestamps se persisten
  - qué campos requieren audit trail

3. `src/features/industrial-costing/schemas.ts`
- zod schemas para create/update de:
  - orden de fabricación
  - imputación de materiales
  - imputación MOD
  - absorción CIF
  - cierre de etapa
  - scrap
  - retrabajo
  - ajustes de costo

**Criterios de modelado obligatorios:**
- Separar costo estándar, costo real y variación.
- Representar WIP por etapa y total.
- Permitir transferencia de costo acumulado entre etapas.
- No asumir inventario ni stock completo en esta ola; si faltan módulos de inventario, modelar referencias desacopladas.
- Dejar `backflush` solo como estrategia opcional futura, no como flujo central.

**No hagas:**
- No crear servicios ni APIs.
- No meter lógica de Firestore en estos archivos.

**Criterio de éxito:**
- El dominio queda listo para que otros agentes implementen servicios/APIs sin redefinir contratos.
- Los tipos reflejan manufactura por etapas, costeo híbrido y multi-tenant estricto.

---

## Agente C — Matriz de eventos industriales y puente contable
**Puede ejecutarse en paralelo con:** Agente A, Agente B
**Depende de:** nada — es la primera ola

### Objetivo
Definir el contrato de eventos de negocio y eventos contables para integrar el plugin industrial con `contabilidad_central` sin duplicar saldos.

### Archivos a crear
- `src/features/industrial-costing/accounting-event-contracts.ts` — operation types, payloads y helpers del plugin industrial
- `src/lib/accounting/rules/industrialManufacturingRules.ts` — set inicial de reglas contables sugeridas para manufactura

### Archivos a modificar
- ninguno

### Prompt completo para el agente
Trabajas en `9001app-firebase`. Debes diseñar el puente entre el nuevo plugin industrial y el motor existente `contabilidad_central`.

**Antes de escribir, lee estos archivos:**
1. `src/lib/accounting/emitEvent.ts`
2. `src/lib/accounting/AccountingEngine.ts`
3. `src/config/plugins/contabilidad_central.manifest.ts`
4. `reports/05_CONTABILIDAD_CENTRAL.md`

**Implementa exactamente esto:**

1. Crear `src/features/industrial-costing/accounting-event-contracts.ts`
- declarar `plugin_id` constante: `contabilidad_industrial_manufactura`
- declarar operation types mínimos:
  - `industrial_material_consumed`
  - `industrial_labor_applied`
  - `industrial_overhead_applied`
  - `industrial_stage_transferred`
  - `industrial_finished_goods_received`
  - `industrial_cost_adjusted`
  - `industrial_scrap_recorded`
  - `industrial_rework_recorded`
  - `industrial_order_closed`
  - `industrial_variance_recognized`
- definir interfaces payload por operación
- helper para construir `idempotency_key`

2. Crear `src/lib/accounting/rules/industrialManufacturingRules.ts`
- no tocar el engine; solo definir reglas sugeridas para que luego puedan instalarse
- modelar cuentas de referencia conceptuales:
  - materia prima
  - WIP por etapa o centro
  - CIF absorbido
  - variaciones de absorción
  - producto terminado
  - scrap anormal
  - retrabajo
- documentar en comentarios breves qué va al plugin industrial y qué queda en `contabilidad_central`

**Principios obligatorios:**
- Los saldos viven en `contabilidad_central`; el plugin industrial solo persiste detalle operativo y snapshots analíticos.
- Toda contabilización debe poder reconstruirse por evento/idempotencia.
- Diferenciar scrap normal vs anormal.
- La transferencia entre etapas puede ser analítica y no siempre contable si sigue dentro de WIP total; deja esa decisión explícita en el contrato.

**No hagas:**
- No emitir eventos reales todavía.
- No crear endpoints.
- No modificar reglas CRM ni del core.

**Criterio de éxito:**
- Queda lista una matriz de eventos consistente con costeo por procesos/órdenes y con el motor event-driven actual.

---

## Ola 2 — Backend operativo y APIs núcleo
> Ejecutar SOLO después de que Ola 1 esté completa
> Ejecutar Agente A + Agente B + Agente C en PARALELO

## Agente A — Servicios de maestros industriales
**Puede ejecutarse en paralelo con:** Agente B, Agente C
**Depende de:** Ola 1 completa

### Objetivo
Implementar servicios y repositorios para maestros del módulo: rutas, etapas, centros de trabajo, reglas de costeo y BOM base.

### Archivos a crear
- `src/features/industrial-costing/services/IndustrialMasterDataService.ts` — CRUD de maestros del plugin
- `src/features/industrial-costing/services/IndustrialRuleResolver.ts` — resolución de reglas de costo estándar/CIF
- `src/features/industrial-costing/repository.ts` — helpers Firestore del módulo industrial
- `src/app/api/industrial-costing/settings/routes/route.ts` — API rutas de fabricación
- `src/app/api/industrial-costing/settings/work-centers/route.ts` — API centros de trabajo
- `src/app/api/industrial-costing/settings/cost-rules/route.ts` — API reglas de costeo
- `src/app/api/industrial-costing/settings/boms/route.ts` — API BOM/estructura técnica base

### Archivos a modificar
- ninguno

### Prompt completo para el agente
Trabajas en `9001app-firebase`. Tu tarea es implementar el backend de configuración industrial del plugin.

**Lee antes de escribir:**
1. `src/features/industrial-costing/types.ts`
2. `src/features/industrial-costing/schemas.ts`
3. `src/lib/api/withAuth.ts`
4. `src/middleware/verifyOrganization.ts`
5. `src/app/api/kanban-schemas/route.ts`
6. `src/app/api/journey/snapshot/route.ts`

**Implementa:**
- `IndustrialMasterDataService` con métodos para crear/listar/actualizar:
  - rutas de fabricación
  - etapas
  - centros de trabajo
  - reglas de absorción CIF
  - BOMs base
- `repository.ts` con helpers centralizados de colecciones del plugin.
- APIs protegidas con `withAuth` + `resolveAuthorizedOrganizationId`.
- Nunca confiar en `organization_id` del body.
- Validar input con Zod.
- Devolver respuestas consistentes `{ ok, data, error }`.

**Límites:**
- No implementar órdenes ni transacciones productivas.
- No emitir eventos contables todavía.
- No crear UI.

**Criterio de éxito:**
- El tenant puede configurar la estructura industrial mínima del plugin sin romper multi-tenant.

---

## Agente B — Servicios transaccionales de orden, etapas y costos
**Puede ejecutarse en paralelo con:** Agente A, Agente C
**Depende de:** Ola 1 completa

### Objetivo
Implementar el núcleo operativo del plugin: órdenes de fabricación, ejecución por etapas, WIP, imputación de costos, scrap y retrabajo.

### Archivos a crear
- `src/features/industrial-costing/services/ManufacturingOrderService.ts` — lifecycle de órdenes y etapas
- `src/features/industrial-costing/services/IndustrialCostingService.ts` — cálculo y persistencia de costos estándar/real/variaciones
- `src/features/industrial-costing/services/StageTransferService.ts` — cierre de etapa y transferencia analítica de costo
- `src/app/api/industrial-costing/orders/route.ts` — alta/listado de órdenes
- `src/app/api/industrial-costing/orders/[id]/route.ts` — detalle y actualización de orden
- `src/app/api/industrial-costing/orders/[id]/stage-transition/route.ts` — mover/cerrar etapa
- `src/app/api/industrial-costing/orders/[id]/costs/materials/route.ts` — imputación de materiales
- `src/app/api/industrial-costing/orders/[id]/costs/labor/route.ts` — imputación MOD
- `src/app/api/industrial-costing/orders/[id]/costs/overhead/route.ts` — absorción CIF
- `src/app/api/industrial-costing/orders/[id]/scrap/route.ts` — registrar scrap/merma
- `src/app/api/industrial-costing/orders/[id]/rework/route.ts` — registrar retrabajo

### Archivos a modificar
- ninguno

### Prompt completo para el agente
Trabajas en `9001app-firebase`. Debes construir el backend transaccional del plugin industrial.

**Lee antes de escribir:**
1. `src/features/industrial-costing/types.ts`
2. `src/features/industrial-costing/schemas.ts`
3. `src/features/industrial-costing/accounting-event-contracts.ts`
4. `src/lib/api/withAuth.ts`
5. `src/middleware/verifyOrganization.ts`
6. `src/app/api/processes/records/[id]/kanban/route.ts`

**Implementa:**
- `ManufacturingOrderService`:
  - crear orden
  - iniciar orden
  - cerrar orden
  - obtener detalle con etapas y resumen de costos
- `IndustrialCostingService`:
  - registrar consumo de materiales
  - registrar mano de obra
  - registrar CIF
  - recalcular snapshot por etapa y total
  - separar costo estándar, real y variación
- `StageTransferService`:
  - cerrar etapa
  - congelar snapshot
  - transferir costo acumulado a la siguiente etapa
  - manejar etapa opcional/retrabajo
- APIs protegidas y org-scoped.

**Decisiones obligatorias del MVP:**
- La unidad principal es `ManufacturingOrder`.
- Cada orden puede costearse por unidad/lote, pero el acumulador operativo vive en la orden.
- Las transferencias entre etapas son persistidas como `StageTransfer`.
- Scrap normal y anormal deben quedar diferenciados.

**No hagas:**
- No tocar la UI.
- No conectar todavía con IA ni kanban general.

**Criterio de éxito:**
- El backend permite seguir una orden desde alta hasta producto terminado con costo acumulado por etapa.

---

## Agente C — Emisión contable y contexto IA del plugin
**Puede ejecutarse en paralelo con:** Agente A, Agente B
**Depende de:** Ola 1 completa

### Objetivo
Conectar el plugin industrial con `contabilidad_central` y con el contexto IA unificado sin duplicar lógica contable.

### Archivos a crear
- `src/features/industrial-costing/services/IndustrialAccountingBridgeService.ts` — emite eventos contables del plugin industrial
- `src/services/strategic-analysis/pluginReaders/industrialCostingReader.ts` — lector resumido para análisis estratégico si aplica
- `src/services/ai-core/industrialCostingContextBuilder.ts` — contexto IA operacional/financiero del plugin

### Archivos a modificar
- `src/features/chat/services/ContextService.ts` — inyectar contexto industrial cuando el plugin esté habilitado
- `src/services/ai-core/UnifiedConverseService.ts` — incorporar plugin context si el flujo actual lo requiere

### Prompt completo para el agente
Trabajas en `9001app-firebase`. Debes integrar el nuevo plugin industrial con IA contextual y contabilidad central.

**Lee antes de escribir:**
1. `src/features/industrial-costing/accounting-event-contracts.ts`
2. `src/lib/accounting/emitEvent.ts`
3. `src/features/chat/services/ContextService.ts`
4. `src/services/ai-core/UnifiedConverseService.ts`
5. `src/services/strategic-analysis/pluginReaders/accountingReader.ts`

**Implementa:**
- `IndustrialAccountingBridgeService` con métodos explícitos para:
  - `emitMaterialConsumption`
  - `emitLaborApplied`
  - `emitOverheadApplied`
  - `emitFinishedGoodsReceipt`
  - `emitScrap`
  - `emitCostAdjustment`
- `industrialCostingContextBuilder.ts`:
  - órdenes activas
  - WIP total
  - top desvíos estándar vs real
  - etapas demoradas
  - scrap/rework abierto
- `industrialCostingReader.ts` para análisis estratégico/resumen del plugin.
- Modificar `ContextService` para incluir el contexto solo si el plugin está instalado/habilitado.

**Principios obligatorios:**
- No inventar respuestas IA sin datos persistidos.
- El contexto debe ser resumido; no cargar toda la historia de una orden.
- Si faltan datos, responder con nulos/arrays vacíos y no romper chat.

**No hagas:**
- No tocar páginas del chat fuera de lo necesario.
- No mezclar costos industriales con saldos contables derivados.

**Criterio de éxito:**
- El plugin puede emitir eventos contables y enriquecer a Don Cándido con contexto real de manufactura.

---

## Ola 3 — UX operativa, kanban y configuración
> Ejecutar SOLO después de que Ola 2 esté completa
> Ejecutar Agente A + Agente B + Agente C en PARALELO

## Agente A — Dashboard industrial y Kanban de producción
**Puede ejecutarse en paralelo con:** Agente B, Agente C
**Depende de:** Ola 2 completa

### Objetivo
Crear la experiencia operativa principal del plugin: dashboard industrial y kanban de producción por etapas.

### Archivos a crear
- `src/app/(dashboard)/industrial-costing/page.tsx` — dashboard industrial
- `src/app/(dashboard)/industrial-costing/kanban/page.tsx` — kanban de producción
- `src/components/industrial-costing/IndustrialDashboard.tsx` — tablero de KPIs y alertas
- `src/components/industrial-costing/ManufacturingKanban.tsx` — kanban por etapas con costo acumulado visible

### Archivos a modificar
- ninguno

### Prompt completo para el agente
Trabajas en `9001app-firebase`. Debes construir la UI operativa principal del plugin industrial.

**Lee antes de escribir:**
1. `src/components/ui/unified-kanban.tsx`
2. `src/components/design-system/patterns/kanban/UnifiedKanban.tsx`
3. `src/app/(dashboard)/layout.tsx`
4. `src/app/api/industrial-costing/orders/route.ts`
5. `src/app/api/industrial-costing/orders/[id]/stage-transition/route.ts`

**Implementa:**
- Dashboard con:
  - órdenes activas
  - WIP total
  - variación estándar vs real
  - scrap/rework
  - etapas atrasadas
  - quick links
- Kanban con columnas por etapa de fabricación.
- Tarjetas con:
  - orden/lote
  - producto
  - responsable
  - fecha
  - costo acumulado
  - alertas
- Quick actions mínimas:
  - ver detalle
  - mover etapa
  - imputar costo

**Límites:**
- No rehacer el design system.
- No tocar otras páginas de negocio.
- Mantener coherencia con la shell del dashboard existente.

**Criterio de éxito:**
- La producción puede leerse visualmente por etapa y costo sin saturación visual.

---

## Agente B — Detalle de orden e imputación de costos
**Puede ejecutarse en paralelo con:** Agente A, Agente C
**Depende de:** Ola 2 completa

### Objetivo
Construir la vista de detalle de orden/producto y la pantalla de imputación de materiales, MOD, CIF y ajustes.

### Archivos a crear
- `src/app/(dashboard)/industrial-costing/orders/[id]/page.tsx` — detalle de orden
- `src/components/industrial-costing/ManufacturingOrderDetail.tsx` — ficha integral de orden
- `src/components/industrial-costing/CostEntryPanel.tsx` — panel de imputación de costos
- `src/components/industrial-costing/CostBreakdownTable.tsx` — tabla estándar vs real por etapa

### Archivos a modificar
- ninguno

### Prompt completo para el agente
Trabajas en `9001app-firebase`. Debes construir el detalle de orden y la UI de carga de costos del plugin industrial.

**Lee antes de escribir:**
1. `src/app/(dashboard)/industrial-costing/page.tsx`
2. `src/features/industrial-costing/types.ts`
3. `src/app/api/industrial-costing/orders/[id]/route.ts`
4. `src/app/api/industrial-costing/orders/[id]/costs/materials/route.ts`
5. `src/app/api/industrial-costing/orders/[id]/costs/labor/route.ts`
6. `src/app/api/industrial-costing/orders/[id]/costs/overhead/route.ts`

**Implementa:**
- Vista con secciones:
  - ficha general
  - ruta y etapas
  - materiales
  - mano de obra
  - CIF
  - variaciones
  - historial
  - movimientos contables relacionados
  - vínculos ISO/documentos/hallazgos si existen
- `CostEntryPanel` con modos:
  - simple
  - avanzado
  - ajuste extraordinario
  - reversión con motivo

**Límites:**
- No crear wizard complejo todavía.
- No agregar librerías nuevas.
- No implementar aprobaciones multiusuario complejas en UI; dejar hooks preparados.

**Criterio de éxito:**
- Un usuario de costos/supervisión puede registrar y leer costos por etapa desde una sola vista consistente.

---

## Agente C — Configuración industrial, reportes base y permisos UI
**Puede ejecutarse en paralelo con:** Agente A, Agente B
**Depende de:** Ola 2 completa

### Objetivo
Crear la UI de configuración industrial y los reportes base del plugin con gating por scopes.

### Archivos a crear
- `src/app/(dashboard)/industrial-costing/settings/page.tsx` — configuración industrial
- `src/app/(dashboard)/industrial-costing/reports/page.tsx` — reportes base
- `src/components/industrial-costing/IndustrialSettingsPanel.tsx` — rutas, etapas, centros, reglas
- `src/components/industrial-costing/IndustrialReportsView.tsx` — reportes de costo y productividad

### Archivos a modificar
- ninguno

### Prompt completo para el agente
Trabajas en `9001app-firebase`. Debes construir la parte administrativa del plugin industrial.

**Lee antes de escribir:**
1. `src/config/plugins/contabilidad_industrial_manufactura.manifest.ts`
2. `src/app/api/industrial-costing/settings/routes/route.ts`
3. `src/app/api/industrial-costing/settings/work-centers/route.ts`
4. `src/app/api/industrial-costing/settings/cost-rules/route.ts`
5. `src/app/api/industrial-costing/settings/boms/route.ts`

**Implementa:**
- Pantalla de configuración:
  - rutas
  - etapas
  - centros de trabajo
  - reglas de CIF
  - parámetros de costeo
  - estructuras/BOM
- Pantalla de reportes base:
  - costo por orden
  - costo por etapa
  - variaciones
  - scrap/retrabajo
  - productividad de centros
- Gating de acciones por scope:
  - lectura
  - escritura
  - aprobación
  - admin
  - ver detalle financiero

**Límites:**
- No hacer exportaciones complejas en esta ola.
- No tocar otros módulos.

**Criterio de éxito:**
- El administrador industrial puede parametrizar el plugin y obtener reportes base sin depender del detalle operativo.

---

## Ola 4 — Integración final, tests y endurecimiento
> Ejecutar SOLO después de que Ola 3 esté completa
> Ejecutar Agente A + Agente B en PARALELO

## Agente A — Tests backend, seguridad y contabilidad
**Puede ejecutarse en paralelo con:** Agente B
**Depende de:** Ola 3 completa

### Objetivo
Cubrir con tests el backend industrial, la seguridad multi-tenant y la emisión de eventos contables.

### Archivos a crear
- `src/__tests__/industrial-costing/services/IndustrialCostingService.test.ts`
- `src/__tests__/industrial-costing/services/StageTransferService.test.ts`
- `src/__tests__/industrial-costing/services/IndustrialAccountingBridgeService.test.ts`
- `src/__tests__/industrial-costing/api/orders.route.test.ts`
- `src/__tests__/industrial-costing/api/stage-transition.route.test.ts`
- `src/__tests__/industrial-costing/api/settings.security.test.ts`

### Archivos a modificar
- ninguno

### Prompt completo para el agente
Trabajas en `9001app-firebase` con Jest. Debes endurecer el backend del plugin industrial.

**Lee antes de escribir:**
1. `src/__tests__/crm/api/facturas.test.ts`
2. `src/__tests__/lib/accounting/AccountingEngine.test.ts`
3. `src/features/industrial-costing/services/IndustrialCostingService.ts`
4. `src/features/industrial-costing/services/StageTransferService.ts`
5. `src/features/industrial-costing/services/IndustrialAccountingBridgeService.ts`

**Cubre como mínimo:**
- cálculo estándar vs real
- cierre de etapa y snapshot congelado
- diferenciación scrap normal/anormal
- idempotencia en eventos contables
- 401/403 por `withAuth`
- aislamiento por organización
- rechazo de `organization_id` ajeno en body/query

**Criterio de éxito:**
- El backend queda protegido contra regresiones funcionales y de seguridad.

---

## Agente B — Tests UI, smoke de flujos y verificación del MVP
**Puede ejecutarse en paralelo con:** Agente A
**Depende de:** Ola 3 completa

### Objetivo
Cubrir el flujo visible del usuario industrial: dashboard, kanban, detalle de orden, configuración y reportes.

### Archivos a crear
- `src/__tests__/industrial-costing/ui/IndustrialDashboard.test.tsx`
- `src/__tests__/industrial-costing/ui/ManufacturingKanban.test.tsx`
- `src/__tests__/industrial-costing/ui/ManufacturingOrderDetail.test.tsx`
- `src/__tests__/industrial-costing/ui/IndustrialSettingsPanel.test.tsx`
- `src/__tests__/industrial-costing/ui/IndustrialReportsView.test.tsx`

### Archivos a modificar
- ninguno

### Prompt completo para el agente
Trabajas en `9001app-firebase`. Debes verificar que el MVP del plugin industrial sea utilizable y no solo correcto a nivel backend.

**Lee antes de escribir:**
1. `src/components/industrial-costing/IndustrialDashboard.tsx`
2. `src/components/industrial-costing/ManufacturingKanban.tsx`
3. `src/components/industrial-costing/ManufacturingOrderDetail.tsx`
4. `src/components/industrial-costing/IndustrialSettingsPanel.tsx`
5. `src/components/industrial-costing/IndustrialReportsView.tsx`

**Cubre como mínimo:**
- render de KPIs principales
- columnas del kanban por etapa
- visualización de costo acumulado
- panel de imputación de costos
- visibilidad condicional por scopes
- estados vacíos y errores de carga

**Criterio de éxito:**
- El MVP tiene smoke coverage suficiente para detectar roturas de navegación, permisos y lectura operativa.

---

## Verificación final

**Arquitectura y plugin:**
- El plugin `contabilidad_industrial_manufactura` aparece registrado en manifests.
- Declara dependencia explícita con `contabilidad_central`.
- Tiene scopes y rutas consistentes con el sistema de plugins actual.

**Backend industrial:**
- Se pueden configurar rutas, etapas, centros y reglas.
- Se puede crear una orden y avanzar por etapas.
- Se puede imputar materiales, MOD y CIF.
- Cada etapa deja snapshot y transferencia de costo acumulado.
- Scrap y retrabajo quedan trazados.

**Contabilidad central:**
- Los eventos industriales se emiten con `plugin_id` correcto e `idempotency_key`.
- No se almacenan saldos duplicados en el plugin industrial.
- Los asientos quedan delegados al motor de `contabilidad_central`.

**Kanban e ISO:**
- El kanban de producción refleja etapas reales.
- El detalle de orden puede vincular documentos, procesos, hallazgos o no conformidades sin acoplamiento duro.
- La trazabilidad de auditoría queda disponible por orden, etapa y evento.

**UI y UX:**
- Dashboard, Kanban, Detalle, Settings y Reports están accesibles desde la shell del dashboard.
- El header no compite con la operación.
- La lectura del costo acumulado por etapa es inmediata.

**Testing:**
```bash
npx jest src/__tests__/industrial-costing
npx tsc --noEmit
```

---

## Recomendación de secuencia funcional dentro del MVP

1. Priorizar orden + etapas + imputación manual + snapshots + bridge contable.
2. Luego sumar kanban de producción y detalle de orden.
3. Dejar para fase 2: sugerencias semiautomáticas desde BOM/tiempos estándar, aprobaciones avanzadas, análisis IA de desvíos.
4. Dejar para fase 3: backflush opcional, cierre parcial sofisticado, costeo más fino por capacidad/centro y automatizaciones premium.

---

## Riesgos que el plan ya evita

- Duplicar contabilidad dentro del plugin industrial.
- Mezclar trazabilidad operativa con saldos oficiales.
- Diseñar solo para proceso puro y perder flexibilidad para órdenes/lotes híbridos.
- Meter IA sin datos suficientes.
- Confiar en `organization_id` enviado por el cliente.
