import { withAuth } from '@/lib/api/withAuth';
import { DocumentStatusSchema } from '@/lib/validations/documents';
import { DocumentService } from '@/services/documents/DocumentService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const PATCH = withAuth(
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
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (current as any).organization_id &&
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();
      const { status } = z
        .object({ status: DocumentStatusSchema, userId: z.string().optional() })
        .parse(body);

      const document = await DocumentService.changeStatus(id, status, auth.uid);
      return NextResponse.json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Datos invalidos', details: error.issues },
          { status: 400 }
        );
      }

      if (error instanceof Error && error.message.includes('transicion')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      console.error('Error changing document status:', error);
      return NextResponse.json(
        { error: 'Error al cambiar estado del documento' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
