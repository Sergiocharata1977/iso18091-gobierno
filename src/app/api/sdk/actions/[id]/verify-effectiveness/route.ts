/**
 * Action Verify Effectiveness API Route - SDK Unified
 *
 * PUT /api/sdk/actions/[id]/verify-effectiveness - Verify action effectiveness
 */

import { NextRequest, NextResponse } from 'next/server';
import { ActionService } from '@/lib/sdk/modules/actions';
import { VerifyEffectivenessSchema } from '@/lib/sdk/modules/actions/validations';
import { AuthContext, withAuth } from '@/lib/api/withAuth';

const SENSITIVE_ROLES = ['admin', 'gerente', 'super_admin'] as const;

function requireOrganization(auth: AuthContext): NextResponse | null {
  if (!auth.organizationId) {
    return NextResponse.json(
      {
        error: 'Sin organizacion',
        message: 'Usuario sin organizacion asignada',
      },
      { status: 403 }
    );
  }
  return null;
}

function validateRequestedOrg(
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

async function resolveId(context: {
  params: Promise<Record<string, string>>;
}): Promise<string> {
  const params = await context.params;
  return params.id;
}

export const PUT = withAuth(
  async (request: NextRequest, context, auth: AuthContext) => {
    try {
      const orgError = requireOrganization(auth);
      if (orgError) return orgError;

      const id = await resolveId(context);
      const body = await request.json();

      const requestedOrgId =
        (typeof body?.organization_id === 'string'
          ? body.organization_id
          : null) ||
        (typeof body?.organizationId === 'string'
          ? body.organizationId
          : null) ||
        (typeof body?.orgId === 'string' ? body.orgId : null) ||
        (typeof body?.org === 'string' ? body.org : null) ||
        request.nextUrl.searchParams.get('organization_id') ||
        request.nextUrl.searchParams.get('organizationId') ||
        request.nextUrl.searchParams.get('orgId') ||
        request.nextUrl.searchParams.get('org');
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      if (!id) {
        return NextResponse.json(
          { error: 'ID de acci�n requerido' },
          { status: 400 }
        );
      }

      const validatedData = VerifyEffectivenessSchema.parse(body);

      const service = new ActionService();
      const action = await service.getById(id);

      if (!action) {
        return NextResponse.json(
          { error: 'Acci�n no encontrada' },
          { status: 404 }
        );
      }

      if ((action as any).organization_id !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await service.verifyEffectiveness(id, validatedData, auth.uid);

      return NextResponse.json({
        message: 'Efectividad de acci�n verificada exitosamente',
        id,
        isEffective: validatedData.isEffective,
      });
    } catch (error) {
      const id = await resolveId(context);
      console.error(
        `Error in PUT /api/sdk/actions/${id}/verify-effectiveness:`,
        error
      );

      if (error instanceof Error && error.message.includes('validation')) {
        return NextResponse.json(
          { error: 'Datos inv�lidos', details: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Error al verificar efectividad de acci�n',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...SENSITIVE_ROLES] }
);
