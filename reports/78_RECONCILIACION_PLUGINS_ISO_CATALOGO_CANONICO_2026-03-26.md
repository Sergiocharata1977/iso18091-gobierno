# 78 — Reconciliación de Plugins + Catálogo Canónico + ISO 14001 / 45001 / 27001 / 19011
**Fecha:** 2026-03-26
**Estado:** DECISIÓN — documento de referencia para plugins/capabilities going forward
**Supera y cierra conflictos detectados en:** report 74 (Core+Plugins) y report 77 (Inventario Plugins)
**Relacionado con:** report 69 (SIG Extensible), report 63 (SGSI), report 68 (PTW/HSE)

---

## El problema

La otra IA detectó correctamente que hay **dos sistemas de plugins que no se ponen de acuerdo**:

| Sistema | Dónde vive | Qué hace | Problema |
|---|---|---|---|
| **Manifests formales** | `src/config/plugins/*.manifest.ts` + `PLATFORM_PLUGIN_MANIFESTS` | Catálogo real del marketplace, lifecycle, scopes | **IDs difieren** de report 74 y del seed |
| **Capabilities legacy** | seed en `platform_capabilities` (Firestore) | Gating de features existentes en código | **29 capabilities** con IDs distintos, mezcla core y plugins |

Además, report 74 usa IDs cortos que **no coinciden** con los IDs reales de los manifests:

| Report 74 dice | Manifest real dice |
|---|---|
| `iso_infra` | `iso-infrastructure` |
| `iso_design` | `iso-design-development` |
| `pack_sgsi` | sin manifest aún |

Y el usuario pregunta si ISO 14001, 45001, 27001 e ISO 19011 deben ser plugins propios — la respuesta es **sí**, con una aclaración sobre cómo convivir con `pack_hse`.

---

## Decisión 1 — Fuente de verdad canónica

**Los manifests formales son la única fuente de verdad de plugins.**

Las capabilities legacy son un mecanismo de compatibilidad hacia atrás para features del core y para plugins instalados antes de que existieran manifests. No son el catálogo de producto.

**Regla:** si una feature nueva necesita ser controlada por tenant, se crea un plugin con manifest formal. No se agrega al seed de capabilities.

---

## Decisión 2 — IDs canónicos definitivos

A partir de este documento, los IDs canónicos son:

| ID canónico | Nombre comercial | Antes llamado |
|---|---|---|
| `crm` | CRM Comercial B2B | igual |
| `crm_risk_scoring` | Scoring Crediticio | `crm-risk-scoring` |
| `crm_whatsapp_inbox` | WhatsApp Inbox CRM | igual |
| `dealer_solicitudes` | Módulo Concesionaria | igual |
| `iso_infrastructure` | ISO 7.1.3 Infraestructura | `iso-infrastructure` / `iso_infra` |
| `iso_design_development` | ISO 8.3 Diseño y Desarrollo | `iso-design-development` / `iso_design` |
| `iso_environment_14001` | ISO 14001 Gestión Ambiental | parte de `pack_hse` |
| `iso_sst_45001` | ISO 45001 Seguridad y Salud | parte de `pack_hse` |
| `iso_sgsi_27001` | ISO 27001 SGSI | `pack_sgsi` |
| `iso_audit_19011` | ISO 19011 Programa de Auditorías | nuevo |
| `pack_hse` | Pack HSE | igual — pero ahora es **bundle** |
| `pack_sgsi_plus` | Pack SGSI Plus | nuevo — bundle comercial |
| `pack_sig_integrado` | Pack SIG Integrado | futuro — bundle máximo |
| `pack_gov` | Pack Gobierno ISO 18091 | igual |
| `contabilidad_central` | Contabilidad Central | nuevo — ver report 76 |

**Convención de nombrado:** `snake_case` para todos. Los kebab-case legacy se migran progresivamente.

---

## Decisión 3 — ISO 14001 y ISO 45001: plugins individuales + pack como bundle comercial

### Situación actual

`pack_hse` es un **plugin técnico monolítico** que contiene 14001 + 45001 + PTW. Funciona, está implementado, no se toca.

### Evolución objetivo

