import type { InfraAsset, MaintenanceRecord } from '@/types/iso-infrastructure';

export const INFRASTRUCTURE_COLLECTION = 'infrastructure_assets';

export const INFRA_ASSET_TYPES: InfraAsset['type'][] = [
  'building',
  'equipment',
  'software',
  'transport',
  'other',
];

export const INFRA_ASSET_STATUSES: InfraAsset['status'][] = [
  'active',
  'maintenance',
  'inactive',
  'disposed',
];

export const MAINTENANCE_TYPES: MaintenanceRecord['type'][] = [
  'preventive',
  'corrective',
];

export function isInfraAssetType(value: unknown): value is InfraAsset['type'] {
  return (
    typeof value === 'string' && INFRA_ASSET_TYPES.includes(value as never)
  );
}

export function isInfraAssetStatus(
  value: unknown
): value is InfraAsset['status'] {
  return (
    typeof value === 'string' && INFRA_ASSET_STATUSES.includes(value as never)
  );
}

export function isMaintenanceType(
  value: unknown
): value is MaintenanceRecord['type'] {
  return (
    typeof value === 'string' && MAINTENANCE_TYPES.includes(value as never)
  );
}

export function sanitizeUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => sanitizeUndefined(item)) as T;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, sanitizeUndefined(item)])
    ) as T;
  }

  return value;
}
