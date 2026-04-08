import { getAdminFirestore } from '@/lib/firebase/admin';
import type { AuthContext } from '@/lib/api/withAuth';
import { withAuth } from '@/lib/api/withAuth';
import { requireCapability } from '@/lib/plugins/PluginSecurityMiddleware';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import type { DesignProject, DesignProjectInput } from '@/types/iso-design';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const COLLECTION = 'design_projects';
const CAPABILITY_ID = 'iso_design_development';

const designProjectInputSchema = z.object({
  organizationId: z.string().min(1).optional(),
  name: z.string().trim().min(1, 'El nombre es requerido'),
  description: z.string().trim().default(''),
  productType: z.enum(['product', 'service']),
  status: z
    .enum(['planning', 'design', 'verification', 'validation', 'completed'])
    .default('planning'),
  designInputs: z.array(z.string().trim().min(1)).default([]),
  designOutputs: z.array(z.string().trim().min(1)).default([]),
  reviewDates: z.array(z.string().trim().min(1)).default([]),
  verificationDate: z.string().trim().optional(),
  validationDate: z.string().trim().optional(),
  responsibleId: z.string().trim().min(1, 'El responsable es requerido'),
});

function normalizeStringArray(values?: string[]) {
  return (values || []).map(value => value.trim()).filter(Boolean);
}

function normalizeProject(
  id: string,
  data: Record<string, unknown>
): DesignProject {
  return {
    id,
    organizationId: String(data.organizationId || ''),
    name: String(data.name || ''),
    description: String(data.description || ''),
    productType: (data.productType ||
      'product') as DesignProject['productType'],
    status: (data.status || 'planning') as DesignProject['status'],
    designInputs: Array.isArray(data.designInputs)
      ? (data.designInputs as string[])
      : [],
    designOutputs: Array.isArray(data.designOutputs)
      ? (data.designOutputs as string[])
      : [],
    reviewDates: Array.isArray(data.reviewDates)
      ? (data.reviewDates as string[])
      : [],
    verificationDate:
      typeof data.verificationDate === 'string'
        ? data.verificationDate
        : undefined,
    validationDate:
      typeof data.validationDate === 'string' ? data.validationDate : undefined,
    responsibleId: String(data.responsibleId || ''),
    createdAt: String(data.createdAt || ''),
    updatedAt: String(data.updatedAt || ''),
    createdBy: String(data.createdBy || ''),
  };
}

async function resolveOrgScope(
  request: Request,
  auth: AuthContext,
  requestedOrganizationId?: string | null
) {
  const orgScope = await resolveAuthorizedOrganizationId(
    auth,
    requestedOrganizationId ||
      new URL(request.url).searchParams.get('organizationId'),
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

  try {
    await requireCapability(orgScope.organizationId, CAPABILITY_ID);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Capability no habilitada';
    return NextResponse.json(
      { success: false, error: message, errorCode: 'CAPABILITY_DISABLED' },
      { status: 403 }
    );
  }

  return orgScope.organizationId;
}

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const organizationId = await resolveOrgScope(request, auth);
      if (organizationId instanceof NextResponse) {
        return organizationId;
      }

      const db = getAdminFirestore();
      const snapshot = await db
        .collection(COLLECTION)
        .where('organizationId', '==', organizationId)
        .orderBy('updatedAt', 'desc')
        .get();

      return NextResponse.json({
        success: true,
        data: snapshot.docs.map(doc => normalizeProject(doc.id, doc.data())),
      });
    } catch (error) {
      console.error('[iso-design][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron listar los proyectos' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const rawBody = await request.json();
      const body = designProjectInputSchema.parse(
        rawBody
      ) as DesignProjectInput & {
        organizationId?: string;
      };

      const organizationId = await resolveOrgScope(
        request,
        auth,
        body.organizationId
      );
      if (organizationId instanceof NextResponse) {
        return organizationId;
      }

      const db = getAdminFirestore();
      const now = new Date().toISOString();
      const docRef = db.collection(COLLECTION).doc();
      const payload: DesignProject = {
        id: docRef.id,
        organizationId,
        name: body.name.trim(),
        description: body.description.trim(),
        productType: body.productType,
        status: body.status || 'planning',
        designInputs: normalizeStringArray(body.designInputs),
        designOutputs: normalizeStringArray(body.designOutputs),
        reviewDates: normalizeStringArray(body.reviewDates),
        verificationDate: body.verificationDate?.trim() || undefined,
        validationDate: body.validationDate?.trim() || undefined,
        responsibleId: body.responsibleId.trim(),
        createdAt: now,
        updatedAt: now,
        createdBy: auth.uid,
      };

      await docRef.set(payload);

      return NextResponse.json(
        {
          success: true,
          data: payload,
          message: 'Proyecto de diseno creado exitosamente',
        },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Payload invalido',
            details: error.issues,
          },
          { status: 400 }
        );
      }

      console.error('[iso-design][POST] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear el proyecto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
