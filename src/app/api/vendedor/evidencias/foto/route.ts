import { withAuth } from '@/lib/api/withAuth';
import { adminStorage } from '@/firebase/admin';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const metadataStr = formData.get('metadata') as string;

      if (!file) {
        return NextResponse.json(
          { error: 'No se proporciono archivo' },
          { status: 400 }
        );
      }

      const metadata = metadataStr ? JSON.parse(metadataStr) : {};
      const { organizationId, visitaId, clienteId, id } = metadata;

      if (!organizationId || !visitaId || !clienteId) {
        return NextResponse.json(
          { error: 'Faltan datos de metadata' },
          { status: 400 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        organizationId !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const fileName = `${id || Date.now()}.jpg`;
      const storagePath = `organizations/${organizationId}/visitas/${visitaId}/fotos/${fileName}`;

      const bucket = adminStorage.bucket();
      const fileRef = bucket.file(storagePath);

      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type || 'image/jpeg',
          metadata: {
            organizationId,
            visitaId,
            clienteId,
            uploadedAt: new Date().toISOString(),
            ...metadata,
          },
        },
      });

      const [url] = await fileRef.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });

      return NextResponse.json({ success: true, url, storagePath, fileName });
    } catch (error) {
      console.error('Error al subir foto:', error);
      return NextResponse.json(
        {
          error: 'Error al subir foto',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);
