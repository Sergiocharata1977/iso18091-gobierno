# Plan Self-Registration + Trial Autoservicio — Ejecución multi-agente

**Fecha:** 2026-04-08
**Feature:** Reemplazar el flujo de alta manual (pending_approval) por auto-registro con trial de 15 días
**Proyectos afectados:** `9001app-firebase`

---

## Contexto del sistema actual

### Flujo viejo (legacy — a preservar en backend, ocultar en frontend)

```
/register → Firebase Auth client-side → UserService.createUser()
              └─ status: 'pending_approval'
              └─ activo: false
              └─ rol: 'operario'
              └─ planType: 'none'
          → redirige a /onboarding/empresa
          → onboardingAccess.ts detecta pending_approval → /pending
          → Admin aprueba manualmente vía demo-requests/activate o UserService.approveUser()
```

### Flujo nuevo (a construir)

```
/register (nuevo) → POST /api/auth/self-register
                        └─ Crea Firebase Auth user (Admin SDK)
                        └─ Crea Firestore org con trial 15 días
                        └─ Crea Firestore user: admin + activo + trialing
                        └─ Crea OrganizationBillingSnapshot con trial
                    → Devuelve customToken → cliente hace signInWithCustomToken
                    → onboardingAccess.ts → directo a /onboarding (sin pending)
```

### Archivos clave identificados

| Archivo | Rol |
|---|---|
| `src/app/(auth)/register/page.tsx` | Página actual de registro (a reemplazar UI) |
| `src/app/(auth)/pending/page.tsx` | Pantalla de espera manual (legacy — no tocar lógica, solo aislar UX) |
| `src/services/auth/UserService.ts` | `createUser()` establece `status: 'pending_approval'` — origen del bloqueo |
| `src/lib/auth/onboardingAccess.ts` | Lógica de ruteo — `pending_approval` → `/pending` |
| `src/types/organization-billing.ts` | Tipos de billing ya existentes (trial, subscription, etc.) |
| `src/lib/billing/organizationBillingStatus.ts` | `deriveOrganizationAccessState()` — ya soporta trial |
| `src/app/api/demo-requests/activate/route.ts` | Flujo admin de activación manual (LEGACY — preservar) |
| `src/lib/billing/mobbexPlans.ts` | Planes Mobbex (basic/premium) |

---

## Resumen de olas

| Ola | Agentes | Paralelos entre sí | Dependen de |
|-----|---------|---------------------|-------------|
| 1 | A, B | Sí | Nada |
| 2 | A | No aplica (único) | Ola 1 completa |
| 3 | A, B | Sí | Ola 2 completa |
| 4 | A, B | Sí | Ola 3 completa |

---

## Ola 1 — Tipos y Servicios Base
> Ejecutar Agente A + Agente B en PARALELO

### Agente A — SelfRegistrationService
**Puede ejecutarse en paralelo con:** Agente B
**Depende de:** nada — es la primera ola

#### Objetivo
Crear el servicio transaccional que registra un nuevo cliente de autoservicio: Firebase Auth user (Admin SDK) + organización Firestore + usuario admin + OrganizationBillingSnapshot con trial de 15 días, en una sola operación atómica con rollback.

#### Archivos a crear
- `src/types/self-registration.ts` — tipos de input/output del servicio
- `src/services/registration/SelfRegistrationService.ts` — servicio principal

#### Archivos a modificar
- `src/services/auth/UserService.ts` — agregar método `createSelfRegisteredUser()` que NO usa `pending_approval` (el `createUser()` original queda intacto como legacy)

#### Prompt completo para el agente

