import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async request => {
    try {
      const body = await request.json();
      const { uid, email, role = 'admin' } = body;

      if (!uid || !email) {
        return NextResponse.json(
          { error: 'uid y email son requeridos' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        return NextResponse.json(
          { error: 'El usuario ya existe' },
          { status: 409 }
        );
      }

      const userData = {
        email,
        personnel_id: '',
        rol: role,
        activo: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      await db.collection('users').doc(uid).set(userData);

      return NextResponse.json({
        user: { id: uid, ...userData },
        message: 'Usuario administrador creado exitosamente',
      });
    } catch (error) {
      console.error('[API /admin/users/create] Error:', error);
      return NextResponse.json(
        {
          error: 'Error al crear usuario administrador',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['super_admin'] }
);
