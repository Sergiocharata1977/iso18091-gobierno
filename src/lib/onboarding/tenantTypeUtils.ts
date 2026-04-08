/**
 * Utilities for tenant type resolution — NO server-side dependencies.
 * Safe to import from both client components and server-side code.
 */

export type TenantType = 'dealer' | 'pyme' | 'government' | 'iso_puro';

export function normalizeTenantType(value: unknown): TenantType | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'iso_government') return 'government';

  if (
    normalized === 'dealer' ||
    normalized === 'pyme' ||
    normalized === 'government' ||
    normalized === 'iso_puro'
  ) {
    return normalized;
  }

  return null;
}

export function shouldAutoInstallCrmForTenantType(tenantType: unknown): boolean {
  const normalized = normalizeTenantType(tenantType);
  return normalized === 'dealer' || normalized === 'pyme';
}
