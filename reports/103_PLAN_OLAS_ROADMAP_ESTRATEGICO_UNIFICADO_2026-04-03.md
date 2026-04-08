# Plan Roadmap Estratégico Unificado — Ejecución multi-agente

**Fecha:** 2026-04-03
**Feature:** Continuación unificada de Plan 101 (Análisis Estratégico ↔ Centro Agéntico) y Plan 102 (Roadmap Inteligente Mi SGC)
**Proyectos afectados:** 9001app-firebase

---

## Estado de partida — Ola 1 ya ejecutada

Este plan es la **continuación directa** de dos planes que se ejecutaron en paralelo por equipos separados. La Ola 1 de ambos está completa:

### Completado por Plan 101 Ola 1 (este equipo)

**Agente A — StrategicAnalysisConfidenceService:**
- `src/services/strategic-analysis/StrategicAnalysisConfidenceService.ts` — creado
- `StrategicAnalysisResult` tiene: `context_completeness_pct`, `confidence_level`, `missing_sources`, `dimension_coverage`
- `StrategicAnalysisContextBuilder` intenta cargar `compliance_scores` y `maturity_scores`
- El servicio inyecta confianza en el prompt IA y usa `pluginContexts['crm']`
- `StrategicAnalysisReportService` persiste los 4 campos nuevos

**Agente B — Sinceramiento Centro Agéntico:**
- `src/services/agentic-center/AgenticCenterCaseMapper.ts` — creado
- `GET /api/agentic-center/cases` — demos solo con `?demo=true` + `NODE_ENV !== 'production'`
- `GET /api/agentic-center/summary` — conteos org-scoped: `pending_approvals_count`, `blocked_sagas_count`, `failed_jobs_count`
- `AgenticCenterCase` tiene: `type`, `source_entity`, `source_id`, `severity`, `requires_human_decision`, `confidence_level`, `org_id`

### Completado por Plan 102 Ola 1 (equipo paralelo)

**Agente A — JourneyAutoProgressService:**
- `src/services/JourneyAutoProgressService.ts` — creado
- `POST /api/journey/auto-progress` — endpoint protegido

**Agente B — JourneyStrategicBadgeService:**
- `src/services/JourneyStrategicBadgeService.ts` — creado
- `GET /api/journey/strategic-badges` — endpoint protegido

**Agente C — ProactiveHintsService enriquecido:**
- `getSuggestionsByOperationalSnapshot(snapshot)` — nuevo método
- `OperationalSnapshot` interface — definida
- `getContextualGreeting()` acepta `pendingCount` opcional

### Pendiente de Ola 1 (va a 103 Ola 1)

**Agente C del Plan 101 — Alertas ejecutivas:** tipos `ExecutiveAlert` y reglas deterministicas aún no implementados. Es la primera ola de este plan porque modifica `src/types/strategic-analysis.ts` y `src/types/agentic-center.ts` (ya modificados por 101-A y 101-B — debe ir después).

---

## Resumen de olas

| Ola | Agentes | Paralelos entre sí | Dependen de |
|-----|---------|---------------------|-------------|
| 1 | A | No aplica (único) | Nada — pero lee tipos ya modificados por 101 Ola1-A y 101 Ola1-B |
| 2 | A, B, C | Sí | Ola 1 completa |
| 3 | A | No aplica (único) | Ola 2 completa (comparte StrategicAnalysisReportService con Ola 2-A) |
| 4 | A, B | Sí | Ola 3 completa |

---

## Ola 1 — Contrato de alertas ejecutivas
> Un solo agente — ejecutar antes que cualquier cosa de Ola 2

### Agente A — Modelo canónico de alertas ejecutivas
**Puede ejecutarse en paralelo con:** es el único de esta ola
**Depende de:** nada — pero leer tipos actualizados por 101 Ola1-A y 101 Ola1-B antes de escribir

#### Objetivo
Crear el contrato transversal de alertas ejecutivas (`ExecutiveAlert`) que sirva de lenguaje común entre el Análisis Estratégico y el Centro Agéntico, con reglas deterministicas que no dependen de IA.

#### Archivos a crear
- `src/types/executive-alerts.ts` — tipo `ExecutiveAlert` con severidad, origen, aging, acción sugerida y flags de decision humana
- `src/services/executive-alerts/ExecutiveAlertRules.ts` — reglas deterministicas: alertas desde análisis estratégico, aging de backlog y sagas bloqueadas

#### Archivos a modificar
- `src/types/strategic-analysis.ts` — agregar campo `executive_alerts?: ExecutiveAlert[]` en `StrategicAnalysisResult` (ya tiene `confidence_level` etc de Ola1-A — agregar solo este campo)
- `src/types/agentic-center.ts` — agregar `executive_alerts_count?: number` al tipo de resumen (ya tiene `pending_approvals_count` etc de Ola1-B — agregar solo este campo)

