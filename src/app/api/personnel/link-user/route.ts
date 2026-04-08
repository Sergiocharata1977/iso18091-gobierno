import { withAuth } from '@/lib/api/withAuth';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (request, _context, authCtx) => {
    try {
      const { userId, personnelId } = await request.json();
      if (!userId || !personnelId) {
        return NextResponse.json(
          { error: 'userId y personnelId son requeridos' },
          { status: 400 }
        );
      }

      const adminAuth = getAdminAuth();
      const db = getAdminFirestore();

      try {
        await adminAuth.getUser(userId);
      } catch {
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        );
      }

      const personnelDoc = await db
        .collection('personnel')
        .doc(personnelId)
        .get();
      if (!personnelDoc.exists) {
        return NextResponse.json(
          { error: 'Personal no encontrado' },
          { status: 404 }
        );
      }

      const personnelData = personnelDoc.data() as any;
      const userDoc = await db.collection('users').doc(userId).get();
      const userData = userDoc.data() as any;

      if (
        authCtx.role !== 'super_admin' &&
        authCtx.organizationId &&
        (personnelData.organization_id !== authCtx.organizationId ||
          userData?.organization_id !== authCtx.organizationId)
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      if (personnelData?.user_id && personnelData.user_id !== userId) {
        return NextResponse.json(
          {
            error: 'Personal ya vinculado',
            message: `Este empleado ya esta vinculado al usuario ${personnelData.user_id}.`,
          },
          { status: 409 }
        );
      }

      if (userData?.personnel_id && userData.personnel_id !== personnelId) {
        return NextResponse.json(
          {
            error: 'Usuario ya vinculado',
            message: `Este usuario ya esta vinculado al personal ${userData.personnel_id}.`,
          },
          { status: 409 }
        );
      }

      const authUser = await adminAuth.getUser(userId);
      await db.collection('personnel').doc(personnelId).update({
        user_id: userId,
        tiene_acceso_sistema: true,
        email: authUser.email,
        updated_at: new Date(),
      });

      await db
        .collection('users')
        .doc(userId)
        .update({ personnel_id: personnelId, updated_at: new Date() });

      await adminAuth.setCustomUserClaims(userId, {
        ...authUser.customClaims,
        personnelId,
      });

      return NextResponse.json({
        success: true,
        message: 'Usuario vinculado exitosamente con el empleado',
        data: { userId, personnelId },
      });
    } catch (error) {
      console.error('[API /personnel/link-user] Error:', error);
      return NextResponse.json(
        {
          error: 'Error al vincular usuario',
          message: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);

export const DELETE = withAuth(
  async (request, _context, authCtx) => {
    try {
      const { userId, personnelId } = await request.json();
      if (!userId && !personnelId) {
        return NextResponse.json(
          { error: 'Debes proporcionar userId o personnelId' },
          { status: 400 }
        );
      }

      const adminAuth = getAdminAuth();
      const db = getAdminFirestore();

      let actualUserId = userId as string | undefined;
      let actualPersonnelId = personnelId as string | undefined;

      if (actualUserId && !actualPersonnelId) {
        const userDoc = await db.collection('users').doc(actualUserId).get();
        actualPersonnelId = userDoc.data()?.personnel_id;
        if (!actualPersonnelId) {
          return NextResponse.json(
            { error: 'Usuario no esta vinculado a ningun personal' },
            { status: 404 }
          );
        }
      }

      if (actualPersonnelId && !actualUserId) {
        const personnelDoc = await db
          .collection('personnel')
          .doc(actualPersonnelId)
          .get();
        actualUserId = personnelDoc.data()?.user_id;
        if (!actualUserId) {
          return NextResponse.json(
            { error: 'Personal no esta vinculado a ningun usuario' },
            { status: 404 }
          );
        }
      }

      const userDoc = await db.collection('users').doc(actualUserId!).get();
      const personnelDoc = await db
        .collection('personnel')
        .doc(actualPersonnelId!)
        .get();
      const userData = userDoc.data() as any;
      const personnelData = personnelDoc.data() as any;

      if (
        authCtx.role !== 'super_admin' &&
        authCtx.organizationId &&
        (userData?.organization_id !== authCtx.organizationId ||
          personnelData?.organization_id !== authCtx.organizationId)
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await db.collection('personnel').doc(actualPersonnelId!).update({
        user_id: null,
        tiene_acceso_sistema: false,
        updated_at: new Date(),
      });

      await db
        .collection('users')
        .doc(actualUserId!)
        .update({ personnel_id: null, updated_at: new Date() });

      const authUser = await adminAuth.getUser(actualUserId!);
      const { personnelId: _personnelId, ...remainingClaims } =
        authUser.customClaims || {};
      void _personnelId;
      await adminAuth.setCustomUserClaims(actualUserId!, remainingClaims);

      return NextResponse.json({
        success: true,
        message: 'Usuario desvinculado exitosamente del empleado',
        data: { userId: actualUserId, personnelId: actualPersonnelId },
      });
    } catch (error) {
      console.error('[API /personnel/link-user] Error:', error);
      return NextResponse.json(
        {
          error: 'Error al desvincular usuario',
          message: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
