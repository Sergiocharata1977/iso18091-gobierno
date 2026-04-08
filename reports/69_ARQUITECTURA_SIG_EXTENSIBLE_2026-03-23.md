# 69 — Arquitectura SIG Extensible: Don Cándido como Plataforma Multi-Norma
**Fecha:** 2026-03-23
**Proyecto:** `9001app-firebase` — Don Cándido IA
**Clasificación:** Decisión arquitectural / Estrategia de producto
**Contexto:** Análisis de expansión normativa post-plan-61/62/63/68

---

## TL;DR

Don Cándido no es un "software ISO 9001". Es una **plataforma de gestión operativa con compliance integrado**, extensible por packs normativos, verticales sectoriales y un editor flexible de registros. ISO 9001 es el núcleo, no el techo.

El cambio de frame: de "sumar módulos ISO" a "construir un SIG extensible donde cada norma es un pack de plugins sobre infraestructura compartida".

---

## 1. Arquitectura de capas

```
┌─────────────────────────────────────────────────────────┐
│  CORE COMPARTIDO (todos los tenants, todas las normas)  │
│  auth · tenancy · orgs · billing · users                │
│  procesos · documentos · RRHH · Mi Panel                │
│  auditorías + hallazgos + acciones   ← SIG transversal  │
│  IA Don Cándido (contexto de capabilities)              │
│  Editor Registros Configurable        ← NUEVO           │
└────────────────────┬────────────────────────────────────┘
                     │
     ┌───────────────┼───────────────────┐
     ▼               ▼                   ▼
┌──────────┐  ┌──────────────┐  ┌──────────────────┐
│Pack Normat│  │  Verticales  │  │    Editions      │
│iso_9001  │  │  dealer/*    │  │  enterprise      │
│Pack HSE  │  │  industrial  │  │  government      │
│Pack SGSI │  │  financiacion│  │  (futuros)       │
│Pack Gov  │  │  mining HSE  │  │                  │
└──────────┘  └──────────────┘  └──────────────────┘
```

**Regla arquitectónica:**
- auditorías, hallazgos, acciones, documentos y RRHH son **transversales** — nunca duplicar
- un hallazgo de ISO 14001 usa el mismo módulo que uno de ISO 9001
- la diferencia entre normas está en: cláusulas referenciadas, plantillas, tipos de registro, dashboards

---

## 2. Gaps técnicos inmediatos a corregir

### 2.1 `PluginCategory` incompleta

**Archivo:** `src/types/plugins.ts` línea 156

**Estado actual:**
```ts
export type PluginCategory =
  | 'iso_quality' | 'finance' | 'crm' | 'dealer'
  | 'hr' | 'analytics' | 'integration' | 'security';
```

**Debe ser:**
```ts
export type PluginCategory =
  | 'iso_quality'       // ISO 9001
  | 'iso_environment'   // ISO 14001
  | 'iso_hse'           // ISO 45001 + PTW
  | 'iso_sgsi'          // ISO 27001/27002
  | 'iso_government'    // ISO 18091
  | 'registry'          // Editor registros configurables
  | 'finance' | 'crm' | 'dealer'
  | 'hr' | 'analytics' | 'integration' | 'security';
```

### 2.2 Editor de Registros Configurable — tipos faltantes

Nuevo tipo necesario en `src/types/registers.ts`:

```ts
export interface RegisterFieldSchema {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'user' | 'file' | 'relation';
  required: boolean;
  options?: string[];           // para select/multiselect
  relation_collection?: string; // para type 'relation'
  visible_in_kanban?: boolean;
}

export interface RegisterStage {
  id: string;
  label: string;
  color: string;
  order: number;
  requires_approval?: boolean;
  allowed_roles?: string[];
  // Compliance: los stages no se pueden borrar si tienen registros históricos
  locked?: boolean;
}

export interface CustomRegisterSchema {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  norma_referencia?: string;     // ej: 'ISO_14001', 'ISO_45001', 'custom'
  clausula_referencia?: string;  // ej: '8.1', '6.1.2'
  fields: RegisterFieldSchema[];
  stages: RegisterStage[];
  has_kanban: boolean;
  audit_level: 'basic' | 'full'; // compliance: siempre loggear
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

// Registro individual (instancia de un schema)
export interface CustomRegisterEntry {
  id: string;
  schema_id: string;
  organization_id: string;
  stage_id: string;
  data: Record<string, unknown>;  // valores de los campos
  // Compliance: inmutable por diseño
  audit_trail: Array<{
    changed_by: string;
    changed_at: Date;
    field?: string;
    old_value?: unknown;
    new_value?: unknown;
    action: 'created' | 'updated' | 'stage_changed' | 'approved';
  }>;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}
```