```
Proyecto: Don Cándido IA — 9001app-firebase
Stack: Next.js 14 + TypeScript strict + Firebase Admin SDK 13.5 + Zod v4.1.12

Contexto necesario — leer primero:
- src/types/organization-billing.ts — tipos OrganizationBillingSnapshot, OrganizationTrialState, UpsertOrganizationTrialInput
- src/lib/billing/organizationBillingStatus.ts — deriveOrganizationAccessState()
- src/services/auth/UserService.ts — ver estructura existente de createUser() (que usa status: 'pending_approval' — NO modificar)
- src/lib/firebase/admin.ts — ver cómo obtener getAdminAuth() y getAdminFirestore()
- src/app/api/demo-requests/activate/route.ts — ver cómo el flujo viejo crea usuarios con Admin SDK (referencia)
- src/types/auth.ts — ver tipos User, UserStatus, PlanType

TAREA 1: Crear src/types/self-registration.ts

Definir con Zod y TypeScript:

export const SelfRegistrationInputSchema = z.object({
  name: z.string().min(2).max(100),           // nombre completo del usuario
  email: z.string().email(),
  password: z.string().min(6).max(128),
  companyName: z.string().min(2).max(150),    // nombre de la organización
  trialDays: z.number().int().min(1).max(60).default(15),
});
export type SelfRegistrationInput = z.infer<typeof SelfRegistrationInputSchema>;

export interface SelfRegistrationResult {
  success: true;
  userId: string;
  organizationId: string;
  customToken: string;   // para signInWithCustomToken en el cliente
  trialEndsAt: Date;
}

export interface SelfRegistrationError {
  success: false;
  error: string;
  code: 'email_exists' | 'validation_error' | 'internal_error';
}

TAREA 2: Crear src/services/registration/SelfRegistrationService.ts

Implementar clase SelfRegistrationService con método estático:
  static async register(input: SelfRegistrationInput): Promise<SelfRegistrationResult | SelfRegistrationError>

La implementación debe:
1. Validar input con SelfRegistrationInputSchema (Zod)
2. Verificar que el email no exista ya en Firebase Auth (usar Admin SDK getAdminAuth().getUserByEmail — si lanza auth/user-not-found continuar, si existe devolver error code: 'email_exists')
3. Crear Firebase Auth user con Admin SDK (createUser con email, password, displayName: name, emailVerified: false)
4. Generar organizationId con crypto.randomUUID() o como string: `org_${Date.now()}`
5. Calcular trial: trialStartsAt = new Date(), trialEndsAt = new Date(now + trialDays * 86400000)
6. En Firestore (batch write con getAdminFirestore().batch()):
   a. Crear doc en colección 'organizations': {
        id: organizationId,
        name: companyName,
        slug: generado desde companyName (lowercase, sin espacios, máx 40 chars),
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        onboarding_phase: 'not_started',
        edition: 'standard',
      }
   b. Crear doc en colección 'users' con uid del paso 3: {
        email,
        personnel_id: null,
        rol: 'admin',
        activo: true,
        status: 'active',          // <-- DIFERENCIA CLAVE vs createUser() legacy
        planType: 'trial',
        organization_id: organizationId,
        modulos_habilitados: null, // acceso completo
        is_first_login: true,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      }
   c. Crear doc en colección 'organization_billing_snapshots' con doc ID = organizationId: {
        organizationId,
        planCode: 'trial',
        subscriptionStatus: 'trialing',
        source: 'organization',
        ownerUserId: uid del Firebase Auth user creado,
        ownerEmail: email,
        trial: {
          status: 'active',
          startedAt: trialStartsAt,
          endsAt: trialEndsAt,
          grantedByUserId: 'self_registration',
          notes: 'Auto-trial 15 días — registro autoservicio',
        },
        provider: 'manual',
        providerSubscriptionId: null,
        providerCustomerId: null,
        providerReference: null,
        currentPeriodStart: trialStartsAt,
        currentPeriodEnd: trialEndsAt,
        canceledAt: null,
        pastDueAt: null,
        activatedAt: null,
        lastPaymentAt: null,
        lastPaymentError: null,
        metadata: { source: 'self_registration' },
        legacyUserId: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }
7. Hacer batch.commit()
8. Generar customToken con getAdminAuth().createCustomToken(uid, { organizationId })
9. Si CUALQUIER paso falla después de crear el Firebase Auth user, intentar cleanup: getAdminAuth().deleteUser(uid) y loguear error
10. Retornar SelfRegistrationResult con userId, organizationId, customToken, trialEndsAt

TAREA 3: Agregar método a src/services/auth/UserService.ts

Al final del archivo, agregar comentario y método:
  // NOTE: Este método es para el flujo LEGACY de aprobación manual.
  // Para auto-registro de nuevos clientes usar SelfRegistrationService.register()
  static async createUser(...) { ... }  // existente — NO MODIFICAR

NO modificar el método createUser() existente. Solo agregar el comentario JSDoc encima.

Criterio de éxito:
- npx tsc --noEmit pasa sin errores
- El servicio importa correctamente desde '@/lib/firebase/admin'
- Los tipos usan z.record(z.string(), z.unknown()) si necesitan records (Zod v4.1.12 requiere 2 args)
```

---

### Agente B — Tipos de Plan de Suscripción
**Puede ejecutarse en paralelo con:** Agente A
**Depende de:** nada — es la primera ola