```
pack_hse (bundle comercial)
    ├── iso_environment_14001  (plugin técnico individual)
    ├── iso_sst_45001          (plugin técnico individual)
    └── ptw_seguridad          (plugin técnico individual — ya previsto)
```

**Lo que cambia:**
- `pack_hse` pasa a ser un **bundle**: instala los tres plugins de una sola vez
- Cada plugin individual puede instalarse sin el pack (para orgs que solo necesitan uno)
- El gating en código migra de `hasCapability('pack_hse')` a:
  ```typescript
  hasCapability('pack_hse') || hasCapability('iso_environment_14001')
  ```

**Compatibilidad hacia atrás:** los tenants con `pack_hse` instalado NO pierden acceso. El bundle sigue funcionando igual.

---

## Decisión 4 — ISO 27001 / SGSI: renombrar pack_sgsi → iso_sgsi_27001

### Situación actual

Report 74 dice `pack_sgsi` como nombre del plugin. Pero no hay manifest formal aún. Report 63 tiene el plan.

### Decisión

El plugin se llama `iso_sgsi_27001` (norma individual).

Si en el futuro se agregan ISO 27002 (controles extendidos), ISO 27701 (privacidad) u otras, se empaquetan en `pack_sgsi_plus` (bundle comercial).

```
iso_sgsi_27001  (plugin técnico — MVP del SGSI)
pack_sgsi_plus  (bundle futuro: 27001 + extras de seguridad)
```

---

## Decisión 5 — ISO 19011: sí es un plugin, pequeño pero válido

### ¿Qué es ISO 19011?

ISO 19011:2018 — **Directrices para la auditoría de los sistemas de gestión.**

Es la norma que define **cómo hacer auditorías** (no QUÉ auditar). Define:
- Principios de auditoría
- Gestión de programas de auditoría
- Conducción de una auditoría
- Competencia de los auditores

### ¿Por qué no es core?

El **core ya incluye auditorías internas** (ISO 9001 §9.2): crear auditorías, registrar hallazgos, cerrar acciones. Eso cubre el 80% de las organizaciones.

ISO 19011 añade **gestión formal del programa de auditoría**: planificación anual multi-auditoría, competencias y certificaciones de auditores, informes estandarizados, coordinación multi-norma. Eso lo necesitan organizaciones más maduras o que auditan sistemas complejos (14001 + 45001 + 27001 a la vez).

### Plugin `iso_audit_19011` — Alcance MVP

| Módulo | Qué agrega |
|---|---|
| Programa de auditorías | Planificación anual: calendario de todas las auditorías del ejercicio |
| Gestión de auditores | Perfil del auditor, competencias, normas habilitadas, conflicto de interés |
| Informe de auditoría formal | Plantilla estandarizada ISO 19011: alcance, criterios, evidencias, conclusión |
| Auditorías combinadas | Vincular una auditoría a múltiples normas (9001 + 14001 + 45001 en un solo recorrido) |
| Seguimiento del programa | % de cumplimiento del programa anual, desviaciones, justificaciones |

**Lo que NO toca:** la lógica de hallazgos y acciones correctivas ya está en el core. El plugin 19011 no duplica eso — solo agrega la capa de programa y formalidad.

### Relación con plugins normativos

```
iso_audit_19011 puede auditar cualquier combinación:
  ├── audita ISO 9001 (core)
  ├── audita iso_environment_14001 (si instalado)
  ├── audita iso_sst_45001 (si instalado)
  └── audita iso_sgsi_27001 (si instalado)
```

---

## Catálogo canónico unificado — tabla única

### CORE BASE (siempre activo, no desactivable)

| Módulo | Norma | ID |
|---|---|---|
| Mapa de Procesos | ISO 9001 §4.4 | — core — |
| Auditorías internas | ISO 9001 §9.2 | — core — |
| Hallazgos | ISO 9001 §9.2 | — core — |
| Acciones correctivas | ISO 9001 §10.2 | — core — |
| Control documental | ISO 9001 §7.5 | — core — |
| RRHH Competencias y Capacitaciones | ISO 9001 §7.2/7.3 | — core — |
| Mi SGC / Panel Ejecutivo | — | — core — |
| IA / Don Cándido | — | — core — |

### PLUGINS FORMALES (activables por tenant)