#### Prompt completo para el agente

Trabajas en un proyecto Next.js 14 + TypeScript + Firestore. Tu tarea es crear el contrato canónico de alertas ejecutivas que unifique Análisis Estratégico y Centro Agéntico.

**Stack:**
- Next.js 14 + TypeScript strict + Zod v4.1.12
- Zod v4: `z.record(z.string(), valueType)` — 2 argumentos obligatorios
- Raíz del proyecto: `c:\Users\Usuario\Documents\Proyectos\ISO -conjunto\9001app-firebase`

**PASO 1 — Lee estos archivos ANTES de escribir nada:**
1. `src/types/strategic-analysis.ts` — ya tiene `context_completeness_pct`, `confidence_level`, `missing_sources`, `dimension_coverage` (agregados en Ola 1). Busca la interfaz principal del resultado para agregar `executive_alerts`
2. `src/types/agentic-center.ts` — ya tiene `pending_approvals_count`, `blocked_sagas_count`, `failed_jobs_count` en el summary. Busca el tipo de resumen para agregar `executive_alerts_count`
3. `src/services/strategic-analysis/StrategicAnalysisService.ts` — para entender qué produce el análisis
4. `src/app/api/agentic-center/summary/route.ts` — para entender qué devuelve el summary

**PASO 2 — Implementa exactamente esto:**

### 2a. Crear `src/types/executive-alerts.ts`

```typescript
import { Timestamp } from 'firebase-admin/firestore';

export interface ExecutiveAlert {
  id: string;
  severity: 'critica' | 'alta' | 'media';
  source: 'strategic_analysis' | 'agentic_center' | 'aging' | 'confidence';
  source_ref_id?: string;           // id del reporte o caso origen
  title: string;
  description: string;
  affected_entity?: string;         // proceso, departamento, plugin
  requires_human_decision: boolean;
  recommended_action?: string;
  expires_at?: Timestamp;
  created_at: Timestamp;
  org_id: string;
}
```

### 2b. Crear `src/services/executive-alerts/ExecutiveAlertRules.ts`

Clase con métodos estáticos (sin dependencias Firestore — recibe los datos ya cargados):

```typescript
import { Timestamp } from 'firebase-admin/firestore';
import { ExecutiveAlert } from '@/types/executive-alerts';

export class ExecutiveAlertRules {
  // Genera alertas desde un reporte de análisis estratégico
  // - Si confidence_level === 'bajo' → alerta severity 'alta', source 'confidence'
  // - Si hay norm_gaps con score < 40 → alerta severity 'alta', source 'strategic_analysis' por cada brecha severa
  // - Si global_score < 50 → alerta severity 'media' de score bajo
  static alertsFromStrategicAnalysis(report: {
    id: string;
    org_id: string;
    confidence_level?: string;
    global_score?: number;
    norm_gaps?: Array<{ area: string; score: number; gap_description?: string }>;
    created_at: Timestamp;
  }): ExecutiveAlert[]

  // Genera alertas desde aging de aprobaciones pendientes
  // - Si alguna aprobación tiene más de maxDaysBeforeAlert días → alerta severity 'alta'
  static alertsFromAgingBacklog(params: {
    org_id: string;
    pending_approvals: Array<{ id: string; created_at: Date | Timestamp; entity_description?: string }>;
    max_days_before_alert: number;
  }): ExecutiveAlert[]

  // Genera alertas desde sagas bloqueadas
  // - Saga pausada más de 7 días → alerta severity 'media'
  static alertsFromBlockedSagas(params: {
    org_id: string;
    blocked_sagas: Array<{ id: string; name?: string; paused_at?: Date | Timestamp; status: string }>;
  }): ExecutiveAlert[]
}
```

Para los `id` de las alertas usar: `${source}-${source_ref_id || Date.now()}-${Math.random().toString(36).slice(2, 7)}`

Para `created_at` usar `Timestamp.now()`.

### 2c. En `src/types/strategic-analysis.ts`

Busca la interfaz `StrategicAnalysisResult` (o como se llame). Ya tiene los campos de confianza de Ola 1. Agregar **solo**:
```typescript
executive_alerts?: ExecutiveAlert[];
```
Importar `ExecutiveAlert` de `@/types/executive-alerts`.

### 2d. En `src/types/agentic-center.ts`

Busca el tipo del resumen (puede llamarse `AgenticCenterSummary` o similar). Ya tiene `pending_approvals_count` etc. Agregar **solo**:
```typescript
executive_alerts_count?: number;
```

