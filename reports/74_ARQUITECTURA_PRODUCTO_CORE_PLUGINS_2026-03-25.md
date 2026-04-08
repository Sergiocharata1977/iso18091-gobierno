# 74 — Arquitectura de Producto: Core vs Plugins

**Fecha:** 2026-03-25
**Estado:** DECISIÓN CONFIRMADA — documento de referencia permanente
**Relación:** Complementa report 69 (SIG Extensible) — este documento define el modelo de negocio y qué es core vs qué es plugin.

---

## Principio rector

> **El core de Don Cándido es ISO 9001 puro.** Todo lo demás es extensible mediante plugins.
> Un plugin se activa por tenant según su rubro, tamaño y necesidades. El cliente paga por lo que usa.

---

## CORE BASE — Incluido en todos los planes

Estas funcionalidades siempre están disponibles. No se pueden desactivar. Son la razón de existir del producto.

| Módulo | Norma | Por qué es core |
|---|---|---|
| Mapa de Procesos + Definiciones | ISO 9001 §4.4 | Sin procesos no hay SGC |
| Auditorías internas | ISO 9001 §9.2 | Requisito mínimo de la norma |
| Hallazgos | ISO 9001 §9.2 | Salida obligatoria de auditorías |
| Acciones correctivas / preventivas | ISO 9001 §10.2 | Ciclo de mejora continua |
| Control documental | ISO 9001 §7.5 | Requisito mínimo de la norma |
| RRHH — Competencias y Capacitaciones | ISO 9001 §7.2/7.3 | La norma lo exige explícitamente |
| Mi SGC / Panel Ejecutivo | — | Navegación y visión general |
| Puntos de Norma | ISO 9001 | Mapa de requisitos |
| Notificaciones | — | Comunicación interna básica |
| IA / Don Cándido (asistente) | — | Diferenciador de producto |

---

## PLUGINS OPCIONALES — Se activan por tenant

### Bloque 1 — Gestión Comercial

> **A quién aplica:** Empresas con fuerza de ventas, dealers, distribuidores, concesionarias.
> **A quién NO aplica:** Consultoras ISO, organismos públicos, empresas de servicios sin gestión de cartera.

| Plugin ID | Nombre | Tier | Requiere | Descripción |
|---|---|---|---|---|
| `crm` | CRM Comercial B2B | optional | — | Clientes, oportunidades, Kanban, acciones comerciales, legajo fiscal |
| `crm-risk-scoring` | Scoring Crediticio | premium | `crm` | Evaluación CDSS, Nosis, tiers A/B/C, línea de crédito |
| `crm_whatsapp_inbox` | WhatsApp Inbox | premium | `crm` | Inbox operativo, chat, simulador, config por tenant |

---

### Bloque 2 — Gestión de Infraestructura

> **A quién aplica:** Plantas industriales, concesionarias, construcción, salud, laboratorios. Cualquier org con equipamiento físico relevante a calibrar, mantener o inventariar.
> **A quién NO aplica:** Consultoras de servicios, software houses, organismos de solo-documentos.

| Plugin ID | Nombre | Tier | Requiere | Descripción |
|---|---|---|---|---|
| `iso_infra` | Infraestructura ISO 7.1.3 | optional | — | Inventario de equipos, mantenimiento, calibración, ambiente de trabajo |

**Por qué es plugin y no core:**
- Una consultora ISO no tiene maquinaria que calibrar
- Una planta automotriz tiene 500 equipos con certificaciones anuales
- Un hospital tiene equipamiento médico con normativa propia
- Una software house tiene solo laptops
→ El módulo tiene valor altísimo para unos y cero valor para otros.

---

### Bloque 3 — Diseño y Desarrollo

> **A quién aplica:** Empresas con procesos de I+D, desarrollo de productos, ingeniería.
> **A quién NO aplica:** Empresas de servicios puros, comercios, distribuidores.

| Plugin ID | Nombre | Tier | Requiere | Descripción |
|---|---|---|---|---|
| `iso_design` | Diseño y Desarrollo ISO 8.3 | optional | — | Proyectos de diseño, etapas, revisiones, validación, control de cambios |

---

### Bloque 4 — Normativas adicionales (Packs)

> **A quién aplica:** Orgs que necesitan gestionar múltiples normas ISO en un mismo sistema.

| Plugin ID | Nombre | Tier | Requiere | Descripción |
|---|---|---|---|---|
| `pack_hse` ✅ | Pack HSE | **premium** | — | ISO 14001 + ISO 45001 + PTW — **IMPLEMENTADO** · 7 pantallas, 13 APIs, gating, seed, docs, IA context |
| `pack_sgsi` | Pack SGSI | optional | — | ISO 27001/27002 — gestión de seguridad de la información · plan 63 listo para encolar |
| `pack_gov` | Pack Gobierno | enterprise | — | ISO 18091 — gestión para organismos públicos |

---

### Bloque 5 — Verticales de Industria

> **A quién aplica:** Rubros específicos con flujos de negocio propios.

