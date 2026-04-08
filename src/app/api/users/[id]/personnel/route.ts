import { withAuth } from '@/lib/api/withAuth';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id: userId } = await params;
      const { personnel_id } = await request.json();
      const db = getAdminFirestore();

      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
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

      if (personnel_id) {
        const personnelDoc = await db
          .collection('personnel')
          .doc(personnel_id)
          .get();
        if (!personnelDoc.exists) {
          return NextResponse.json(
            { error: 'Personal no encontrado' },
            { status: 404 }
          );
        }

        const personnelData = personnelDoc.data() as any;
        if (
          auth.role !== 'super_admin' &&
          auth.organizationId &&
          personnelData.organization_id !== auth.organizationId
        ) {
          return NextResponse.json(
            { error: 'Acceso denegado' },
            { status: 403 }
          );
        }

        const existingUsers = await db
          .collection('users')
          .where('personnel_id', '==', personnel_id)
          .get();

        if (!existingUsers.empty && existingUsers.docs[0].id !== userId) {
          const existingUserData = existingUsers.docs[0].data() as any;
          return NextResponse.json(
            {
              error: 'Este personal ya esta vinculado a otro usuario',
              existingUser: existingUserData.email,
            },
            { status: 400 }
          );
        }
      }

      await userRef.update({
        personnel_id: personnel_id || null,
        updated_at: new Date(),
      });

      try {
        const firebaseAuth = getAdminAuth();
        const user = await firebaseAuth.getUser(userId);
        const currentClaims = user.customClaims || {};
        await firebaseAuth.setCustomUserClaims(userId, {
          ...currentClaims,
          personnelId: personnel_id || null,
        });
      } catch (authError) {
        console.error(
          '[API /users/[id]/personnel] Error updating customClaims:',
          authError
        );
      }

      return NextResponse.json({
        success: true,
        message: personnel_id
          ? 'Personal vinculado exitosamente'
          : 'Personal desvinculado exitosamente',
      });
    } catch (error) {
      console.error('Error updating user personnel:', error);
      return NextResponse.json(
        { error: 'Error al actualizar la vinculacion' },
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

      const personnelId = userData.personnel_id;
      if (!personnelId) {
        return NextResponse.json({ personnel: null });
      }

      const personnelDoc = await db
        .collection('personnel')
        .doc(personnelId)
        .get();
      if (!personnelDoc.exists) {
        return NextResponse.json({ personnel: null });
      }

      return NextResponse.json({
        personnel: { id: personnelDoc.id, ...personnelDoc.data() },
      });
    } catch (error) {
      console.error('Error fetching user personnel:', error);
      return NextResponse.json(
        { error: 'Error al obtener el personal vinculado' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