**REGLAS:**
- NO implementar UI ni persistencia global de alertas todavía
- NO conectar los dos subsistemas todavía (eso es Ola 2)
- Solo definir el contrato y las reglas
- Los métodos son ESTÁTICOS y PUROS — sin async, sin Firestore directo
- Si `Timestamp` de firebase-admin falla en imports, usar `Date` como alternativa en los tipos

**CRITERIO DE ÉXITO:**
- `ExecutiveAlert` tipo exportado en `src/types/executive-alerts.ts`
- `ExecutiveAlertRules` con 3 métodos estáticos en `src/services/executive-alerts/ExecutiveAlertRules.ts`
- `StrategicAnalysisResult` tiene `executive_alerts?`
- El summary de `agentic-center.ts` tiene `executive_alerts_count?`
- `npx tsc --noEmit` pasa sin errores nuevos

---

## Ola 2 — Bridge, RoadmapTab y Snapshot
> Ejecutar SOLO después de que Ola 1 esté completa
> Ejecutar Agente A + Agente B + Agente C en PARALELO

**Nota:** Agente A y Agente C NO comparten archivos. Agente B y Agente C NO comparten archivos. Son 3 agentes completamente independientes entre sí.

### Agente A — Bridge de reportes estratégicos a casos agénticos
**Puede ejecutarse en paralelo con:** Agente B, Agente C
**Depende de:** Ola 1 completa (necesita `ExecutiveAlert` y `executive_alerts` en `StrategicAnalysisResult`)

#### Objetivo
Transformar brechas, prioridades y alertas críticas del análisis estratégico en casos reales del Centro Agéntico con trazabilidad completa.

#### Archivos a crear
- `src/services/agentic-center/StrategicAnalysisToCaseBridge.ts` — mapea reportes estratégicos a `AgenticCenterCase[]`

#### Archivos a modificar
- `src/app/api/agentic-center/cases/route.ts` — incluir casos del bridge junto a los casos reales del `AgenticCenterCaseMapper`
- `src/services/strategic-analysis/StrategicAnalysisReportService.ts` — guardar `agentic_case_ids[]` al persistir el reporte

#### Prompt completo para el agente

Trabajas en un proyecto Next.js 14 + TypeScript + Firestore. Tu tarea es crear el bridge que conecta los reportes del Análisis Estratégico con el Centro Agéntico.

**Stack:**
- Next.js 14 + TypeScript strict + Firebase Admin SDK
- Pattern API routes: `withAuth` + `resolveAuthorizedOrganizationId`
- Raíz: `c:\Users\Usuario\Documents\Proyectos\ISO -conjunto\9001app-firebase`

**PASO 1 — Lee estos archivos ANTES de escribir nada:**
1. `src/services/strategic-analysis/StrategicAnalysisReportService.ts` — para leer el último reporte
2. `src/services/strategic-analysis/StrategicAnalysisService.ts` — para entender qué produce
3. `src/types/strategic-analysis.ts` — tiene `StrategicAnalysisResult` con `executive_alerts`, `norm_gaps`, `priorities`, `confidence_level`
4. `src/types/agentic-center.ts` — tiene `AgenticCenterCase` con `source_entity`, `source_id`, `requires_human_decision`
5. `src/types/executive-alerts.ts` — creado en Ola 1, tiene `ExecutiveAlert`
6. `src/app/api/agentic-center/cases/route.ts` — ya limpio de demos (Ola1-B), usa `AgenticCenterCaseMapper`
7. `src/services/agentic-center/AgenticCenterCaseMapper.ts` — creado en Ola1-B

**PASO 2 — Implementa exactamente esto:**

### 2a. Crear `src/services/agentic-center/StrategicAnalysisToCaseBridge.ts`

```typescript
export class StrategicAnalysisToCaseBridge {
  toBridgedCases(report: StrategicAnalysisResult, orgId: string): AgenticCenterCase[]
}
```

Reglas de conversión (solo para reportes con `created_at` en los últimos 90 días):
- Brecha de norma (`norm_gaps`) con score < 40 → caso `type: 'brecha_normativa'`, `severity: 'alta'`, `requires_human_decision: true`
- `executive_alerts` con `severity: 'critica'` → caso `type: 'alerta_ejecutiva'`, `severity: 'alta'`, `requires_human_decision: true`
- `priorities` de horizonte `'30d'` con impacto `'critico'` o `'alto'` → caso `type: 'accion_estrategica'`, `severity: 'media'`, `requires_human_decision: true`

Cada caso generado:
- `source_entity: 'strategic_analysis_report'`
- `source_id: report.id`
- `org_id: orgId`
- `id: 'bridge-${report.id}-${index}'`
- `created_at: report.created_at`