#### Bloque ISO 9001 extendido

| Plugin ID canónico | Nombre | Tier | Requiere | Estado |
|---|---|---|---|---|
| `iso_infrastructure` | ISO 7.1.3 Infraestructura | optional | — | ✅ Manifest existe (`iso-infrastructure`) |
| `iso_design_development` | ISO 8.3 Diseño y Desarrollo | optional | — | ✅ Manifest existe (`iso-design-development`) |
| `iso_audit_19011` | ISO 19011 Programa de Auditorías | optional | — | 🆕 Crear manifest |

#### Bloque Gestión Comercial

| Plugin ID canónico | Nombre | Tier | Requiere | Estado |
|---|---|---|---|---|
| `crm` | CRM Comercial B2B | optional | — | ✅ Manifest + implementado |
| `crm_risk_scoring` | Scoring Crediticio | premium | `crm` | ✅ Manifest existe (`crm-risk-scoring`) |
| `crm_whatsapp_inbox` | WhatsApp Inbox CRM | premium | `crm` | ✅ Manifest existe |

#### Bloque Normas HSE

| Plugin ID canónico | Nombre | Tier | Requiere | Estado |
|---|---|---|---|---|
| `iso_environment_14001` | ISO 14001 Gestión Ambiental | optional | — | 🆕 Crear manifest (extraer de pack_hse) |
| `iso_sst_45001` | ISO 45001 Seguridad y Salud | optional | — | 🆕 Crear manifest (extraer de pack_hse) |
| `ptw_seguridad` | Permiso de Trabajo (PTW) | optional | `iso_sst_45001` | 🆕 Crear manifest (extraer de pack_hse) |

#### Bloque SGSI

| Plugin ID canónico | Nombre | Tier | Requiere | Estado |
|---|---|---|---|---|
| `iso_sgsi_27001` | ISO 27001 SGSI | optional | — | 🔶 MVP por construir (plan en report 63) |

#### Bloque Contabilidad

| Plugin ID canónico | Nombre | Tier | Requiere | Estado |
|---|---|---|---|---|
| `contabilidad_central` | Contabilidad Central | optional | — | 🆕 Plan en report 76 |

#### Bloque Verticales

| Plugin ID canónico | Nombre | Tier | Requiere | Estado |
|---|---|---|---|---|
| `dealer_solicitudes` | Módulo Concesionaria | enterprise | `crm` | ✅ Manifest + implementado |

### BUNDLES COMERCIALES (agrupadores de plugins)

| Bundle ID | Nombre | Incluye | Estado |
|---|---|---|---|
| `pack_hse` | Pack HSE | `iso_environment_14001` + `iso_sst_45001` + `ptw_seguridad` | ✅ Existe — refactorizar a bundle |
| `pack_sgsi_plus` | Pack SGSI Plus | `iso_sgsi_27001` + extras futuros | 🆕 Planificado |
| `pack_gov` | Pack Gobierno | ISO 18091 (capabilities `gov_*`) | 🔶 Parcial (capabilities legacy) |
| `pack_sig_integrado` | Pack SIG Integrado | `iso_environment_14001` + `iso_sst_45001` + `iso_sgsi_27001` + `iso_audit_19011` | 🆕 Futuro |

---

## Mapa visual actualizado y reconciliado

