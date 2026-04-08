import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { UpdateClasificacionesClienteSchema } from '@/lib/schemas/crm-clasificacion-schemas';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;
const COLLECTION = 'crm_organizaciones';

async function getScopedDoc(id: string, organizationId: string) {
  const db = getAdminFirestore();
  const doc = await db.collection(COLLECTION).doc(id).get();

  if (!doc.exists) {
    return NextResponse.json(
      { success: false, error: 'Cliente no encontrado' },
      { status: 404 }
    );
  }

  const data = doc.data() || {};
  if (String(data.organization_id || '') !== organizationId) {
    return NextResponse.json(
      { success: false, error: 'Acceso denegado' },
      { status: 403 }
    );
  }

  return { doc, data };
}

export const PATCH = withAuth(
  async (request, context, auth) => {
    try {
      const { id } = await context.params;
      const body = UpdateClasificacionesClienteSchema.parse(
        await request.json()
      );
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        request.nextUrl.searchParams.get('organization_id')
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const error = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'Acceso denegado',
        });
        return NextResponse.json(
          { success: false, error: error.error, errorCode: error.errorCode },
          { status: error.status }
        );
      }

      const scopedDoc = await getScopedDoc(id, orgScope.organizationId);
      if (scopedDoc instanceof NextResponse) {
        return scopedDoc;
      }

      const updatedAt = new Date().toISOString();
      await scopedDoc.doc.ref.set(
        {
          classifications: body.classifications,
          updated_at: updatedAt,
          updated_by: auth.uid,
        },
        { merge: true }
      );

      return NextResponse.json({
        success: true,
        data: {
          id: scopedDoc.doc.id,
          classifications: body.classifications,
          updated_at: updatedAt,
        },
        message: 'Clasificaciones del cliente actualizadas exitosamente',
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[crm/clientes/:id/clasificaciones][PATCH] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : 'No se pudieron actualizar las clasificaciones',
        },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: [...WRITE_ROLES] }
);