### 2b. En `src/app/api/agentic-center/cases/route.ts`

Después de obtener `realCases` del `AgenticCenterCaseMapper`, agregar:
```typescript
const bridge = new StrategicAnalysisToCaseBridge();
// Leer último reporte estratégico
const lastReport = await strategicReportService.getLatestReport(orgId);
const bridgedCases = lastReport ? bridge.toBridgedCases(lastReport, orgId) : [];
const casos = [...realCases, ...bridgedCases, ...demoCases];
```

Agregar a `meta`: `bridged_count: bridgedCases.length`.

### 2c. En `src/services/strategic-analysis/StrategicAnalysisReportService.ts`

Al guardar/actualizar el reporte, si ya se generaron casos del bridge, guardar:
```typescript
agentic_case_ids?: string[];  // ids de los casos generados por el bridge
```
Este campo es informativo — no bloquea si no está. Agregar al tipo si hace falta.

**REGLAS:**
- NO autoejecutar acciones — todo requiere confirmación humana cuando `requires_human_decision: true`
- Los casos del bridge son CALCULADOS en tiempo de consulta, no persistidos en Firestore
- NO cambiar la UI del Centro Agéntico

**CRITERIO DE ÉXITO:** un reporte estratégico con brecha severa aparece como caso en el Centro Agéntico con `source_id` trazable. `tsc --noEmit` limpio.

---

### Agente B — RoadmapTab interactivo
**Puede ejecutarse en paralelo con:** Agente A, Agente C
**Depende de:** Ola 1 completa (APIs `/api/journey/auto-progress` y `/api/journey/strategic-badges` ya existen de Plan 102 Ola 1)

#### Objetivo
Reescribir `RoadmapTab.tsx` para que sea completamente interactivo: tareas completables, links activos, botón IA, saludo proactivo y badges de alerta estratégica por fase.

#### Archivos a crear
- ninguno

#### Archivos a modificar
- `src/app/mi-sgc/tabs/RoadmapTab.tsx` — reescritura completa del componente

#### Prompt completo para el agente

Trabajas en un proyecto Next.js 14 + TypeScript + Tailwind + React 18. Tu tarea es reescribir el RoadmapTab para que sea interactivo.

**Stack:**
- Next.js 14 + TypeScript strict + Tailwind CSS + React 18
- Componente con `'use client'`
- Raíz: `c:\Users\Usuario\Documents\Proyectos\ISO -conjunto\9001app-firebase`

**PASO 1 — Lee TODOS estos archivos antes de escribir:**
1. `src/app/mi-sgc/tabs/RoadmapTab.tsx` — archivo a reescribir, entender estructura actual
2. `src/services/JourneyService.ts` — para usar `saveJourneyProgress` y `getJourneyProgress`
3. `src/lib/iso/phases.ts` — estructura de fases, `PhaseTask` tiene `puedeGenerarseConIA`, `rutaModulo`, `dataSource`
4. `src/features/chat/services/ProactiveHintsService.ts` — tiene `getSuggestionsByOperationalSnapshot`, `getContextualGreeting`, `OperationalSnapshot`
5. `src/features/chat/components/ProactiveSuggestionsCard.tsx` — componente visual ya construido
6. `src/services/JourneyStrategicBadgeService.ts` — para entender `JourneyPhaseBadge`
7. `src/services/JourneyAutoProgressService.ts` — para saber qué devuelve el endpoint

Si algún componente no existe (ej: `DonCandidoAvatar`), búscalo con Glob o usa un fallback simple con un `div` con icono de Bot de lucide-react.

**PASO 2 — Reescribe `RoadmapTab.tsx` con estas funcionalidades:**

**1. Saludo proactivo al tope**
- Al montar, hacer `GET /api/journey/snapshot` para obtener el `OperationalSnapshot`
- Si el fetch falla, usar snapshot vacío (no romper el componente)
- Mostrar un bloque con icono Bot y el texto de `ProactiveHintsService.getContextualGreeting(userName, faseActual, horaActual, pendingCount)`
- Debajo, montar `<ProactiveSuggestionsCard suggestions={...} />` con las sugerencias de `ProactiveHintsService.getSuggestionsByOperationalSnapshot(snapshot)`

**2. Autoprogreso al montar**
- Al cargar, hacer `POST /api/journey/auto-progress` en background con `fetch(..., { method: 'POST' })`
- No bloquear la UI — si falla, ignorar
- El resultado actualiza el state local de `progress`

