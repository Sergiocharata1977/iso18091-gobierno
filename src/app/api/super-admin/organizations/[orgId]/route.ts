import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { SUPER_ADMIN_AUTH_OPTIONS } from '@/lib/api/superAdminAuth';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_request, { params }) => {
  try {
    const { orgId } = await params;
    const db = getAdminFirestore();
    const orgDoc = await db.collection('organizations').doc(orgId).get();

    if (!orgDoc.exists) {
      return NextResponse.json(
        { error: 'Organizacion no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      organization: {
        id: orgDoc.id,
        ...orgDoc.data(),
      },
    });
  } catch (error) {
    console.error('Error al obtener organizacion:', error);
    return NextResponse.json(
      { error: 'Error al obtener organizacion' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);

export const PATCH = withAuth(async (request, { params }) => {
  try {
    const { orgId } = await params;
    const db = getAdminFirestore();
    const data = await request.json();

    await db
      .collection('organizations')
      .doc(orgId)
      .update({
        ...data,
        updated_at: new Date(),
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al actualizar organizacion:', error);
    return NextResponse.json(
      { error: 'Error al actualizar organizacion' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);

export const DELETE = withAuth(async (_request, { params }) => {
  try {
    const { orgId } = await params;
    const db = getAdminFirestore();
    await db.collection('organizations').doc(orgId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar organizacion:', error);
    return NextResponse.json(
      { error: 'Error al eliminar organizacion' },
      { status: 500 }
    );
  }
}, SUPER_ADMIN_AUTH_OPTIONS);
