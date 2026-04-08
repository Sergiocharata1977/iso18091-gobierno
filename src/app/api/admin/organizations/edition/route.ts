import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import type { Edition } from '@/types/edition';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const patchBodySchema = z.object({
  organization_id: z.string().trim().min(1).optional(),
  organizationId: z.string().trim().min(1).optional(),
  orgId: z.string().trim().min(1).optional(),
  org: z.string().trim().min(1).optional(),
  edition: z.enum(['enterprise', 'government']),
});

function getRequestedOrganizationId(body: z.infer<typeof patchBodySchema>) {
  return body.organization_id || body.organizationId || body.orgId || body.org;
}

export const PATCH = withAuth(
  async (request, _context, auth) => {
    try {
      const rawBody = await request.json();
      const body = patchBodySchema.parse(rawBody);

      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        getRequestedOrganizationId(body),
        {
          requireOrg: true,
        }
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const apiError = toOrganizationApiError(orgScope);
        return NextResponse.json(
          { success: false, error: apiError.error, errorCode: apiError.errorCode },
          { status: apiError.status }
        );
      }

      const orgId = orgScope.organizationId;
      const edition: Edition = body.edition;
      const db = getAdminFirestore();
      const orgRef = db.collection('organizations').doc(orgId);
      const orgDoc = await orgRef.get();

      if (!orgDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Organizacion no encontrada' },
          { status: 404 }
        );
      }

      await orgRef.set(
        {
          edition,
          updated_at: new Date(),
        },
        { merge: true }
      );

      return NextResponse.json({ success: true, edition });
    } catch (error) {
      console.error('[admin/organizations/edition][PATCH] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudo actualizar la edicion de la organizacion',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['super_admin'] }
);