**3. Tareas completables con checkbox**
- En el detalle expandido de cada fase (donde está `expandedPhaseId`), cada tarea muestra un checkbox
- Al tildar: optimistic update local + llamar `JourneyService.saveJourneyProgress(orgId, fasesActualizadas)`
- Tareas completadas: `line-through` + texto gris
- Checkbox `disabled` si la fase está `'locked'`
- Para obtener `orgId` usar `useAuth()` de `@/contexts/AuthContext`

**4. Links activos a módulos**
- Cada tarea con `rutaModulo` muestra botón pequeño: `→ [nombre del módulo]`
- Usar `<Link href={tarea.rutaModulo}>` de Next.js
- Mostrar en la misma línea que el título de la tarea

**5. Botón "Generar con Don Cándido"**
- Tareas con `puedeGenerarseConIA: true` muestran botón: `✨ Generar`
- Al clickear: `router.push('/don-candido?task=${tarea.id}&phase=${fase.id}')`
- Usar `useRouter` de `next/navigation`

**6. Badges de alerta estratégica**
- Al montar, hacer `GET /api/journey/strategic-badges`
- Si una fase tiene badge: chip en el header de la tarjeta
  - `level: 'critical'` → chip rojo `🔴 N críticos`
  - `level: 'warning'` → chip naranja `⚠ N hallazgos`
- Al hacer hover sobre el chip, mostrar `title={badge.topFinding}` como tooltip nativo

**REGLAS:**
- Mantener mismo diseño visual base y colores por fase del original
- No cambiar el sistema de `expandedPhaseId`
- No agregar librerías nuevas
- `'use client'` obligatorio
- Usar `useAuth()` del contexto para obtener `user`

**CRITERIO DE ÉXITO:** Don Cándido saluda al entrar, tareas se pueden tildar y el progreso persiste, links navegan a módulos, badge de Fase 3 aparece si hay hallazgo crítico en procesos.

---

### Agente C — Snapshot operativo y banner en Mi SGC
**Puede ejecutarse en paralelo con:** Agente A, Agente B
**Depende de:** Ola 1 completa (necesita `OperationalSnapshot` de `ProactiveHintsService`)

#### Objetivo
Crear el endpoint `/api/journey/snapshot` que agrega datos reales del tenant en un solo llamado, y agregar el banner de bienvenida de Don Cándido en la página principal de Mi SGC.

#### Archivos a crear
- `src/app/api/journey/snapshot/route.ts` — endpoint GET que agrega datos reales del tenant

#### Archivos a modificar
- `src/app/mi-sgc/page.tsx` — agregar bloque de bienvenida con Don Cándido

#### Prompt completo para el agente

Trabajas en un proyecto Next.js 14 + TypeScript + Firestore Admin SDK. Tu tarea es crear el endpoint de snapshot operativo y agregar el banner de bienvenida.

**Stack:**
- Next.js 14 + TypeScript strict + Firebase Admin SDK
- Pattern obligatorio: `withAuth` + `resolveAuthorizedOrganizationId`
- NUNCA `organization_id` del query string — siempre del token
- Raíz: `c:\Users\Usuario\Documents\Proyectos\ISO -conjunto\9001app-firebase`

**PASO 1 — Lee estos archivos ANTES de escribir:**
1. `src/app/mi-sgc/page.tsx` — página principal de Mi SGC a modificar
2. `src/lib/api/withAuth.ts` — patrón de auth
3. `src/middleware/verifyOrganization.ts` — `resolveAuthorizedOrganizationId`
4. `src/features/chat/services/ProactiveHintsService.ts` — para ver la interfaz `OperationalSnapshot`
5. `src/app/api/agentic-center/summary/route.ts` — para reutilizar cómo se cuenta `direct_action_confirmations`

**PASO 2 — Implementa:**

### 2a. Crear `GET /api/journey/snapshot`

Usando `withAuth` (cualquier rol autenticado), resolver `orgId`, luego con `Promise.all` leer en paralelo:

- `organizations/{orgId}/hallazgos` donde `status != 'cerrado'` → `hallazgosAbiertos`
- `organizations/{orgId}/acciones` donde `status` in `['pending', 'en_progreso']` → `accionesPendientes`
- `organizations/{orgId}/acciones` donde `fecha_vencimiento < now` y `status != 'completada'` → `accionesVencidas`
- `organizations/{orgId}/auditorias` donde `status == 'planificada'` → `auditoriasPlaneadas`
- `organizations/{orgId}/capacitaciones` donde `completada == false` y `fecha_vencimiento < now` → `capacitacionesPendientes`
- `direct_action_confirmations` donde `organization_id == orgId` y `status == 'pending'` → `directActionsPendientes`
- `organizations/{orgId}/strategic_analysis_reports` ordenado desc por `created_at` limit 1 → `diasSinAnalisisEstrategico` (días desde `created_at`; null si no hay reporte)
- `organizations/{orgId}/journey/progress` → `faseActual` y `porcentajeFaseActual` (fase con mayor progreso que no esté `locked`)