```
DON CÁNDIDO
│
├── CORE BASE (siempre disponible)
│   ├── ISO 9001: Procesos · Auditorías · Hallazgos · Acciones
│   ├── ISO 9001: Documentos · RRHH · Puntos de Norma
│   ├── Panel Ejecutivo · Mi SGC · Notificaciones
│   └── IA / Don Cándido (asistente)
│
└── PLUGINS (activables por tenant)
    │
    ├── ISO 9001 extendido
    │   ├── [iso_infrastructure]      ISO 7.1.3 Infraestructura
    │   ├── [iso_design_development]  ISO 8.3 Diseño y Desarrollo
    │   └── [iso_audit_19011]         ISO 19011 Programa de Auditorías
    │
    ├── Gestión Comercial
    │   ├── [crm]                     CRM Comercial B2B
    │   │   ├── [crm_risk_scoring]    Scoring + Nosis
    │   │   ├── [crm_whatsapp_inbox]  WhatsApp
    │   │   └── [dealer_solicitudes]  Concesionaria (requiere crm)
    │
    ├── Normas HSE
    │   ├── [iso_environment_14001]   ISO 14001 Gestión Ambiental
    │   ├── [iso_sst_45001]           ISO 45001 Seguridad y Salud
    │   └── [ptw_seguridad]           Permiso de Trabajo (requiere iso_sst_45001)
    │
    ├── SGSI
    │   └── [iso_sgsi_27001]          ISO 27001 Seguridad de la Información
    │
    ├── Contabilidad
    │   └── [contabilidad_central]    Contabilidad doble partida central
    │
    └── BUNDLES COMERCIALES (instalan múltiples plugins)
        ├── [pack_hse]                14001 + 45001 + PTW
        ├── [pack_sgsi_plus]          27001 + extras (futuro)
        ├── [pack_gov]                ISO 18091 Gobierno (capabilities gov_*)
        └── [pack_sig_integrado]      14001 + 45001 + 27001 + 19011 (futuro)
```

---

## Mapping por tipo de organización — actualizado

| Tipo de org | Core | Plugins típicos |
|---|---|---|
| Consultora / servicios ISO | ✅ | — |
| PyME de servicios | ✅ | `iso_audit_19011` (si madura) |
| PyME industrial | ✅ | `crm` + `iso_infrastructure` |
| Empresa agropecuaria | ✅ | `crm` + `iso_infrastructure` + `pack_hse` |
| Planta manufacturera | ✅ | `iso_infrastructure` + `iso_design_development` + `pack_hse` + `iso_audit_19011` |
| Hospital / Salud | ✅ | `iso_infrastructure` + `pack_hse` + `iso_audit_19011` |
| Laboratorio | ✅ | `iso_infrastructure` + `iso_design_development` |
| Concesionaria / Dealer | ✅ | `crm` + `crm_risk_scoring` + `dealer_solicitudes` + `iso_infrastructure` |
| Empresa tecnológica | ✅ | `crm` + `iso_sgsi_27001` + `contabilidad_central` |
| Organismo público | ✅ | `pack_gov` + `iso_audit_19011` |
| Empresa SIG completo (multi-norma) | ✅ | `pack_hse` + `iso_sgsi_27001` + `iso_audit_19011` + `pack_sig_integrado` |

---

## Reconciliación: qué actualizar en report 74

Report 74 queda vigente en su lógica de producto, pero sus referencias de IDs deben corregirse:

| Report 74 dice | Corrección |
|---|---|
| `iso_infra` | `iso_infrastructure` |
| `iso_design` | `iso_design_development` |
| `pack_sgsi` | `iso_sgsi_27001` (plugin) + `pack_sgsi_plus` (bundle futuro) |
| No menciona ISO 14001/45001 como plugins individuales | Agregar `iso_environment_14001` y `iso_sst_45001` |
| No menciona ISO 19011 | Agregar `iso_audit_19011` |
| No menciona `contabilidad_central` | Agregar |

---

## Reconciliación: qué actualizar en report 77

Report 77 está bien en sus conclusiones. Solo alinear nomenclatura final:

| Report 77 propone | ID canónico definitivo |
|---|---|
| `iso_environment_14001` | ✅ igual |
| `iso_sst_45001` | ✅ igual |
| `iso_sgsi_27001` | ✅ igual |
| No menciona ISO 19011 | Agregar `iso_audit_19011` |
| `pack_sgsi_plus` | ✅ igual |
| `pack_sig_integrado` | ✅ igual |

---

## Plan de ejecución — qué hacer primero

### Prioridad 0 — Correcciones sin código (hoy)
- Actualizar MEMORY.md con IDs canónicos definitivos
- Usar esta tabla como referencia en todo prompt futuro
- No volver a usar `iso_infra`, `iso_design`, `pack_sgsi` como IDs canónicos

### Prioridad 1 — Manifests que faltan (Ola técnica)

