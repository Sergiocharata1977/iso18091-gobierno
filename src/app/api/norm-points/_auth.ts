import { AuthContext } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';

export const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;

export const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

export const ADMIN_ROLES = ['admin', 'super_admin'] as const;

export function ensureOrganization(auth: AuthContext): NextResponse | null {
  if (auth.organizationId) return null;
  return NextResponse.json(
    {
      error: 'Sin organizacion',
      message: 'Usuario sin organizacion asignada',
    },
    { status: 403 }
  );
}

export function getRequestedOrgId(
  searchParams: URLSearchParams
): string | null {
  return (
    searchParams.get('organization_id') ||
    searchParams.get('organizationId') ||
    searchParams.get('orgId') ||
    searchParams.get('org')
  );
}

export function getRequestedOrgIdFromBody(
  body: Record<string, unknown>
): string | null {
  const requestedOrgId =
    body.organization_id ?? body.organizationId ?? body.orgId ?? body.org;
  return typeof requestedOrgId === 'string' && requestedOrgId.length > 0
    ? requestedOrgId
    : null;
}

export function validateRequestedOrg(
  requestedOrgId: string | null,
  auth: AuthContext
): NextResponse | null {
  if (!requestedOrgId) return null;
  if (requestedOrgId !== auth.organizationId) {
    return NextResponse.json(
      {
        error: 'Acceso denegado',
        message: 'No puedes operar sobre otra organizacion',
      },
      { status: 403 }
    );
  }
  return null;
}

export function getRecordOrganizationId(record: unknown): string | null {
  if (!record || typeof record !== 'object') return null;
  const raw = record as Record<string, unknown>;
  const recordOrg =
    raw.organization_id || raw.organizationId || raw.orgId || raw.org;
  return typeof recordOrg === 'string' && recordOrg.length > 0
    ? recordOrg
    : null;
}

export function isRecordAllowedByOrg(
  record: unknown,
  organizationId: string
): boolean {
  return getRecordOrganizationId(record) === organizationId;
}

export function filterRecordsByOrg<T>(
  records: T[],
  organizationId: string
): T[] {
  return records.filter(record => isRecordAllowedByOrg(record, organizationId));
}