Si alguna consulta falla, usar 0 como fallback. Retornar `{ snapshot: OperationalSnapshot }`.

Nota: si el nombre exacto de los campos (`status`, `fecha_vencimiento`, etc.) no coincide con lo que hay en Firestore, busca con Grep en el código cómo se usan esas colecciones y adapta.

### 2b. Modificar `src/app/mi-sgc/page.tsx`

Agregar al tope del contenido (antes del `<Tabs>` o del bloque principal) un bloque estático `'use server'` o inline:

```tsx
{/* Banner Don Cándido */}
<div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
    <Bot className="w-4 h-4 text-white" />
  </div>
  <div className="flex-1">
    <p className="text-sm font-medium text-green-800">Don Cándido activo</p>
    <p className="text-xs text-green-600">Tu asistente de gestión está listo para ayudarte</p>
  </div>
</div>
```

No hacer fetch desde `page.tsx` — el fetch del snapshot lo hace el `RoadmapTab.tsx`.

**CRITERIO DE ÉXITO:** `GET /api/journey/snapshot` devuelve `OperationalSnapshot` completo con todos los campos. El banner aparece en Mi SGC. `tsc --noEmit` limpio.

---

## Ola 3 — Comparativa histórica y SLA de decisión
> Ejecutar SOLO después de que Ola 2 esté completa (Ola 2-A modifica `StrategicAnalysisReportService.ts` — esta ola también lo toca)

### Agente A — Tendencias históricas y aging de aprobaciones
**Puede ejecutarse en paralelo con:** es el único de esta ola
**Depende de:** Ola 2 completa

#### Objetivo
Agregar comparativa histórica por dimensión al Análisis Estratégico y exponer aging de decisiones pendientes en el Centro Agéntico.

#### Archivos a crear
- `src/services/strategic-analysis/StrategicAnalysisTrendService.ts` — calcula deltas y tendencias comparando reportes históricos

#### Archivos a modificar
- `src/services/strategic-analysis/StrategicAnalysisReportService.ts` — soportar carga de reportes anteriores para comparativa
- `src/services/strategic-analysis/StrategicAnalysisService.ts` — incluir `trend` en el resultado cuando hay historial; si deterioro > 10pts → generar `ExecutiveAlert` automática
- `src/app/api/agentic-center/summary/route.ts` — agregar `oldest_pending_approval_days` y `blocked_sagas_max_age_days`
- `src/types/agentic-center.ts` — agregar ambos campos al tipo de resumen

#### Prompt completo para el agente

Trabajas en un proyecto Next.js 14 + TypeScript + Firestore. Tu tarea es agregar comparativa histórica al Análisis Estratégico y aging de decisiones al Centro Agéntico.

**Stack:**
- Next.js 14 + TypeScript strict + Firebase Admin SDK
- Raíz: `c:\Users\Usuario\Documents\Proyectos\ISO -conjunto\9001app-firebase`

**PASO 1 — Lee estos archivos ANTES de escribir:**
1. `src/services/strategic-analysis/StrategicAnalysisReportService.ts` — ya fue modificado en Ola 2-A (tiene `agentic_case_ids`)
2. `src/services/strategic-analysis/StrategicAnalysisService.ts` — ya tiene confianza de Ola1-A
3. `src/app/api/agentic-center/summary/route.ts` — ya tiene `pending_approvals_count` etc de Ola1-B
4. `src/types/agentic-center.ts` — ya tiene los campos de Ola1-B
5. `src/types/executive-alerts.ts` — para generar alertas de deterioro
6. `src/services/executive-alerts/ExecutiveAlertRules.ts` — para usar el contrato de alertas
7. `reports/archive/97_ESTADO_ANALISIS_ESTRATEGICO_IA_2026-04-02.md` — contexto del backlog pendiente

**PASO 2 — Implementa:**

### 2a. Crear `src/services/strategic-analysis/StrategicAnalysisTrendService.ts`

```typescript
export interface AnalysisTrend {
  global_score_delta: number;              // +5 mejoro, -3 empeoro
  dimension_deltas: Record<string, number>; // delta por dimensión
  trend_direction: 'mejorando' | 'estable' | 'empeorando';
  periods_analyzed: number;                // cuántos reportes anteriores se usaron
  previous_report_date?: Date;
}

export class StrategicAnalysisTrendService {
  async getTrend(
    orgId: string,
    currentReportId: string,
    lookback: number = 3        // cuántos reportes previos considerar
  ): Promise<AnalysisTrend>
}
```

