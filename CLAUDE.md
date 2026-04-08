# Don Cándido IA — Contexto del Proyecto

SaaS multi-tenant ISO 9001 + CRM + IA. Next.js 14 + Firebase. Producción real en doncandidoia.com.

## Comandos esenciales

```bash
npm run dev          # desarrollo local
npm run build        # build de producción (verificar antes de push)
npx tsc --noEmit     # verificar TypeScript sin compilar
firebase deploy --only firestore:rules    # desplegar reglas Firestore
firebase deploy --only firestore:indexes  # desplegar índices Firestore
```

## Arquitectura en una línea

Core ISO 9001 (siempre) + Plugins opcionales (manifests en `src/config/plugins/`) + IA omnicanal (Don Cándido)

## Patrones obligatorios — NUNCA omitir

### API routes
```typescript
import { withAuth } from '@/lib/api/withAuth';                          // CORRECTO
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';

export const GET = withAuth(async (req, context, auth) => {
  const orgId = resolveAuthorizedOrganizationId(auth, undefined);       // SIEMPRE
  // Usar orgId para filtrar — NUNCA confiar en body/query params
}, { roles: ['admin', 'manager'] });
```

### Plugin IDs — siempre snake_case
```
crm, crm_risk_scoring, crm_whatsapp_inbox, dealer_solicitudes
iso_infrastructure, iso_design_development, iso_audit_19011
iso_environment_14001, iso_sst_45001, ptw_seguridad, iso_sgsi_27001
contabilidad_central, openclaw
pack_hse, pack_sgsi_plus, pack_sig_integrado
```
Catálogo completo: `src/config/plugins/index.ts` → `PLATFORM_PLUGIN_MANIFESTS`

### Zod v4.1.12
```typescript
z.record(z.string(), valueType)  // 2 argumentos — NO z.record(valueType)
```

### Contabilidad event-driven
```typescript
// Al guardar operaciones económicas en cualquier plugin:
await emitAccountingEvent({ plugin_id, operation_type, importe_total, idempotency_key, ... });
// NO crear asientos manuales — el motor los genera automáticamente
```

## Archivos clave

| Archivo | Para qué |
|---|---|
| `src/lib/api/withAuth.ts` | Wrapper de auth en todas las API routes |
| `src/middleware/verifyOrganization.ts` | resolveAuthorizedOrganizationId |
| `src/config/plugins/index.ts` | Catálogo completo de plugins (fuente de verdad) |
| `src/services/ai-core/UnifiedConverseService.ts` | Cerebro IA |
| `firestore.rules` | Reglas multi-tenant |
| `src/middleware.ts` | Gate global de autenticación |

## Reglas de seguridad — CRÍTICAS

- NUNCA tomar `organization_id` del body o query params — usar `auth.organizationId` del token
- NUNCA saltear `withAuth` en rutas privadas
- NUNCA commitear `service-account.json` u otras credenciales
- Rutas públicas en `/api/public/*` usan `x-tenant-key` en lugar de Bearer

## Stack técnico

- Next.js 14.2.18 + TypeScript strict + React 18
- Firebase 12.4 (Firestore/Auth/Storage) + Admin SDK 13.5
- Claude SDK 0.67 + Groq SDK (fallback)
- Radix UI + Tailwind + Framer Motion
- Sentry (server/client/edge), PostHog, Capacitor (Android)

## Tests

```bash
npm test                              # todos los tests
npm test src/__tests__/crm/           # tests de un módulo
```

Tests en `src/__tests__/`. Patrón: cross-org test SIEMPRE para cada API route nueva.

## Skills disponibles

| Skill | Cuándo usarlo |
|---|---|
| `/self-update` | Al inicio de sesión o tras completar un plan de olas |
| `/plan-olas` | Planificar una feature con múltiples agentes |
| `/analiza-build` | Build de Vercel fallando |
| `/audit-security` | Revisar seguridad de una API route |
| `/check-capability` | Verificar un plugin/capability |
| `/iso-module` | Scaffold de módulo ISO nuevo |
| `/arch-review` | Revisión arquitectural completa |
| `/analyze-module` | Análisis profundo de un módulo específico |
| `/contabilidad-eventos` | Patrón event-driven contable |
| `/canales-ia` | Análisis de canales IA (form/WA/voz/openclaw) |
| `/gov-edition` | Vertical gobierno local ISO 18091 |
| `/add-doc` | Crear documentación in-app |
| `/refactor-plan` | Plan de refactor para un scope |
| `/ui-review` | Verificar design system en componente |
| `/session-summary` | Resumen de sesión para transferir contexto |
| `/manual-calidad` | Generar Manual de Calidad ISO 9001 en PDF |

## Documentación del proyecto

`reports/00_INDICE.md` — mapa completo de los 11 documentos activos de arquitectura y estado.

## Health Stack

- typecheck: npx tsc --noEmit
- lint: eslint .
- test: npm test

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