#### Objetivo
Crear la arquitectura de tipos para los planes de suscripción con límites por usuario, plugins premium y flags de feature — preparando el modelo para cobro por cantidad de usuarios.

#### Archivos a crear
- `src/types/subscription-plan.ts` — tipos de plan con límites y features

#### Prompt completo para el agente

```
Proyecto: Don Cándido IA — 9001app-firebase
Stack: Next.js 14 + TypeScript strict + Zod v4.1.12

Contexto necesario — leer primero:
- src/types/organization-billing.ts — ver OrganizationPlanCode ('none' | 'trial' | 'basic' | 'premium')
- src/config/plugins/index.ts — ver PLATFORM_PLUGIN_MANIFESTS para saber qué plugins existen

TAREA: Crear src/types/subscription-plan.ts

Este archivo define la arquitectura de planes preparada para cobro por usuario.
El pricing exacto NO está definido todavía — los valores son placeholders.

Debe incluir:

1. PlanLimits — límites operativos por plan:
export interface PlanLimits {
  maxUsers: number;            // -1 = ilimitado
  maxOrganizationAdmins: number;
  maxStorageGb: number;        // -1 = ilimitado
  maxApiCallsPerMonth: number; // -1 = ilimitado
  allowedPlugins: string[];    // IDs de plugins incluidos ('*' = todos)
  premiumPlugins: string[];    // IDs que requieren upgrade para este plan
}

2. PlanPricing — estructura de precio por usuario:
export interface PlanPricing {
  currency: 'ARS' | 'USD';
  pricePerUserPerMonth: number | null;  // null = no definido todavía
  minimumUsers: number;
  flatFee: number | null;              // cargo fijo mensual además del por-usuario
  trialDays: number;
}

3. SubscriptionPlan — definición completa de un plan:
export interface SubscriptionPlan {
  code: OrganizationPlanCode;
  name: string;
  description: string;
  limits: PlanLimits;
  pricing: PlanPricing;
  isPublic: boolean;         // false = solo asignable por admin
  isLegacy: boolean;         // true = plan viejo, no ofrecer en UI nueva
}

4. SUBSCRIPTION_PLANS — constante con los 4 planes:
export const SUBSCRIPTION_PLANS: Record<OrganizationPlanCode, SubscriptionPlan> = {
  none: {
    code: 'none',
    name: 'Sin plan',
    description: 'Cuenta sin plan activo',
    isPublic: false,
    isLegacy: true,
    limits: { maxUsers: 0, maxOrganizationAdmins: 0, maxStorageGb: 0, maxApiCallsPerMonth: 0, allowedPlugins: [], premiumPlugins: [] },
    pricing: { currency: 'ARS', pricePerUserPerMonth: null, minimumUsers: 1, flatFee: null, trialDays: 0 },
  },
  trial: {
    code: 'trial',
    name: 'Prueba gratuita',
    description: 'Acceso completo por 15 días para evaluar la plataforma',
    isPublic: true,
    isLegacy: false,
    limits: { maxUsers: 5, maxOrganizationAdmins: 1, maxStorageGb: 2, maxApiCallsPerMonth: 1000, allowedPlugins: ['*'], premiumPlugins: [] },
    pricing: { currency: 'ARS', pricePerUserPerMonth: 0, minimumUsers: 1, flatFee: 0, trialDays: 15 },
  },
  basic: {
    code: 'basic',
    name: 'Plan Básico',
    description: 'ISO 9001 core + CRM para equipos pequeños',
    isPublic: true,
    isLegacy: false,
    limits: { maxUsers: 10, maxOrganizationAdmins: 2, maxStorageGb: 10, maxApiCallsPerMonth: 5000, allowedPlugins: ['crm', 'iso_infrastructure', 'iso_design_development'], premiumPlugins: ['crm_whatsapp_inbox', 'iso_audit_19011', 'contabilidad_central'] },
    pricing: { currency: 'ARS', pricePerUserPerMonth: null, minimumUsers: 1, flatFee: null, trialDays: 15 },
  },
  premium: {
    code: 'premium',
    name: 'Plan Premium',
    description: 'Plataforma completa SIG + IA + todos los plugins',
    isPublic: true,
    isLegacy: false,
    limits: { maxUsers: -1, maxOrganizationAdmins: -1, maxStorageGb: -1, maxApiCallsPerMonth: -1, allowedPlugins: ['*'], premiumPlugins: [] },
    pricing: { currency: 'ARS', pricePerUserPerMonth: null, minimumUsers: 1, flatFee: null, trialDays: 15 },
  },
};

5. Función helper:
export function getPlanByCode(code: OrganizationPlanCode): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[code];
}

export function isUserWithinPlanLimits(plan: SubscriptionPlan, currentUserCount: number): boolean {
  if (plan.limits.maxUsers === -1) return true;
  return currentUserCount < plan.limits.maxUsers;
}

Criterio de éxito:
- Archivo compila con npx tsc --noEmit
- Importa OrganizationPlanCode desde '@/types/organization-billing'
- No usa z.record() sin 2 argumentos
```

