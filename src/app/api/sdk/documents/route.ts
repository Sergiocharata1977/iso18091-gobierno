/**
 * Document API Routes - SDK Unified
 *
 * GET /api/sdk/documents - List documents
 * POST /api/sdk/documents - Create document
 */

import { AuthContext, withAuth } from '@/lib/api/withAuth';
import { DocumentService } from '@/lib/sdk/modules/documents';
import { CreateDocumentSchema } from '@/lib/sdk/modules/documents/validations';
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

function getRequestedOrgId(searchParams: URLSearchParams): string | null {
  return (
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
  async (request: NextRequest, _context, auth: AuthContext) => {
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
      const searchParams = request.nextUrl.searchParams;
      const requestedOrgId = getRequestedOrgId(searchParams);
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const service = new DocumentService();
      const allDocuments = await service.getRecentDocuments(1000);
      let documents = allDocuments.filter(doc =>
        isRecordAllowedByOrg(doc, auth.organizationId)
      );

      const status = searchParams.get('status');
      if (status) {
        documents = documents.filter(doc => doc.status === status);
      }

      const category = searchParams.get('category');
      if (category) {
        documents = documents.filter(doc => doc.category === category);
      }

      const createdBy = searchParams.get('createdBy');
      if (createdBy) {
        documents = documents.filter(doc => doc.createdBy === createdBy);
      }

      const tagsParam = searchParams.get('tags');
      if (tagsParam) {
        const tags = tagsParam.split(',');
        documents = documents.filter(doc =>
          tags.some(tag => doc.tags?.includes(tag))
        );
      }

      const search = searchParams.get('search');
      if (search) {
        const searchLower = search.toLowerCase();
        documents = documents.filter(
          doc =>
            doc.title.toLowerCase().includes(searchLower) ||
            doc.description?.toLowerCase().includes(searchLower) ||
            doc.content?.toLowerCase().includes(searchLower)
        );
      }

      const limit = searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 100;
      const offset = searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : 0;
      const paginatedDocuments = documents.slice(offset, offset + limit);

      return NextResponse.json({
        data: paginatedDocuments,
        count: paginatedDocuments.length,
        total: documents.length,
      });
    } catch (error) {
      console.error('Error in GET /api/sdk/documents:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener documentos',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth: AuthContext) => {
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
      const body = await request.json();
      const requestedOrgId =
        body?.organization_id ||
        body?.organizationId ||
        body?.orgId ||
        body?.org ||
        null;
      const orgValidation = validateRequestedOrg(requestedOrgId, auth);
      if (orgValidation) return orgValidation;

      const validatedData = CreateDocumentSchema.parse({
        ...body,
        organization_id: auth.organizationId,
      });

      const service = new DocumentService();
      const documentId = await service.createAndReturnId(
        validatedData as any,
        auth.uid
      );

      return NextResponse.json(
        {
          id: documentId,
          message: 'Documento creado exitosamente',
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error in POST /api/sdk/documents:', error);

      if (error instanceof Error && error.message.includes('validation')) {
        return NextResponse.json(
          { error: 'Datos invalidos', details: error.message },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Error al crear documento',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
