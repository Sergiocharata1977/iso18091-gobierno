import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id: userId } = await params;
      const body = await request.json();
      const { modulos_habilitados } = body;

      const db = getAdminFirestore();
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const userData = userDoc.data() as any;
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        userData.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await db.collection('users').doc(userId).update({
        modulos_habilitados,
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: 'Modulos actualizados correctamente',
      });
    } catch (error) {
      console.error('Error updating user modules:', error);
      return NextResponse.json(
        { error: 'Error al actualizar modulos' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id: userId } = await params;
      const db = getAdminFirestore();
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const userData = userDoc.data() as any;
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        userData.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json({
        success: true,
        modulos_habilitados: userData.modulos_habilitados || null,
      });
    } catch (error) {
      console.error('Error getting user modules:', error);
      return NextResponse.json(
        { error: 'Error al obtener modulos' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
