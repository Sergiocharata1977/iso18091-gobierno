import type { OrganizationPlanCode } from '@/types/organization-billing';

export interface PlanLimits {
  maxUsers: number; // -1 = ilimitado
  maxOrganizationAdmins: number;
  maxStorageGb: number; // -1 = ilimitado
  maxApiCallsPerMonth: number; // -1 = ilimitado
  allowedPlugins: string[]; // IDs de plugins incluidos ('*' = todos)
  premiumPlugins: string[]; // IDs que requieren upgrade para este plan
}

export interface PlanPricing {
  currency: 'ARS' | 'USD';
  pricePerUserPerMonth: number | null; // null = no definido todavia
  minimumUsers: number;
  flatFee: number | null; // cargo fijo mensual ademas del por-usuario
  trialDays: number;
}

export interface SubscriptionPlan {
  code: OrganizationPlanCode;
  name: string;
  description: string;
  limits: PlanLimits;
  pricing: PlanPricing;
  isPublic: boolean; // false = solo asignable por admin
  isLegacy: boolean; // true = plan viejo, no ofrecer en UI nueva
}

export const SUBSCRIPTION_PLANS: Record<OrganizationPlanCode, SubscriptionPlan> = {
  none: {
    code: 'none',
    name: 'Sin plan',
    description: 'Cuenta sin plan activo',
    isPublic: false,
    isLegacy: true,
    limits: {
      maxUsers: 0,
      maxOrganizationAdmins: 0,
      maxStorageGb: 0,
      maxApiCallsPerMonth: 0,
      allowedPlugins: [],
      premiumPlugins: [],
    },
    pricing: {
      currency: 'ARS',
      pricePerUserPerMonth: null,
      minimumUsers: 1,
      flatFee: null,
      trialDays: 0,
    },
  },
  trial: {
    code: 'trial',
    name: 'Prueba gratuita',
    description: 'Acceso completo por 15 dias para evaluar la plataforma',
    isPublic: true,
    isLegacy: false,
    limits: {
      maxUsers: 5,
      maxOrganizationAdmins: 1,
      maxStorageGb: 2,
      maxApiCallsPerMonth: 1000,
      allowedPlugins: ['*'],
      premiumPlugins: [],
    },
    pricing: {
      currency: 'ARS',
      pricePerUserPerMonth: 0,
      minimumUsers: 1,
      flatFee: 0,
      trialDays: 15,
    },
  },
  basic: {
    code: 'basic',
    name: 'Plan Basico',
    description: 'ISO 9001 core + CRM para equipos pequenos',
    isPublic: true,
    isLegacy: false,
    limits: {
      maxUsers: 10,
      maxOrganizationAdmins: 2,
      maxStorageGb: 10,
      maxApiCallsPerMonth: 5000,
      allowedPlugins: ['crm', 'iso_infrastructure', 'iso_design_development'],
      premiumPlugins: ['crm_whatsapp_inbox', 'iso_audit_19011', 'contabilidad_central'],
    },
    pricing: {
      currency: 'ARS',
      pricePerUserPerMonth: null,
      minimumUsers: 1,
      flatFee: null,
      trialDays: 15,
    },
  },
  premium: {
    code: 'premium',
    name: 'Plan Premium',
    description: 'Plataforma completa SIG + IA + todos los plugins',
    isPublic: true,
    isLegacy: false,
    limits: {
      maxUsers: -1,
      maxOrganizationAdmins: -1,
      maxStorageGb: -1,
      maxApiCallsPerMonth: -1,
      allowedPlugins: ['*'],
      premiumPlugins: [],
    },
    pricing: {
      currency: 'ARS',
      pricePerUserPerMonth: null,
      minimumUsers: 1,
      flatFee: null,
      trialDays: 15,
    },
  },
};

export function getPlanByCode(code: OrganizationPlanCode): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[code];
}

export function isUserWithinPlanLimits(
  plan: SubscriptionPlan,
  currentUserCount: number
): boolean {
  if (plan.limits.maxUsers === -1) return true;
  return currentUserCount < plan.limits.maxUsers;
}