---

## Ola 2 — API Pública de Auto-Registro
> Ejecutar SOLO después de que Ola 1 esté completa
> Único agente en esta ola

### Agente A — Endpoint POST /api/auth/self-register
**Puede ejecutarse en paralelo con:** es el único de esta ola
**Depende de:** Ola 1 completa (SelfRegistrationService y tipos deben existir)

#### Objetivo
Crear el endpoint público que recibe los datos del formulario de registro y orquesta el SelfRegistrationService, devolviendo el customToken para que el cliente haga signInWithCustomToken.

#### Archivos a crear
- `src/app/api/auth/self-register/route.ts` — endpoint POST público

#### Prompt completo para el agente

```
Proyecto: Don Cándido IA — 9001app-firebase
Stack: Next.js 14 + TypeScript strict + Firebase Admin SDK 13.5 + Zod v4.1.12

Contexto necesario — leer primero:
- src/types/self-registration.ts — SelfRegistrationInputSchema, SelfRegistrationResult, SelfRegistrationError
- src/services/registration/SelfRegistrationService.ts — SelfRegistrationService.register()
- src/lib/api/withAuth.ts — ver la firma de withAuth (para NO usarla aquí — esta ruta es pública)
- src/app/api/public/solicitudes/mias/route.ts — ver cómo una ruta pública sin withAuth valida x-tenant-key (referencia de patrón)
- src/middleware.ts — ver rutas que están en publicRoutes para entender qué necesito agregar

TAREA: Crear src/app/api/auth/self-register/route.ts

Este endpoint es PÚBLICO — NO usa withAuth.
Un usuario no autenticado lo llama para crear su cuenta.

Implementación:

import { SelfRegistrationInputSchema } from '@/types/self-registration';
import { SelfRegistrationService } from '@/services/registration/SelfRegistrationService';
import { NextRequest, NextResponse } from 'next/server';

export const POST = async (request: NextRequest) => {
  try {
    // 1. Parsear body
    const body = await request.json();

    // 2. Validar con Zod — si falla retornar 400
    const parseResult = SelfRegistrationInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', code: 'validation_error', issues: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // 3. Llamar al servicio
    const result = await SelfRegistrationService.register(parseResult.data);

    // 4. Si falla, mapear a código HTTP apropiado
    if (!result.success) {
      const status = result.code === 'email_exists' ? 409 : 500;
      return NextResponse.json(result, { status });
    }

    // 5. Éxito — devolver customToken y datos de org
    return NextResponse.json({
      success: true,
      customToken: result.customToken,
      userId: result.userId,
      organizationId: result.organizationId,
      trialEndsAt: result.trialEndsAt.toISOString(),
    }, { status: 201 });

  } catch (error) {
    console.error('[self-register] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', code: 'internal_error' },
      { status: 500 }
    );
  }
};

// Solo POST permitido
export const GET = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });

Adicionalmente, verificar si src/middleware.ts tiene un array de rutas públicas (publicRoutes o matcher exceptions).
Si existe, agregar '/api/auth/self-register' a esa lista para que el middleware no bloquee la ruta.
Leer src/middleware.ts antes de modificarlo. Si no hay un array simple de rutas públicas, NO modificar el middleware — solo documentarlo en un comentario en el route.ts.

Criterio de éxito:
- Ruta compila con npx tsc --noEmit
- No usa withAuth
- Valida con Zod antes de llamar al servicio
- Maneja errores correctamente con códigos HTTP apropiados
```

---

## Ola 3 — Frontend Nuevo Registro + Aislamiento Legacy
> Ejecutar SOLO después de que Ola 2 esté completa
> Ejecutar Agente A + Agente B en PARALELO

### Agente A — Nueva Página de Registro Autoservicio
**Puede ejecutarse en paralelo con:** Agente B
**Depende de:** Ola 2 completa (endpoint /api/auth/self-register debe existir)

