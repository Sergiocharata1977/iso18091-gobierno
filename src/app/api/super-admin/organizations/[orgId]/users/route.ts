import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, { params }) => {
  try {
    const { orgId } = await params;
    const db = getAdminFirestore();

    const usersSnapshot = await db
      .collection('users')
      .where('organization_id', '==', orgId)
      .get();

    const users = usersSnapshot.docs.map(
      (doc: FirebaseFirestore.QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.() || null,
        updated_at: doc.data().updated_at?.toDate?.() || null,
      })
    );

    return NextResponse.json({ users, total: users.length });
  } catch (error) {
    console.error('Error fetching organization users:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);

export const POST = withAuth(async (request, { params }) => {
  try {
    const { orgId } = await params;
    const db = getAdminFirestore();
    const body = await request.json();
    const { userId, rol } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    await db
      .collection('users')
      .doc(userId)
      .update({
        organization_id: orgId,
        rol: rol || 'operario',
        activo: true,
        updated_at: new Date(),
      });

    return NextResponse.json({ success: true, message: 'Usuario asignado' });
  } catch (error) {
    console.error('Error assigning user to organization:', error);
    return NextResponse.json(
      { error: 'Error al asignar usuario' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);

export const PATCH = withAuth(async request => {
  try {
    const db = getAdminFirestore();
    const body = await request.json();
    const { userId, rol, activo } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = { updated_at: new Date() };
    if (rol !== undefined) updateData.rol = rol;
    if (activo !== undefined) updateData.activo = activo;

    await db.collection('users').doc(userId).update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Usuario actualizado',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);

export const DELETE = withAuth(async request => {
  try {
    const db = getAdminFirestore();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId es requerido' },
        { status: 400 }
      );
    }

    await db.collection('users').doc(userId).update({
      organization_id: null,
      updated_at: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Usuario removido de la organizacion',
    });
  } catch (error) {
    console.error('Error removing user from organization:', error);
    return NextResponse.json(
      { error: 'Error al remover usuario' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