Lógica: leer N reportes anteriores al `currentReportId` ordenados por `created_at` desc. Calcular promedio de `global_score` de los anteriores. Delta = score actual - promedio anterior. `trend_direction`: delta > +5 → 'mejorando', delta < -5 → 'empeorando', sino 'estable'. Si no hay reportes anteriores: `periods_analyzed: 0`, deltas en 0.

### 2b. En `StrategicAnalysisService`

Después de generar el análisis, llamar `trendService.getTrend(orgId, reportId)`. Asignar al resultado:
```typescript
trend?: AnalysisTrend;
```
Si `trend.trend_direction === 'empeorando'` y `Math.abs(trend.global_score_delta) > 10`:
→ generar `ExecutiveAlert` via `ExecutiveAlertRules` y agregarla a `executive_alerts[]` del resultado.

Agregar `trend?: AnalysisTrend` al tipo `StrategicAnalysisResult` en `src/types/strategic-analysis.ts`.

### 2c. En `GET /api/agentic-center/summary`

Agregar:
- `oldest_pending_approval_days`: días desde la `direct_action_confirmation` pendiente más antigua de la org. Usar `created_at` del documento más antiguo que tenga `status == 'pending'` de la org. Si no hay → `null`
- `blocked_sagas_max_age_days`: días desde la saga pausada/fallida más antigua de la org. Si no hay → `null`

### 2d. En `src/types/agentic-center.ts`

Agregar al tipo de summary:
```typescript
oldest_pending_approval_days: number | null;
blocked_sagas_max_age_days: number | null;
```

**CRITERIO DE ÉXITO:** el sistema puede decir no solo qué está mal hoy, sino si está empeorando. Un deterioro > 10 pts genera alerta ejecutiva automática. El summary muestra cuántos días lleva la aprobación más antigua sin respuesta.

---

## Ola 4 — Tests unificados
> Ejecutar SOLO después de que Ola 3 esté completa
> Ejecutar Agente A + Agente B en PARALELO (no comparten archivos de test)

### Agente A — Tests del sistema estratégico y agéntico
**Puede ejecutarse en paralelo con:** Agente B
**Depende de:** Ola 3 completa

#### Objetivo
Tests de regresión para el circuito completo del Plan 101: confianza, bridge, alertas, trend y sinceramiento de demos.

#### Archivos a crear
- `src/__tests__/api/strategic-analysis.agentic-bridge.test.ts`
- `src/__tests__/services/StrategicAnalysisConfidenceService.test.ts`
- `src/__tests__/services/StrategicAnalysisTrendService.test.ts`
- `src/__tests__/services/ExecutiveAlertRules.test.ts`
- `src/__tests__/api/agentic-center.cases.demo-separation.test.ts`

#### Prompt completo para el agente

Trabajas en un proyecto con Jest y tests en `src/__tests__/`. Tu tarea es agregar tests de regresión para el sistema estratégico y agéntico.

**Stack:** Next.js 14 + TypeScript + Jest. Raíz: `c:\Users\Usuario\Documents\Proyectos\ISO -conjunto\9001app-firebase`

**Lee antes de empezar:**
- `src/__tests__/services/DirectActionService.test.ts` — modelo de patrón de mocking
- `src/__tests__/api/agentic-center.cases.test.ts` — modelo de test de API
- `src/services/strategic-analysis/StrategicAnalysisConfidenceService.ts`
- `src/services/strategic-analysis/StrategicAnalysisTrendService.ts`
- `src/services/executive-alerts/ExecutiveAlertRules.ts`
- `src/services/agentic-center/StrategicAnalysisToCaseBridge.ts`

**Implementa tests para:**

`StrategicAnalysisConfidenceService`:
- Contexto con todos los campos → `confidence_level: 'alto'`, completeness > 75%
- Contexto sin `compliance` y `maturity` → esos campos en `missing_sources`
- Contexto vacío → `confidence_level: 'bajo'`

`ExecutiveAlertRules`:
- `alertsFromStrategicAnalysis` con `confidence_level: 'bajo'` → genera alerta `source: 'confidence'`
- `alertsFromStrategicAnalysis` con norm_gap score 30 → genera alerta `source: 'strategic_analysis'`
- `alertsFromAgingBacklog` con aprobación de 8 días y maxDays=7 → genera alerta
- `alertsFromBlockedSagas` con saga pausada 10 días → genera alerta

`StrategicAnalysisTrendService`:
- 3 reportes previos con scores [70, 65, 68] y score actual 60 → `trend_direction: 'empeorando'`, delta negativo
- Sin historial → `periods_analyzed: 0`, sin error
- Delta > 10 positivo → `trend_direction: 'mejorando'`

