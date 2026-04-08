import { withAuth } from '@/lib/api/withAuth';
import { DocumentService } from '@/services/documents/DocumentService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const POST = withAuth(
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
      const { reason } = z
        .object({
          reason: z.string().min(1, 'Change reason is required'),
          userId: z.string().optional(),
        })
        .parse(body);

      const newVersion = await DocumentService.createVersion(
        id,
        reason,
        auth.uid
      );
      return NextResponse.json(newVersion, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Datos invalidos', details: error.issues },
          { status: 400 }
        );
      }

      console.error('Error creating document version:', error);
      return NextResponse.json(
        { error: 'Error al crear version del documento' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const GET = withAuth(
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
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (current as any).organization_id &&
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const versions = await DocumentService.getVersionHistory(id);
      return NextResponse.json(versions);
    } catch (error) {
      console.error('Error getting document versions:', error);
      return NextResponse.json(
        { error: 'Error al obtener historial de versiones' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);
