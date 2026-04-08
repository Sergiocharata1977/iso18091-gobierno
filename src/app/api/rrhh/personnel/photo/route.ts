import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore, getAdminStorage } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const formData = await request.formData();
      const photo = formData.get('photo') as File;
      const personnelId = formData.get('personnelId') as string;

      if (!photo || !personnelId) {
        return NextResponse.json(
          { error: 'Photo and personnelId are required' },
          { status: 400 }
        );
      }
      if (!photo.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'File must be an image' },
          { status: 400 }
        );
      }
      if (photo.size > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: 'File size must be less than 2MB' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const storage = getAdminStorage();

      const personnelRef = db.collection('personnel').doc(personnelId);
      const personnelDoc = await personnelRef.get();
      if (!personnelDoc.exists) {
        return NextResponse.json(
          { error: 'Personnel not found' },
          { status: 404 }
        );
      }

      const personnelData = personnelDoc.data() as any;
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        personnelData.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const extension = photo.type.split('/')[1] || 'jpg';
      const fileName = `personnel/${personnelId}/photo.${extension}`;
      const arrayBuffer = await photo.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const bucket = storage.bucket();
      const file = bucket.file(fileName);
      await file.save(buffer, {
        metadata: {
          contentType: photo.type,
          metadata: {
            personnelId,
            organizationId: personnelData.organization_id || '',
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      await file.makePublic();
      const photoUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

      await personnelRef.update({
        foto: photoUrl,
        updated_at: new Date(),
      });

      return NextResponse.json({
        success: true,
        photoUrl,
        message: 'Foto subida exitosamente',
      });
    } catch (error) {
      console.error('[API /rrhh/personnel/photo] Error:', error);
      return NextResponse.json(
        {
          error: 'Error uploading photo',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const personnelId = searchParams.get('personnelId');
      if (!personnelId) {
        return NextResponse.json(
          { error: 'personnelId is required' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const storage = getAdminStorage();

      const personnelRef = db.collection('personnel').doc(personnelId);
      const personnelDoc = await personnelRef.get();
      if (!personnelDoc.exists) {
        return NextResponse.json(
          { error: 'Personnel not found' },
          { status: 404 }
        );
      }

      const personnelData = personnelDoc.data() as any;
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        personnelData.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      if (personnelData?.foto) {
        try {
          const bucket = storage.bucket();
          const urlParts = personnelData.foto.split('/');
          const filePath = urlParts.slice(4).join('/');
          await bucket.file(filePath).delete();
        } catch (storageError) {
          console.warn('Could not delete photo from storage:', storageError);
        }
      }

      await personnelRef.update({
        foto: null,
        updated_at: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Foto eliminada exitosamente',
      });
    } catch (error) {
      console.error('[API /rrhh/personnel/photo] Delete error:', error);
      return NextResponse.json(
        {
          error: 'Error deleting photo',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