| Plugin ID | Nombre | Tier | Requiere | Descripción |
|---|---|---|---|---|
| `dealer_solicitudes` | Módulo Concesionaria | enterprise | `crm` | Solicitudes de repuestos + servicios técnicos, Kanban propio, catálogo CASE |

---

## Mapa visual

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
    ├── [crm] ──────────────── CRM Comercial B2B
    │   ├── [crm-risk-scoring] Scoring + Nosis
    │   ├── [crm_whatsapp_inbox] WhatsApp
    │   └── [dealer_solicitudes] Concesionaria
    │
    ├── [iso_infra] ─────────── Infraestructura ISO 7.1.3
    ├── [iso_design] ────────── Diseño y Desarrollo ISO 8.3
    │
    ├── [pack_hse] ──────────── ISO 14001 + ISO 45001 + PTW
    ├── [pack_sgsi] ─────────── ISO 27001/27002
    └── [pack_gov] ──────────── ISO 18091 Gobierno Local
```

---

## Regla para decidir si algo es core o plugin

Un módulo es **CORE** si:
- La norma ISO 9001 lo exige explícitamente como requisito mínimo
- Sin él, el SGC no funciona básicamente
- Aplica a TODAS las organizaciones sin importar rubro o tamaño

Un módulo es **PLUGIN** si cumple al menos 2 de:
1. Hay un segmento relevante de clientes que no lo necesita
2. El módulo tiene su propio conjunto de colecciones Firestore separables
3. Tiene propuesta de valor diferenciada que justifica precio propio
4. Su ausencia no rompe el ciclo auditoría → hallazgo → acción correctiva

---

## Tiers de pricing

| Tier | Definición | Ejemplos |
|---|---|---|
| `base` | Incluido en todos los planes, sin costo adicional | ISO 9001 core |
| `optional` | Se activa por tenant, incluido en planes medios | `crm`, `iso_infra`, `iso_design`, `pack_sgsi` |
| `premium` | Costo adicional, propuesta de valor diferenciada | `crm-risk-scoring`, `crm_whatsapp_inbox`, `pack_hse` |
| `enterprise` | Aprobación comercial, setup dedicado | `dealer_solicitudes`, `pack_gov` |

---

## Candidatos futuros a extraer del core

Estos módulos HOY están en el core pero podrían convertirse en plugins en el futuro si se identifican segmentos que no los necesiten:

| Módulo | Norma | Condición para extraer |
|---|---|---|
| Encuestas NPS / Satisfacción | ISO 9001 §9.1.2 | Si hay orgs que gestionan satisfacción por canales externos |
| Revisión por Dirección | ISO 9001 §9.3 | Si hay orgs muy pequeñas sin procesos formales de dirección |
| Análisis FODA / Contexto | ISO 9001 §4 | Si hay orgs que solo quieren operativa, sin planificación estratégica |
| Kanban de Compras | ISO 9001 §8.4 | Si hay orgs sin gestión de proveedores relevante |
| Flujogramas | — | No es requisito ISO — candidato claro a plugin |
| Objetivos de Calidad e Indicadores | ISO 9001 §6.2 | Solo si hay demanda de tier básico sin KPIs |

**Regla actual:** NO extraer hasta que haya al menos 3 clientes reales pidiendo una versión sin ese módulo.

---

## Mapping por tipo de organización

| Tipo de org | Core | Plugins típicos |
|---|---|---|
| Consultora / servicios ISO | ✅ | — |
| PyME industrial | ✅ | `crm` + `iso_infra` |
| Concesionaria / Dealer | ✅ | `crm` + `crm-risk-scoring` + `dealer_solicitudes` + `iso_infra` |
| Empresa agropecuaria | ✅ | `crm` + `iso_infra` + `pack_hse` |
| Planta manufacturera | ✅ | `iso_infra` + `iso_design` + `pack_hse` |
| Hospital / Salud | ✅ | `iso_infra` + `pack_hse` |
| Laboratorio | ✅ | `iso_infra` + `iso_design` |
| Organismo público | ✅ | `pack_gov` |
| Empresa tecnológica | ✅ | `crm` + `pack_sgsi` |
| Empresa construcción | ✅ | `iso_infra` + `pack_hse` + `dealer_solicitudes` |

---

## Planes comerciales sugeridos

| Plan | Contenido | Target |
|---|---|---|
| **ISO Essential** | Core base solamente | Consultoras, orgs pequeñas |
| **ISO Comercial** | Core + `crm` + `crm-risk-scoring` | PyMEs con ventas |
| **ISO Industrial** | Core + `iso_infra` + `pack_hse` | Plantas, construcción, salud |
| **ISO Dealer** | Core + `crm` + `crm-risk-scoring` + `dealer_solicitudes` + `iso_infra` | Concesionarias |
| **ISO Enterprise** | Core + todos los plugins aplicables | Grandes orgs multi-norma |

---

## Referencias

- **Report 69** — Arquitectura SIG Extensible (diagrama técnico de capas)
- **Report 70** — Plan de Olas SIG Extensible
- **Report 73** — Plan de Olas: CRM como Plugin (implementación técnica)
- **Report 72** — Análisis CRM & Scoring (estado actual del módulo)