#### Objetivo
Reemplazar la UI de `/register` con un formulario de auto-registro moderno: nombre, empresa, email, contraseña. Sin selector de módulos. Sin pending. Llama a `/api/auth/self-register`, luego hace `signInWithCustomToken`, y redirige directo al onboarding.

#### Archivos a modificar
- `src/app/(auth)/register/page.tsx` — reemplazar implementación completa

#### Prompt completo para el agente

```
Proyecto: Don Cándido IA — 9001app-firebase
Stack: Next.js 14 + TypeScript strict + React 18 + Tailwind CSS + Radix UI

Contexto necesario — leer primero:
- src/app/(auth)/register/page.tsx — ver la UI existente (AuthShell, componentes de formulario, estilos usados)
- src/components/auth/AuthShell.tsx — ver props de AuthShell
- src/components/ui/button.tsx — Button component
- src/components/ui/input.tsx — Input component
- src/lib/auth/onboardingAccess.ts — ver BOOTSTRAP_ROUTE, HOME_ROUTE
- src/firebase/auth.ts — ver si existe signInWithCustomToken exportado (buscar también en src/lib/firebase/)

TAREA: Reemplazar src/app/(auth)/register/page.tsx

Nuevo formulario con 4 campos:
1. Nombre completo (name)
2. Nombre de empresa/organización (companyName)
3. Email (email)
4. Contraseña (password, mínimo 6 chars)
5. Confirmar contraseña (confirmPassword)

Sin selección de módulos (MODULE_ACCESS_OPTIONS ya no se usa aquí).

Flujo del handleSubmit:
1. Validar que password === confirmPassword
2. Llamar fetch('POST', '/api/auth/self-register', { name, companyName, email, password })
3. Si error 409: mostrar "Este email ya tiene una cuenta. Inicia sesión."
4. Si error 400: mostrar mensaje de validación
5. Si éxito: recibir { customToken, organizationId, trialEndsAt }
6. Hacer signInWithCustomToken(auth, customToken) desde Firebase Auth client SDK
   - Importar desde 'firebase/auth': import { getAuth, signInWithCustomToken } from 'firebase/auth'
   - Importar desde '@/firebase/config': import { app } from '@/firebase/config'
   - Usar: await signInWithCustomToken(getAuth(app), customToken)
7. Redirigir a BOOTSTRAP_ROUTE ('/onboarding/empresa')

UI con AuthShell:
- panelEyebrow="Registro gratuito"
- panelTitle="Empieza tu prueba de 15 días"
- panelDescription="Crea tu cuenta y tu organización. Sin tarjeta de crédito."
- heroTitle="15 días para descubrir lo que Don Cándido puede hacer por tu empresa."
- heroFeatures con 3 items atractivos:
  1. { icon: Zap, title: 'Acceso inmediato', description: 'Tu cuenta queda activa al instante. Sin esperas ni aprobaciones.', tone: 'success' }
  2. { icon: ShieldCheck, title: 'ISO 9001 completo', description: 'Procesos, auditorías, hallazgos, documentos y IA incluidos desde el día uno.', tone: 'default' }
  3. { icon: Users, title: 'Para todo tu equipo', description: 'Invita hasta 5 usuarios durante el trial. Sin límite de funcionalidades.', tone: 'default' }

Estado de loading con texto "Creando tu empresa..."
Estado de éxito (breve) antes del redirect: "¡Listo! Iniciando tu entorno..."

Footer: "¿Ya tienes cuenta? <Link href='/login'>Iniciar sesión</Link>"

IMPORTANTE:
- NO importar MODULE_ACCESS_OPTIONS ni signUp de '@/firebase/auth' (no los uses)
- NO llamar UserService.createUser() — todo lo hace el endpoint
- Usar los mismos estilos de className que usa el register actual (h-12, rounded-[var(--radius-lg)], etc.)
- El componente debe compilar — npx tsc --noEmit sin errores

Criterio de éxito:
- El form tiene los 5 campos correctos
- El flujo llama /api/auth/self-register y luego signInWithCustomToken
- No hay selector de módulos
- No redirige a /pending en ningún caso
- Mantiene la estructura visual AuthShell
```

---

### Agente B — Aislamiento del Flujo Legacy
**Puede ejecutarse en paralelo con:** Agente A
**Depende de:** Ola 2 completa

