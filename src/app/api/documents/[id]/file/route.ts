import { withAuth } from '@/lib/api/withAuth';
import { DocumentService } from '@/services/documents/DocumentService';
import { NextResponse } from 'next/server';

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

      const formData = await request.formData();
      const file = formData.get('file') as File;
      const userId = auth.uid;

      if (!file) {
        return NextResponse.json(
          { error: 'No se proporciono archivo' },
          { status: 400 }
        );
      }

      const downloadURL = await DocumentService.uploadFile(id, file, userId);
      return NextResponse.json({ url: downloadURL });
    } catch (error) {
      console.error('[API] Error completo al subir archivo:', error);
      if (error instanceof Error) {
        if (
          error.message.includes('tipo') ||
          error.message.includes('tamano')
        ) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        return NextResponse.json(
          { error: `Error al subir archivo: ${error.message}` },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'Error desconocido al subir archivo' },
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

      const url = await DocumentService.downloadFile(id, auth.uid);
      return NextResponse.json({ url });
    } catch (error) {
      console.error('Error downloading file:', error);
      return NextResponse.json(
        { error: 'Error al descargar archivo' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
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
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (current as any).organization_id &&
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await DocumentService.deleteFile(id);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting file:', error);
      return NextResponse.json(
        { error: 'Error al eliminar archivo' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