| Manifest a crear | Complejidad | Bloquea |
|---|---|---|
| `iso_environment_14001.manifest.ts` | Baja (extraer de pack_hse) | Poder instalar 14001 sin 45001 |
| `iso_sst_45001.manifest.ts` | Baja (extraer de pack_hse) | Poder instalar 45001 sin 14001 |
| `ptw_seguridad.manifest.ts` | Baja | Poder instalar PTW por separado |
| `iso_audit_19011.manifest.ts` | Baja (plugin nuevo) | Nada por ahora |
| `iso_sgsi_27001.manifest.ts` | Media (necesita UI+API) | MVP SGSI |
| `contabilidad_central.manifest.ts` | Media | Motor contable (report 76) |

### Prioridad 2 — Refactor de pack_hse a bundle
- Cambiar `pack_hse` de plugin monolítico a bundle que declara dependencias
- Agregar gating dual: `hasCapability('pack_hse') || hasCapability('iso_environment_14001')`
- Script de migración para tenants existentes

### Prioridad 3 — Unificar catálogos
- `/admin/marketplace` y `/capabilities` deben mostrar la misma verdad
- El seed legacy no debe crear capabilities para plugins que ya tienen manifest
- Resolver: o se elimina el seed de capabilities para plugins formales, o se sincroniza

---

## Implementación de `iso_audit_19011` — Campos mínimos

El usuario confirma que puede ser pequeño. MVP con estos campos:

### Colecciones nuevas (bajo `organizations/{orgId}/`)

```
audit_programs/{programId}          — Programa anual de auditorías
audit_program_items/{itemId}        — Auditoría planificada dentro del programa
auditor_profiles/{auditorId}        — Perfil + competencias del auditor
```

### Tipos TypeScript mínimos

```typescript
// Programa de auditoría (ISO 19011 §5)
interface AuditProgram {
  id: string
  organization_id: string
  ejercicio: string           // YYYY
  objetivo: string
  alcance: string[]           // ['iso_9001', 'iso_environment_14001', etc.]
  responsable_id: string
  status: 'borrador' | 'aprobado' | 'en_curso' | 'completado'
  total_auditorias_planificadas: number
  total_auditorias_completadas: number
  created_at: string
}

// Auditoría planificada dentro del programa
interface AuditProgramItem {
  id: string
  organization_id: string
  program_id: string
  norma: string               // 'iso_9001' | 'iso_environment_14001' | etc.
  alcance_procesos: string[]
  fecha_planificada: string
  auditor_lider_id: string
  equipo_auditor_ids: string[]
  tipo: 'interna' | 'externa' | 'combinada'
  auditoria_id?: string       // ID del registro de auditoría real (core) cuando se ejecuta
  status: 'planificada' | 'en_ejecucion' | 'completada' | 'postergada' | 'cancelada'
}

// Perfil de auditor (ISO 19011 §7)
interface AuditorProfile {
  id: string
  organization_id: string
  usuario_id: string
  normas_habilitadas: string[]   // ['iso_9001', 'iso_environment_14001', etc.]
  fecha_ultima_capacitacion?: string
  observaciones?: string
  activo: boolean
}
```

### Páginas MVP

```
/contabilidad/                    → ya existe si contabilidad_central instalado
/auditoria-programa/              → listado de programas de auditoría
/auditoria-programa/[id]          → detalle del programa con items
/auditoria-programa/[id]/nuevo    → agregar auditoría al programa
/auditores/                       → gestión de perfiles de auditores
```

---

## Resumen de decisiones tomadas en este documento

1. **Manifests formales** son la fuente de verdad canónica de plugins.
2. **IDs en snake_case** — los kebab-case legacy se migran.
3. **ISO 14001** → plugin individual `iso_environment_14001`
4. **ISO 45001** → plugin individual `iso_sst_45001`
5. **PTW** → plugin individual `ptw_seguridad`
6. **pack_hse** → bundle comercial que instala los tres anteriores
7. **ISO 27001** → plugin individual `iso_sgsi_27001` (renombra `pack_sgsi`)
8. **ISO 19011** → plugin individual `iso_audit_19011` (gestión del programa de auditorías)
9. **Contabilidad** → plugin `contabilidad_central` (ver report 76)
10. **Compatibilidad hacia atrás** → gating dual durante transición de pack_hse

Este documento reemplaza cualquier referencia de IDs en reportes anteriores que contradiga la tabla de IDs canónicos definida aquí.