**Colecciones Firestore:**
```
organizations/{orgId}/custom_register_schemas/{schemaId}
organizations/{orgId}/custom_register_entries/{entryId}
```

---

## 3. Packs normativos — diseño

### Pack HSE (ISO 14001 + ISO 45001 + PTW)

Estos tres comparten estructura base. Implementar como un pack con submodules activables:

```
capability_id: pack_hse
submodules:
  - hse_ambiental     (ISO 14001)
  - hse_sst           (ISO 45001)
  - hse_ptw           (PTW — ya planificado en report 68)
```

**Reutilizan del core:** auditorías, hallazgos, acciones, documentos, RRHH, Mi Panel.

**Agregan:**
- `aspectos_ambientales` (ISO 14001 — identificación + evaluación)
- `requisitos_legales` (aplica a 14001 y 45001)
- `incidentes_sst` (ISO 45001 — distinto a hallazgos de calidad)
- `epp_control` (equipos de protección personal)
- `matrices_riesgo_hse` (variante de la matriz de riesgos existente)
- PTW: ya documentado en report 68

**Colecciones nuevas:**
```
organizations/{orgId}/aspectos_ambientales/
organizations/{orgId}/requisitos_legales/
organizations/{orgId}/incidentes_sst/
organizations/{orgId}/epp_registros/
```

### Pack SGSI (ISO 27001/27002)

Ya planificado en detalle en report 63. Genuinamente nuevo porque:
- Opera sobre activos de información, no procesos
- Tiene controles con evidencia viva (no solo documentos)
- Requiere 3 capas de madurez: Diseño → Implementación → Eficacia

No duplicar: el módulo de auditorías del core sirve para auditorías SGSI con `norma: 'ISO_27001'`.

### Pack Gov (ISO 18091)

Ya planificado en report 62. Casi 100% reuso del core más semántica:
- `edition: 'government'` en organizations
- Plugins `gov_*`: ciudadano, expediente, transparencia, territorio
- Taxonomía enterprise→government ya diseñada

---

## 4. Otras normas con sentido real

| Norma | Justificación | Prioridad |
|-------|--------------|-----------|
| **ISO 31000** (Riesgos) | Normalizar el módulo de riesgos existente — transversal a todas las normas. Sin código nuevo, solo taxonomía. | Alta |
| **ISO 19011** (Auditorías) | El motor de auditorías ya lo implementa de facto. Agregar cláusulas 19011 como plantilla. | Media |
| **RGPD / Ley 25.326** | Plugin `privacy_*` complementario al SGSI. Muy demandado en Argentina. | Media |
| **ISO 37001** (Anti-soborno) | Comparte con hallazgos/acciones. Atractivo para gobierno local. | Media-baja |
| **FSSC 22000 / ISO 22000** | Inocuidad alimentaria. Comparte con 9001 + agrega trazabilidad de lotes. | Baja (segmento específico) |

**No recomendado por ahora:** ISO 50001, ISO 55001, ISO 17025 — mercado muy específico, poco reuso.

---

## 5. El Editor de Registros como herramienta estratégica

### Qué es (y qué no es)

**Es:** un módulo de gestión de registros configurables, compliance-aware, con audit trail inmutable, vinculable a normas y procesos, con kanban y formularios editables por el tenant.

**No es:** un gestor de bases de datos genérico. No es Airtable. Es específicamente para registros operativos de gestión que necesitan trazabilidad de compliance.

### Casos de uso

1. Empresa con proceso muy específico no contemplado en ningún módulo estándar (ej: "Control de contratistas externos para trabajos de riesgo")
2. Registro de mediciones ambientales periódicas (ISO 14001 punto 9.1)
3. Seguimiento de EPP por persona (ISO 45001)
4. Lista de verificación de un proceso productivo único
5. Cualquier "ABM operativo" que necesite trazabilidad pero no justifica un módulo completo

### Diseño de compliance

```
RÍGIDO (no configurable):
  ✓ audit_trail: cada cambio, quién, cuándo, qué valor
  ✓ stages bloqueados si tienen registros históricos
  ✓ campos no eliminables retroactivamente (solo ocultar)
  ✓ linkage a norma/proceso inmutable una vez creado

FLEXIBLE (configurable por tenant):
  ✓ campos del formulario (tipo, nombre, validación)
  ✓ estados del kanban + transiciones
  ✓ roles permitidos por stage
  ✓ plantillas por norma (ISO 14001 trae sus plantillas estándar)
  ✓ automatizaciones simples (si campo X = Y → crear hallazgo)
```

