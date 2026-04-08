import { getAdminFirestore } from '@/lib/firebase/admin';
import type { AuthContext } from '@/lib/api/withAuth';
import { withAuth } from '@/lib/api/withAuth';
import { requireCapability } from '@/lib/plugins/PluginSecurityMiddleware';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import type { DesignProject } from '@/types/iso-design';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const COLLECTION = 'design_projects';
const CAPABILITY_ID = 'iso_design_development';

const designProjectUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  productType: z.enum(['product', 'service']).optional(),
  status: z
    .enum(['planning', 'design', 'verification', 'validation', 'completed'])
    .optional(),
  designInputs: z.array(z.string().trim().min(1)).optional(),
  designOutputs: z.array(z.string().trim().min(1)).optional(),
  reviewDates: z.array(z.string().trim().min(1)).optional(),
  verificationDate: z.string().trim().nullable().optional(),
  validationDate: z.string().trim().nullable().optional(),
  responsibleId: z.string().trim().min(1).optional(),
  organizationId: z.never().optional(),
  createdAt: z.never().optional(),
  createdBy: z.never().optional(),
  id: z.never().optional(),
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

async function getScopedProject(id: string, auth: AuthContext) {
  const db = getAdminFirestore();
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) {
    return NextResponse.json(
      { success: false, error: 'Proyecto no encontrado' },
      { status: 404 }
    );
  }

  const project = normalizeProject(doc.id, doc.data() || {});
  const orgScope = await resolveAuthorizedOrganizationId(
    auth,
    project.organizationId,
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

  return { doc, project, organizationId: orgScope.organizationId };
}

export const GET = withAuth(
  async (_request, context, auth) => {
    try {
      const { id } = await context.params;
      const scopedProject = await getScopedProject(id, auth);
      if (scopedProject instanceof NextResponse) {
        return scopedProject;
      }

      return NextResponse.json({
        success: true,
        data: scopedProject.project,
      });
    } catch (error) {
      console.error('[iso-design/:id][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el proyecto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const PUT = withAuth(
  async (request, context, auth) => {
    try {
      const { id } = await context.params;
      const scopedProject = await getScopedProject(id, auth);
      if (scopedProject instanceof NextResponse) {
        return scopedProject;
      }

      const body = designProjectUpdateSchema.parse(await request.json());
      const patch: Partial<DesignProject> = {
        updatedAt: new Date().toISOString(),
      };

      if (body.name !== undefined) patch.name = body.name.trim();
      if (body.description !== undefined) {
        patch.description = body.description.trim();
      }
      if (body.productType !== undefined) patch.productType = body.productType;
      if (body.status !== undefined) patch.status = body.status;
      if (body.designInputs !== undefined) {
        patch.designInputs = normalizeStringArray(body.designInputs);
      }
      if (body.designOutputs !== undefined) {
        patch.designOutputs = normalizeStringArray(body.designOutputs);
      }
      if (body.reviewDates !== undefined) {
        patch.reviewDates = normalizeStringArray(body.reviewDates);
      }
      if (body.verificationDate !== undefined) {
        patch.verificationDate = body.verificationDate?.trim() || undefined;
      }
      if (body.validationDate !== undefined) {
        patch.validationDate = body.validationDate?.trim() || undefined;
      }
      if (body.responsibleId !== undefined) {
        patch.responsibleId = body.responsibleId.trim();
      }

      await scopedProject.doc.ref.set(patch, { merge: true });

      const updated = normalizeProject(scopedProject.doc.id, {
        ...scopedProject.project,
        ...patch,
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Proyecto actualizado exitosamente',
      });
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

      console.error('[iso-design/:id][PUT] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar el proyecto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, context, auth) => {
    try {
      const { id } = await context.params;
      const scopedProject = await getScopedProject(id, auth);
      if (scopedProject instanceof NextResponse) {
        return scopedProject;
      }

      await scopedProject.doc.ref.delete();

      return NextResponse.json({
        success: true,
        message: 'Proyecto eliminado exitosamente',
      });
    } catch (error) {
      console.error('[iso-design/:id][DELETE] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo eliminar el proyecto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