#### Objetivo
Marcar el flujo de aprobación manual como legacy en el código, de modo que sea claro para cualquier desarrollador que `/pending` y `demo-requests/activate` son rutas internas/admin, no parte del flujo público de nuevos clientes.

#### Archivos a modificar
- `src/app/(auth)/pending/page.tsx` — agregar banner de "legacy internal" visible solo si hay query param `?legacy=1`, y comentario técnico
- `src/services/auth/UserService.ts` — agregar comentario JSDoc claro sobre el status de createUser
- `src/app/api/demo-requests/activate/route.ts` — agregar comentario de legacy al inicio

#### Prompt completo para el agente

```
Proyecto: Don Cándido IA — 9001app-firebase
Stack: Next.js 14 + TypeScript strict + React 18

Contexto necesario — leer primero:
- src/app/(auth)/pending/page.tsx — ver implementación completa
- src/services/auth/UserService.ts — ver el método createUser() y su status: 'pending_approval'
- src/app/api/demo-requests/activate/route.ts — ver la implementación

TAREA 1: Marcar pending/page.tsx como legacy

Agregar al inicio del componente PendingApprovalPage, ANTES del return principal:
Un comentario JSDoc sobre la función indicando que es legacy.

Y dentro del JSX, agregar un banner condicional que solo se muestra si la URL tiene ?legacy=1 o si el user.rol === 'super_admin' (para que admins vean el contexto):

{/* LEGACY: Este flujo es para cuentas aprobadas manualmente antes del 2026-04-08.
    Los nuevos registros van directo a onboarding sin pasar por aquí.
    Esta pantalla se mantiene para compatibilidad con cuentas existentes. */}

El banner condicional solo para super_admin (usar useAuth):
Si auth.user?.rol === 'super_admin':
  Mostrar un pequeño aviso visual en la parte inferior del panel:
  "⚠️ Flujo legacy: esta cuenta fue creada antes del sistema de auto-registro"

NO modificar la lógica principal de la página — solo agregar el comentario y el aviso condicional.

TAREA 2: Agregar JSDoc a UserService.createUser()

En src/services/auth/UserService.ts, encima del método createUser(), agregar:

/**
 * @deprecated Para nuevos registros de clientes usar SelfRegistrationService.register()
 * Este método establece status: 'pending_approval' y activo: false — es el flujo LEGACY
 * de alta manual que requiere aprobación de administrador.
 * Mantener para compatibilidad con cuentas existentes y flujo super-admin.
 */

NO modificar la implementación del método.

TAREA 3: Comentario en demo-requests/activate/route.ts

Al inicio del archivo, después de los imports, agregar:

/**
 * LEGACY ADMIN ROUTE — Flujo de activación manual de demo requests.
 * Este endpoint es solo para uso interno de super-admin.
 * Los nuevos clientes se registran vía POST /api/auth/self-register (autoservicio).
 * No eliminar: mantiene compatibilidad con cuentas creadas antes de 2026-04-08.
 */

Criterio de éxito:
- npx tsc --noEmit pasa sin errores
- No se modifica lógica existente — solo se agregan comentarios y el banner condicional
- El pending page sigue funcionando igual para usuarios con status pending_approval
```

---

## Ola 4 — Integración del Sistema de Ruteo y Configuración
> Ejecutar SOLO después de que Ola 3 esté completa
> Ejecutar Agente A + Agente B en PARALELO

### Agente A — Actualizar onboardingAccess para el Nuevo Flujo
**Puede ejecutarse en paralelo con:** Agente B
**Depende de:** Ola 3 completa

#### Objetivo
Actualizar `onboardingAccess.ts` para manejar correctamente el nuevo estado de usuarios auto-registrados: `status: 'active'` + `planType: 'trial'` + `activo: true`. Asegurar que el ruteo va directo a onboarding sin pasar por `/pending`.

#### Archivos a modificar
- `src/lib/auth/onboardingAccess.ts` — agregar razón `'self_registered_trial'` y asegurar que el nuevo estado rutea a onboarding

#### Prompt completo para el agente

