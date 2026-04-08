import { AuthContext } from '@/lib/api/withAuth';
import { NextResponse } from 'next/server';

export function getRequestedOrgIdFromSearch(
  searchParams: URLSearchParams
): string | null {
  return (
    searchParams.get('organization_id') ||
    searchParams.get('organizationId') ||
    searchParams.get('orgId') ||
    searchParams.get('org')
  );
}

export function getRequestedOrgIdFromBody(body: any): string | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  return (
    body.organization_id ||
    body.organizationId ||
    body.orgId ||
    body.org ||
    null
  );
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

export function getRecordOrgId(record: any): string | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  return (
    record.organization_id ||
    record.organizationId ||
    record.orgId ||
    record.org ||
    null
  );
}

export function isRecordAllowedByOrg(
  record: any,
  organizationId: string
): boolean {
  if (!organizationId) {
    return false;
  }

  const recordOrgId = getRecordOrgId(record);
  if (!recordOrgId) {
    return false;
  }

  return recordOrgId === organizationId;
}