---

## 6. Segmentos de mercado — análisis de producto

### Ranking por viabilidad + retorno

| Segmento | Cercanía al core | Complejidad venta | Potencial premium | Recomendación |
|----------|-----------------|------------------|-------------------|---------------|
| PyMEs ISO 9001 | ★★★★★ | Baja | Base | YA ATACAR |
| Industriales HSE | ★★★★ | Media | Alto | PRÓXIMO |
| Municipios Gov | ★★★★★ | Media-alta | Medio | PRÓXIMO |
| Tech/Gov SGSI | ★★★ | Alta | Muy alto | PLANIFICAR |
| Dealer/Concesionarios | ★★★★ | Baja | Medio | YA ATACAR |
| Minería/Industrial pesada | ★★★ | Alta | Alto | 2027+ |

### Por qué minería no ahora

La estrategia correcta para minería es: HSE pack + PTW + Editor Registros = ya cubre el 70% de sus necesidades sin hacer una "edition minera". Una edition minera completa implica: equipos de izaje, espacios confinados específicos, normativa sectorial argentina (Resolución 295/03), integración con sistemas SCADA — demasiado específico para ser el primer cliente de una vertical.

---

## 7. Roadmap recomendado

### Fase actual (en marcha)
- [x] ISO 9001 core — ALTO
- [x] Plugin system formal (PluginManifest v1) — ALTO
- [x] PTW planificado (report 68) — ejecutar
- [x] SGSI planificado (report 63) — diseño avanzado
- [x] Gov edition planificado (report 62) — diseño avanzado

### Sprint 1 — Fundación SIG (próximo)
1. Extender `PluginCategory` con `iso_environment`, `iso_hse`, `iso_sgsi`, `iso_government`, `registry`
2. Crear `src/types/registers.ts` con `CustomRegisterSchema` y `CustomRegisterEntry`
3. API CRUD para `custom_register_schemas` + `custom_register_entries`
4. UI básica del Editor de Registros (lista + formulario dinámico + kanban)
5. Ejecutar PTW Ola 0 (report 68)

### Sprint 2 — Pack HSE
1. ISO 45001 submodule: `incidentes_sst`, `epp_control`, `matrices_riesgo_hse`
2. `requisitos_legales` (compartido 14001 y 45001)
3. Integración con auditorías del core (audit con `norma: 'ISO_45001'`)
4. ISO 14001 submodule: `aspectos_ambientales`

### Sprint 3 — SGSI Ola 0+1
- Ejecutar Ola 0 del plan 63 (types + seed ISO 27002)
- Ejecutar Ola 1 del plan 63 (contexto, riesgos, SoA, controles, dashboard)

### Sprint 4 — Gov Edition
- Ejecutar plan 62 (ya muy detallado)

### Sprint 5+ — Expansión
- ISO 31000 normalización del módulo de riesgos
- RGPD/25.326 plugin privacy_*
- Vertical industrial (reutiliza HSE + PTW + Editor Registros)

---

## 8. Decisiones tomadas

1. **SIG transversal:** auditorías/hallazgos/acciones/documentos son del core, no de cada norma
2. **Pack HSE unificado:** 14001 + 45001 + PTW como submodules de un mismo pack, no plugins separados
3. **Editor Registros en el core:** no es un plugin, es infraestructura transversal
4. **No edition minera todavía:** HSE + PTW + Editor ya cubre el segmento sin verticalizarse prematuramente
5. **ISO 31000 como normalización:** no como módulo nuevo, sino como taxonomía del módulo de riesgos existente
6. **SGSI después de HSE:** 27001 requiere código genuinamente nuevo; HSE aprovecha ~70% del core

---

## 9. Referencia de reportes relacionados

- `reports/21_PLUGIN_MANIFEST_V1.md` — especificación formal del manifest
- `reports/22_DESIGN_SYSTEM_KANBANS.md` — kanbans configurables (base del editor de registros)
- `reports/30_PLAN_MAESTRO_PLATAFORMA.md` — plan maestro de olas
- `reports/62_PLAN_OLAS_GOBIERNO_LOCAL_ISO18091_2026-03-20.md` — edition gov
- `reports/63_PLAN_SGSI_ISO27001_27002_2026-03-21.md` — pack SGSI
- `reports/68_PLAN_PTW_SEGURIDAD_INDUSTRIAL_2026-03-23.md` — plugin PTW
