import type { OrganizationPlanCode } from '@/types/organization-billing';

export const MOBBEX_PLANS = {
  basic: {
    id: 'plan_basic_demo',
    name: 'Plan Basico',
    price: 5000,
    description: 'Acceso basico a la plataforma',
  },
  premium: {
    id: 'plan_premium_demo',
    name: 'Plan Premium',
    price: 15000,
    description: 'Acceso completo con todas las funcionalidades',
  },
} as const;

export type MobbexPlanKey = keyof typeof MOBBEX_PLANS;

export function normalizeMobbexPlanCode(
  value: string
): Extract<OrganizationPlanCode, 'basic' | 'premium'> | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'basic' || normalized === 'premium') {
    return normalized;
  }
  return null;
}
