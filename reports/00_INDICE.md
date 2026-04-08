# Indice de Documentacion - Don Candido IA

**Actualizado:** 2026-04-08
**Proyecto:** `9001app-firebase` · SaaS ISO 9001 + CRM + IA · doncandidoia.com

---

## Que es Don Candido

SaaS multi-tenant de gestion operativa con compliance ISO integrado, dirigido a PyMES.
Nucleo: ISO 9001. Extensible por plugins normativos (14001, 45001, 27001, 19011) y funcionales (CRM, Contabilidad, WhatsApp). Dos apps Android nativas para vendedores y personal de campo.

**Stack:** Next.js 14 + TypeScript + Firebase 12 + Claude AI + Kotlin/Compose (Android)

---

## Documentos activos (15 archivos)

### Arquitectura y decisiones de producto

| Archivo | Que describe |
|---------|--------------|
| [74 - Arquitectura Core+Plugins](./74_ARQUITECTURA_PRODUCTO_CORE_PLUGINS_2026-03-25.md) | Core fijo vs plugins opcionales, bundles comerciales, editions |
| [69 - Arquitectura SIG Extensible](./69_ARQUITECTURA_SIG_EXTENSIBLE_2026-03-23.md) | Don Candido como plataforma SIG extensible, estrategia de packs normativos |
| [78 - Catalogo Canonico de Plugins](./78_RECONCILIACION_PLUGINS_ISO_CATALOGO_CANONICO_2026-03-26.md) | Fuente de verdad de IDs de plugins, manifests formales |

### Estado y modulos activos

| Archivo | Que describe |
|---------|--------------|
| [01 - Estado Actual de Modulos](./01_ESTADO_ACTUAL_MODULOS.md) | Lectura base al inicio de sesion: estado de core, plugins, Android y portales |
| [02 - IA y Don Candido](./02_IA_DON_CANDIDO_ARQUITECTURA.md) | UnifiedConverseService, adapters, LLMRouter, WhatsApp y Openclaw |
| [03 - Seguridad Multi-tenant](./03_SEGURIDAD_MULTITENANT.md) | withAuth, org scoping, Firestore rules y brechas cerradas |
| [05 - Contabilidad Central](./05_CONTABILIDAD_CENTRAL.md) | Motor event-driven, plan de cuentas ARG y eventos contables |
| [95 - Apps Android](./95_ESTADO_APPS_ANDROID_2026-04-01.md) | App CRM y App Operaciones — arquitectura, build, diseño, usuarios y despliegue |

### Diferenciadores y estrategia

| Archivo | Que describe |
|---------|--------------|
| [07 - Diferenciales de Comunicacion IA](./07_DIFERENCIALES_COMUNICACION_IA_2026-03-27.md) | Sentinel, WhatsApp clientes, WhatsApp RRHH e IA que actua en el SGC |
| [86 - Presentacion Inversor](./86_PRESENTACION_INVERSOR_DON_CANDIDO_IA_2026-03-30.md) | Pitch deck, propuesta de valor, diferenciadores y modelo de negocio |

### Pendientes activos

| Archivo | Que describe |
|---------|--------------|
| [96 - Deuda Tecnica y Pendientes](./96_DEUDA_TECNICA_PENDIENTES_2026-04-01.md) | Registro vivo de deuda tecnica, proximas olas sugeridas e historial de cierres |
| [103 - Plan Unificado Roadmap Estrategico](./103_PLAN_OLAS_ROADMAP_ESTRATEGICO_UNIFICADO_2026-04-03.md) | Continuacion unificada de planes 101+102 — alertas ejecutivas, bridge estrategico, RoadmapTab interactivo, trend historico y tests (4 olas) |
| [109 - Plan Android Comercial CRM + Operaciones](./109_PLAN_OLAS_ANDROID_COMERCIAL_CRM_OPERACIONES_2026-04-08.md) | Apps comerciales: flavor `operaciones` gradle, retiro hibridas Capacitor, tests repos (2 olas) |
| [110 - Plan ISO 18091 Gobierno Web + Android](./110_PLAN_OLAS_ISO18091_GOBIERNO_2026-04-08.md) | Monitor 18091: UI web `/gobierno/monitor`, Android government con datos reales, convergencia legacy (3 olas — Ola 1 ya completa) |

---

## Estado general del sistema (2026-04-03)

```text
PRODUCCION: doncandidoia.com
Next.js 14.2.18 · Firebase 12.4 · TypeScript strict · Android Kotlin/Compose

Core ISO 9001:        ALTO
CRM + WhatsApp:       ALTO
Registro Central:     ALTO
App Android CRM:      ALTO
App Android Ops:      ALTO
Contabilidad:         MEDIO-ALTO
Normas HSE/SGSI:      MEDIO
Analisis Estrategico: MEDIO-ALTO

Deuda tecnica principal:
1. iso_audit_19011 - UI stub, necesita implementacion real
2. PendingAttachmentWorker Android - falta worker de subida
3. Tests instrumentados Android - no existen
4. WhatsApp webhook produccion - falta configuracion en Meta
5. Roadmap Estrategico unificado - alertas, bridge, RoadmapTab interactivo y trend historico (ver report 103, Ola 1 ya ejecutada)
```

---

## Reglas de este directorio

- Maximo 15 archivos MD activos en raiz.
- Planes completados van a `archive/` y no deben quedar activos en raiz.
- La referencia historica del modulo de Analisis Estrategico es `archive/89_PLAN_ANALISIS_ESTRATEGICO_IA_2026-03-30.md`.
- Los planes 101 y 102 fueron unificados en 103 y movidos a `archive/`.
- La fuente de verdad viva del codigo sigue siendo `MEMORY.md` mas manifests en `src/config/plugins/`.
