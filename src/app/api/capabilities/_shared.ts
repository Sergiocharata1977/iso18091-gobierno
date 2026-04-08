import type { AuthContext } from '@/lib/api/withAuth';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { NextRequest, NextResponse } from 'next/server';

export interface CapabilityRouteContext {
  params: Promise<Record<string, string>>;
}

export async function resolveCapabilityId(
  context: CapabilityRouteContext
): Promise<string> {
  const { id } = await context.params;
  return id || '';
}

export async function resolveCapabilityOrganizationId(params: {
  request: NextRequest;
  auth: AuthContext;
  organizationIdFromBody?: string;
}): Promise<
  { ok: true; organizationId: string } | { ok: false; response: NextResponse }
> {
  const requestedOrganizationId =
    params.organizationIdFromBody ||
    params.request.nextUrl.searchParams.get('organization_id');

  const scope = await resolveAuthorizedOrganizationId(
    params.auth,
    requestedOrganizationId
  );

  if (!scope.ok || !scope.organizationId) {
    const error = toOrganizationApiError(scope, {
      defaultStatus: 403,
      defaultError: 'Acceso denegado',
    });
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: error.error, errorCode: error.errorCode },
        { status: error.status }
      ),
    };
  }

  return {
    ok: true,
    organizationId: scope.organizationId,
  };
}

export function capabilityErrorResponse(
  error: unknown,
  fallbackMessage: string,
  logPrefix: string
): NextResponse {
  if (error instanceof Error) {
    if (error.message.includes('not found for organization')) {
      return NextResponse.json(
        { success: false, error: 'Capability instalada no encontrada' },
        { status: 404 }
      );
    }

    if (
      error.message.includes('Capability is required by:') ||
      error.message.includes('Missing capability dependencies:')
    ) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      );
    }
  }

  console.error(logPrefix, error);
  return NextResponse.json(
    { success: false, error: fallbackMessage },
    { status: 500 }
  );
}
