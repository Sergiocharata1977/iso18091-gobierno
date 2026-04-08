import { withAuth } from '@/lib/api/withAuth';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { parseUnifiedId } from '@/services/messages/messageMappers';
import { ThreadMetadataService } from '@/services/messages/threadMetadataService';
import { internalNoteSchema } from '@/types/messages';
import { UserRole } from '@/types/auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<Record<string, string>> };

const ALL_ROLES: UserRole[] = [
  'admin',
  'super_admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
];

async function resolveOrgId(request: NextRequest, auth: Parameters<typeof resolveAuthorizedOrganizationId>[0]) {
  const organizationIdParam =
    request.nextUrl.searchParams.get('organization_id') || undefined;
  return resolveAuthorizedOrganizationId(auth, organizationIdParam);
}

async function resolveUnifiedId(context: RouteContext): Promise<string | null> {
  const { id } = await context.params;
  const unifiedId = decodeURIComponent(id || '');
  return parseUnifiedId(unifiedId) ? unifiedId : null;
}

export const POST = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const scope = await resolveOrgId(request, auth);
      if (!scope.ok || !scope.organizationId) {
        const error = toOrganizationApiError(scope, {
          defaultStatus: 403,
          defaultError: 'Acceso denegado',
        });
        return NextResponse.json(
          { success: false, error: error.error, errorCode: error.errorCode },
          { status: error.status }
        );
      }

      const unifiedId = await resolveUnifiedId(context);
      if (!unifiedId) {
        return NextResponse.json(
          { success: false, error: 'ID invalido' },
          { status: 400 }
        );
      }

      const body = internalNoteSchema.parse(await request.json());
      const authWithOptionalName = auth as typeof auth & { name?: string };
      const note = await ThreadMetadataService.addInternalNote(
        scope.organizationId,
        unifiedId,
        body.content,
        auth.uid,
        authWithOptionalName.name?.trim() || auth.email
      );

      return NextResponse.json({
        success: true,
        data: note,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[messages/[id]/notes][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear la nota interna' },
        { status: 500 }
      );
    }
  },
  { roles: [...ALL_ROLES] }
);

export const GET = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const scope = await resolveOrgId(request, auth);
      if (!scope.ok || !scope.organizationId) {
        const error = toOrganizationApiError(scope, {
          defaultStatus: 403,
          defaultError: 'Acceso denegado',
        });
        return NextResponse.json(
          { success: false, error: error.error, errorCode: error.errorCode },
          { status: error.status }
        );
      }

      const unifiedId = await resolveUnifiedId(context);
      if (!unifiedId) {
        return NextResponse.json(
          { success: false, error: 'ID invalido' },
          { status: 400 }
        );
      }

      const notes = await ThreadMetadataService.listInternalNotes(
        scope.organizationId,
        unifiedId
      );

      return NextResponse.json({
        success: true,
        data: notes,
      });
    } catch (error) {
      console.error('[messages/[id]/notes][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron listar las notas internas' },
        { status: 500 }
      );
    }
  },
  { roles: [...ALL_ROLES] }
);