`StrategicAnalysisToCaseBridge`:
- Reporte con norm_gap score < 40 → caso `'brecha_normativa'` con `source_id` correcto
- Reporte sin brechas severas → array vacío
- `requires_human_decision: true` en casos críticos

API `GET /api/agentic-center/cases`:
- En producción (`NODE_ENV: 'production'`) no devuelve demos aunque venga `?demo=true`
- Con `NODE_ENV: 'test'` y `?demo=true` → incluye demos
- Sin token → 401
- Cross-org: org A no ve casos de org B

**CRITERIO DE ÉXITO:** todos los tests pasan con mocks. `tsc --noEmit` limpio.

---

### Agente B — Tests del roadmap inteligente
**Puede ejecutarse en paralelo con:** Agente A
**Depende de:** Ola 3 completa

#### Objetivo
Tests de regresión para el circuito completo del Plan 102: autoprogreso, badges, snapshot y sugerencias proactivas.

#### Archivos a crear
- `src/__tests__/api/journey.auto-progress.test.ts`
- `src/__tests__/api/journey.snapshot.test.ts`
- `src/__tests__/api/journey.strategic-badges.test.ts`
- `src/__tests__/services/JourneyAutoProgressService.test.ts`
- `src/__tests__/services/JourneyStrategicBadgeService.test.ts`
- `src/__tests__/services/ProactiveHintsService.snapshot.test.ts`

#### Prompt completo para el agente

Trabajas en un proyecto con Jest y tests en `src/__tests__/`. Tu tarea es agregar tests del roadmap inteligente.

**Stack:** Next.js 14 + TypeScript + Jest. Raíz: `c:\Users\Usuario\Documents\Proyectos\ISO -conjunto\9001app-firebase`

**Lee antes de empezar:**
- `src/__tests__/services/DirectActionService.test.ts` — modelo de patrón de mocking
- `src/services/JourneyAutoProgressService.ts`
- `src/services/JourneyStrategicBadgeService.ts`
- `src/features/chat/services/ProactiveHintsService.ts`

**Implementa tests para:**

`JourneyAutoProgressService`:
- Org sin datos → progreso 0% en todas las fases
- Org con 3 procesos → tarea `3.2` completada
- Progreso previo manual se preserva al hacer merge
- Cross-org: org A no puede afectar datos de org B

`JourneyStrategicBadgeService`:
- Sin reporte → array vacío
- Hallazgo crítico en `processes` → badge en Fase 3, `level: 'critical'`
- Hallazgo `warning` en `audits` → badge en Fase 5, `level: 'warning'`
- Hallazgos `low`/`medium` → no generan badges

`ProactiveHintsService.getSuggestionsByOperationalSnapshot`:
- `accionesVencidas: 3` → primera sugerencia es `alerta` prioridad `alta`
- `directActionsPendientes: 2` → sugerencia antes de recordatorios
- `diasSinAnalisisEstrategico: 45` → sugerencia de recordatorio análisis
- Snapshot con todo en 0 → al menos retorna sugerencia del próximo paso del journey

Endpoints:
- `POST /api/journey/auto-progress` sin token → 401
- `GET /api/journey/snapshot` sin token → 401
- `GET /api/journey/strategic-badges` sin token → 401
- Cada endpoint solo devuelve datos de la org autenticada

**CRITERIO DE ÉXITO:** todos los tests pasan con mocks. Ningún test lee Firestore real.

---

## Verificación final

**Análisis Estratégico:**
- Generar reporte → incluye `context_completeness_pct`, `confidence_level`, `missing_sources`
- Reporte con deterioro > 10pts → genera `ExecutiveAlert` automática

**Centro Agéntico:**
- `GET /api/agentic-center/cases` en producción → 0 demos, casos reales + bridged
- Brecha severa en reporte estratégico → aparece como caso en el Centro con `source_id`
- `GET /api/agentic-center/summary` → `oldest_pending_approval_days` real

**Roadmap Mi SGC:**
- Entrar con tenant que tenga procesos → progreso > 0%
- Don Cándido saluda con nombre y fase actual
- Tildar tarea → persiste al recargar
- Links de módulo navegan correctamente
- Badge rojo en Fase 5 si hay hallazgo crítico en auditorías

**Tests:**
```bash
npm test src/__tests__/api/agentic-center
npm test src/__tests__/api/journey
npm test src/__tests__/services/JourneyAutoProgressService
npm test src/__tests__/services/JourneyStrategicBadgeService
npm test src/__tests__/services/StrategicAnalysisConfidenceService
npm test src/__tests__/services/StrategicAnalysisTrendService
npm test src/__tests__/services/ExecutiveAlertRules
npx tsc --noEmit
```
