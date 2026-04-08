import { withAuth } from '@/lib/api/withAuth';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { roleToTipoPersonal } from '@/lib/utils/personnel-role-mapping';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (request, _context, authCtx) => {
    try {
      const { userId, email, nombres, apellidos, role } = await request.json();

      if (!userId || !email) {
        return NextResponse.json(
          { error: 'userId y email son requeridos' },
          { status: 400 }
        );
      }

      const adminAuth = getAdminAuth();
      const db = getAdminFirestore();

      try {
        await adminAuth.getUser(userId);
      } catch {
        return NextResponse.json(
          { error: 'Usuario no encontrado en Firebase Auth' },
          { status: 404 }
        );
      }

      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return NextResponse.json(
          { error: 'Usuario no encontrado en Firestore' },
          { status: 404 }
        );
      }

      const userData = userDoc.data() as any;
      if (
        authCtx.role !== 'super_admin' &&
        authCtx.organizationId &&
        userData.organization_id !== authCtx.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      if (userData?.personnel_id) {
        return NextResponse.json(
          { error: 'El usuario ya tiene personal vinculado' },
          { status: 409 }
        );
      }

      const existingPersonnel = await db
        .collection('personnel')
        .where('email', '==', email)
        .limit(1)
        .get();
      if (!existingPersonnel.empty) {
        const personnelDoc = existingPersonnel.docs[0];
        const personnelData = personnelDoc.data() as any;
        if (
          authCtx.role !== 'super_admin' &&
          authCtx.organizationId &&
          personnelData.organization_id !== authCtx.organizationId
        ) {
          return NextResponse.json(
            { error: 'Acceso denegado' },
            { status: 403 }
          );
        }

        await db
          .collection('users')
          .doc(userId)
          .update({ personnel_id: personnelDoc.id, updated_at: new Date() });
        await db.collection('personnel').doc(personnelDoc.id).update({
          user_id: userId,
          tiene_acceso_sistema: true,
          updated_at: new Date(),
        });

        await adminAuth.setCustomUserClaims(userId, {
          role: role || 'operario',
          personnelId: personnelDoc.id,
        });

        return NextResponse.json({
          success: true,
          message: 'Personal existente vinculado al usuario',
          personnelId: personnelDoc.id,
          linked: true,
        });
      }

      const organizationId = userData.organization_id;
      if (!organizationId) {
        return NextResponse.json(
          { error: 'El usuario no tiene una organizacion asignada' },
          { status: 400 }
        );
      }

      const personnelData = {
        nombres: nombres || email.split('@')[0],
        apellidos: apellidos || '',
        email,
        estado: 'Activo' as const,
        tipo_personal: roleToTipoPersonal(role),
        fecha_ingreso: new Date(),
        tiene_acceso_sistema: true,
        user_id: userId,
        organization_id: organizationId,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const personnelRef = await db.collection('personnel').add(personnelData);
      const personnelId = personnelRef.id;

      await db
        .collection('users')
        .doc(userId)
        .update({ personnel_id: personnelId, updated_at: new Date() });
      await adminAuth.setCustomUserClaims(userId, {
        role: role || 'operario',
        personnelId,
      });

      return NextResponse.json({
        success: true,
        message: 'Personal creado y vinculado exitosamente',
        personnelId,
        created: true,
      });
    } catch (error) {
      console.error('[API /personnel/auto-create] Error:', error);
      return NextResponse.json(
        {
          error: 'Error al crear personal',
          message: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
