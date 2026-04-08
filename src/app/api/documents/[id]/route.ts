import { withAuth } from '@/lib/api/withAuth';
import { DocumentUpdateSchema } from '@/lib/validations/documents';
import { DocumentService } from '@/services/documents/DocumentService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

function denied(auth: any, orgId?: string) {
  return (
    auth.role !== 'super_admin' &&
    auth.organizationId &&
    orgId &&
    orgId !== auth.organizationId
  );
}

function getDocumentOrgId(document: any): string | undefined {
  return document?.organization_id || document?.organizationId || undefined;
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const document = await DocumentService.getById(id);

      if (!document) {
        return NextResponse.json(
          { error: 'Documento no encontrado' },
          { status: 404 }
        );
      }
      if (denied(auth, getDocumentOrgId(document))) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(document);
    } catch (error) {
      console.error('Error getting document:', error);
      return NextResponse.json(
        { error: 'Error al obtener documento' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await DocumentService.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Documento no encontrado' },
          { status: 404 }
        );
      }
      if (denied(auth, getDocumentOrgId(current))) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();
      const validatedData = DocumentUpdateSchema.parse(body);
      const document = await DocumentService.update(id, validatedData);

      return NextResponse.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Datos invalidos', details: error.issues },
          { status: 400 }
        );
      }

      console.error('Error updating document:', error);
      return NextResponse.json(
        { error: 'Error al actualizar documento' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await DocumentService.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Documento no encontrado' },
          { status: 404 }
        );
      }
      if (denied(auth, getDocumentOrgId(current))) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await DocumentService.archive(id);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('[API DELETE] Error completo:', error);
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json(
        { error: 'Error al eliminar documento' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
