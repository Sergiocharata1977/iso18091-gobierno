/**
 * Document API Routes - SDK Unified
 *
 * GET /api/sdk/documents/[id] - Get document by ID
 * PUT /api/sdk/documents/[id] - Update document status
 * DELETE /api/sdk/documents/[id] - Delete document
 */

import { AuthContext, withAuth } from '@/lib/api/withAuth';
import { DocumentService } from '@/lib/sdk/modules/documents';
import { NextRequest, NextResponse } from 'next/server';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

function getRequestedOrgId(
  searchParams: URLSearchParams,
  body?: any
): string | null {
  return (
    body?.organization_id ||
    body?.organizationId ||
    body?.orgId ||
    body?.org ||
    searchParams.get('organization_id') ||
    searchParams.get('organizationId') ||
    searchParams.get('orgId') ||
    searchParams.get('org')
  );
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

function isRecordAllowedByOrg(record: any, organizationId: string): boolean {
  const recordOrg = record?.organization_id || record?.organizationId || null;
  return recordOrg === organizationId;
}

export const GET = withAuth(
  async (request: NextRequest, context, auth: AuthContext) => {
    try {
      if (!auth.organizationId) {
        return NextResponse.json(
          {
            error: 'Sin organizacion',
            message: 'Usuario sin organizacion asignada',
          },
          { status: 403 }
        );
      }
      const requestedOrgId = getRequestedOrgId(request.nextUrl.searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;
      const { id } = await context.params;

      if (!id) {
        return NextResponse.json(
          { error: 'ID de documento requerido' },
          { status: 400 }
        );
      }

      const service = new DocumentService();
      const document = await service.getById(id);

      if (!document) {
        return NextResponse.json(
          { error: 'Documento no encontrado' },
          { status: 404 }
        );
      }
      if (!isRecordAllowedByOrg(document, auth.organizationId)) {
        return NextResponse.json(
          {
            error: 'Acceso denegado',
            message: 'No puedes acceder a recursos de otra organizacion',
          },
          { status: 403 }
        );
      }

      return NextResponse.json({ document });
    } catch (error) {
      const { id } = await context.params;
      console.error(`Error in GET /api/sdk/documents/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al obtener documento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const PUT = withAuth(
  async (request: NextRequest, context, auth: AuthContext) => {
    try {
      if (!auth.organizationId) {
        return NextResponse.json(
          {
            error: 'Sin organizacion',
            message: 'Usuario sin organizacion asignada',
          },
          { status: 403 }
        );
      }
      const { id } = await context.params;
      const body = await request.json();
      const requestedOrgId = getRequestedOrgId(
        request.nextUrl.searchParams,
        body
      );
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      if (!id) {
        return NextResponse.json(
          { error: 'ID de documento requerido' },
          { status: 400 }
        );
      }

      const { status } = body;
      if (!status) {
        return NextResponse.json(
          { error: 'Estado requerido' },
          { status: 400 }
        );
      }

      const service = new DocumentService();
      const document = await service.getById(id);

      if (!document) {
        return NextResponse.json(
          { error: 'Documento no encontrado' },
          { status: 404 }
        );
      }
      if (!isRecordAllowedByOrg(document, auth.organizationId)) {
        return NextResponse.json(
          {
            error: 'Acceso denegado',
            message: 'No puedes modificar recursos de otra organizacion',
          },
          { status: 403 }
        );
      }

      await service.updateStatus(id, status, auth.uid);

      return NextResponse.json({
        message: 'Estado del documento actualizado exitosamente',
        id,
        status,
      });
    } catch (error) {
      const { id } = await context.params;
      console.error(`Error in PUT /api/sdk/documents/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al actualizar documento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const DELETE = withAuth(
  async (request: NextRequest, context, auth: AuthContext) => {
    try {
      if (!auth.organizationId) {
        return NextResponse.json(
          {
            error: 'Sin organizacion',
            message: 'Usuario sin organizacion asignada',
          },
          { status: 403 }
        );
      }
      const requestedOrgId = getRequestedOrgId(request.nextUrl.searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;
      const { id } = await context.params;

      if (!id) {
        return NextResponse.json(
          { error: 'ID de documento requerido' },
          { status: 400 }
        );
      }

      const service = new DocumentService();
      const document = await service.getById(id);

      if (!document) {
        return NextResponse.json(
          { error: 'Documento no encontrado' },
          { status: 404 }
        );
      }
      if (!isRecordAllowedByOrg(document, auth.organizationId)) {
        return NextResponse.json(
          {
            error: 'Acceso denegado',
            message: 'No puedes eliminar recursos de otra organizacion',
          },
          { status: 403 }
        );
      }

      await service.delete(id);

      return NextResponse.json({
        message: 'Documento eliminado exitosamente',
        id,
      });
    } catch (error) {
      const { id } = await context.params;
      console.error(`Error in DELETE /api/sdk/documents/${id}:`, error);
      return NextResponse.json(
        {
          error: 'Error al eliminar documento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