```
Proyecto: Don Cándido IA — 9001app-firebase
Stack: Next.js 14 + TypeScript strict

Contexto necesario — leer COMPLETO:
- src/lib/auth/onboardingAccess.ts — leer el archivo completo
- src/types/organization-billing.ts — OrganizationAccessState

Análisis actual:
La función resolveOnboardingAccess ya funciona correctamente para el nuevo flujo porque:
- El nuevo usuario tiene status: 'active' (no 'pending_approval') → NO va a /pending
- El nuevo usuario tiene organization_id → NO va a /bootstrap
- El nuevo usuario tiene is_first_login: true → SÍ va a /onboarding (correcto)
- El nuevo usuario tiene billing via trial activo → hasBillingAccess() devuelve true

Sin embargo, necesitamos:
1. Agregar 'self_registered_trial' al tipo OnboardingAccessReason como documentación
2. Verificar que hasBillingAccess() funciona correctamente cuando commercialState.accessState === 'trial'

TAREA 1: Actualizar el tipo OnboardingAccessReason

Agregar 'self_registered_trial' al union type:
export type OnboardingAccessReason =
  | 'anonymous'
  | 'super_admin'
  | 'bootstrap_required'
  | 'organization_pending'
  | 'onboarding_required'
  | 'billing_required'
  | 'self_registered_trial'   // <-- AGREGAR
  | 'home';

TAREA 2: Verificar y documentar el flujo en un comentario

Encima de la función resolveOnboardingAccess, agregar un comentario de documentación:

/**
 * Resuelve la ruta de onboarding para un usuario.
 *
 * Flujo LEGACY (aprobación manual):
 *   status='pending_approval' → /pending → admin aprueba → /onboarding
 *
 * Flujo NUEVO (auto-registro desde 2026-04-08):
 *   status='active', planType='trial', is_first_login=true → /onboarding directo
 *   El trial se gestiona en OrganizationBillingSnapshot.
 */

TAREA 3: Verificar la lógica de hasBillingAccess

Revisar si hasBillingAccess() cubre el caso commercialState.accessState === 'trial'.
La función hasOrganizationBillingAccess en src/lib/billing/organizationBillingStatus.ts
debe retornar true para accessState === 'trial'.

Si NO lo hace, agregar el caso. Si sí lo hace, solo documentarlo en un comentario.

TAREA 4: Agregar el campo trialDays al tipo AccessUserLike (si no existe)

Verificar si AccessUserLike tiene campo 'trialDays' o 'trial'. Si no tiene, no agregar —
el sistema usa commercialState.accessState que ya cubre el trial.

Solo verificar que el typechecker pasa: npx tsc --noEmit

Criterio de éxito:
- npx tsc --noEmit sin errores
- La razón 'self_registered_trial' existe en el tipo
- El comentario de documentación del flujo dual está presente
- No se rompe el flujo legacy (pending_approval todavía rutea a /pending)
```

---

### Agente B — Actualizar Middleware para Ruta Pública
**Puede ejecutarse en paralelo con:** Agente A
**Depende de:** Ola 3 completa

#### Objetivo
Asegurar que `/api/auth/self-register` está correctamente excluido del middleware de autenticación global, y que la ruta de registro `/register` no tiene redirecciones automáticas que rompan el nuevo flujo.

#### Archivos a modificar
- `src/middleware.ts` — verificar y agregar `/api/auth/self-register` a rutas públicas

#### Prompt completo para el agente

```
Proyecto: Don Cándido IA — 9001app-firebase
Stack: Next.js 14 + TypeScript strict

Contexto necesario — leer COMPLETO:
- src/middleware.ts — leer el archivo entero para entender cómo funciona el gate de auth

TAREA: Asegurar que /api/auth/self-register es accesible sin autenticación

Analizar cómo el middleware define rutas públicas:
- Buscar arrays de rutas como publicRoutes, PUBLIC_PATHS, o patterns de matcher
- Buscar si hay una condición que permite pasar rutas /api/public/* automáticamente
- Buscar si hay condiciones de exclusión basadas en pathname.startsWith()

SI existe un array o lista de rutas públicas explícita:
  Agregar '/api/auth/self-register' a esa lista.

SI las rutas públicas se manejan por prefijo /api/public/:
  NO agregar la ruta al middleware — en su lugar, agregar un comentario en
  src/app/api/auth/self-register/route.ts explicando que la ruta debe estar
  excluida del middleware manualmente.

SI el middleware tiene un matcher de Next.js en el config:
  Verificar que '/api/auth/self-register' NO está en el matcher (o que el matcher
  excluye rutas /api/auth/ correctamente).

En cualquier caso, agregar este comentario donde se define la lista de rutas públicas:
  // '/api/auth/self-register' — registro autoservicio de nuevos clientes (sin auth)

TAMBIÉN verificar:
- Que '/register' (la página de registro) no está siendo redirigida por el middleware
  si el usuario NO está autenticado. Debe ser accesible para usuarios anónimos.
- Si existe algún caso en el middleware que redirija usuarios anónimos en /register,
  asegurarse de que '/register' esté en la lista de rutas públicas.

Criterio de éxito:
- npx tsc --noEmit sin errores
- /api/auth/self-register puede recibir requests sin Bearer token
- /register es accesible sin autenticación
- No se rompe ninguna ruta protegida existente
```

---

## Verificación final

### Checklist manual post-ejecución

**Backend:**
- [ ] `npx tsc --noEmit` pasa sin errores en todo el proyecto
- [ ] `src/types/self-registration.ts` existe y tiene SelfRegistrationInputSchema, SelfRegistrationResult, SelfRegistrationError
- [ ] `src/types/subscription-plan.ts` existe y tiene SUBSCRIPTION_PLANS con los 4 planes
- [ ] `src/services/registration/SelfRegistrationService.ts` existe y tiene método `register()`
- [ ] El método `createUser()` en UserService tiene el JSDoc de `@deprecated`
- [ ] `src/app/api/auth/self-register/route.ts` existe y acepta POST sin auth

**Frontend:**
- [ ] `/register` tiene los 5 campos: nombre, empresa, email, contraseña, confirmar contraseña
- [ ] `/register` NO tiene selector de módulos
- [ ] `/register` llama `/api/auth/self-register` en el submit
- [ ] `/register` hace `signInWithCustomToken` después del registro exitoso
- [ ] `/register` redirige a `/onboarding/empresa` (BOOTSTRAP_ROUTE)
- [ ] `/register` NO redirige a `/pending` en ningún caso
- [ ] `/pending` sigue funcionando para cuentas legacy (status: pending_approval)
- [ ] El banner de legacy en `/pending` solo se muestra para super_admin

**Middleware:**
- [ ] `POST /api/auth/self-register` es accesible sin Bearer token
- [ ] Las rutas dashboard siguen protegidas (no se rompió el gate de auth)

**Flujo legacy preservado:**
- [ ] `src/app/api/demo-requests/activate/route.ts` sigue funcionando
- [ ] El status `pending_approval` en Firestore sigue siendo manejado por onboardingAccess
- [ ] Cuentas existentes con `pending_approval` siguen viendo `/pending`
- [ ] Super-admin puede seguir activando cuentas legacy desde `/super-admin/organizaciones`

**Prueba end-to-end del nuevo flujo:**
1. Ir a `/register`
2. Llenar: nombre="Test User", empresa="Empresa Test", email=nuevo_email@test.com, contraseña="123456"
3. Submit → debe crear cuenta sin pasar por `/pending`
4. Debe redirigir a `/onboarding/empresa`
5. Verificar en Firestore: user con `status: 'active'`, org creada, billing con `subscriptionStatus: 'trialing'`
6. Verificar que el trial tiene `endsAt` en 15 días

---

## Notas de arquitectura

### Por qué no se usa signUp() del cliente en el nuevo flujo
El flujo viejo usaba `signUp()` (Firebase Auth client SDK) y luego `UserService.createUser()` (Firestore client). Esto crea una ventana de tiempo donde el usuario existe en Firebase Auth pero no en Firestore, y si Firestore falla el Auth user queda huérfano.

El nuevo flujo usa **Admin SDK en el servidor** para crear todo en una transacción, con cleanup automático si algo falla.

### Por qué se mantiene pending_approval
El campo `status: 'pending_approval'` existe en Firestore para decenas o cientos de cuentas existentes. Eliminarlo rompería la lógica de `onboardingAccess.ts` para esos usuarios. Se mantiene indefinidamente como legacy.

### Pricing por usuario — preparación
El tipo `SubscriptionPlan.pricing.pricePerUserPerMonth` existe pero tiene valor `null` en todos los planes actuales. Cuando el pricing esté definido, solo hay que actualizar `SUBSCRIPTION_PLANS` en `src/types/subscription-plan.ts`. No hay que tocar ningún otro archivo para reflejar los precios en la UI de billing.

### Colección organization_billing_snapshots
El SelfRegistrationService crea el billing snapshot directamente. Esto es consistente con cómo `organizationBillingApi.ts` lee el estado de billing de las orgs. El `accessState: 'trial'` que se deriva de `subscriptionStatus: 'trialing'` + `trial.endsAt` en el futuro hace que `hasOrganizationBillingAccess()` retorne `true`, dando acceso completo durante los 15 días.
