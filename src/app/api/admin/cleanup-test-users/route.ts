import { withAuth } from '@/lib/api/withAuth';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const DELETE = withAuth(
  async request => {
    try {
      const adminKey = request.headers.get('x-admin-key');
      if (adminKey !== 'delete-test-users-2024') {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }

      const auth = getAdminAuth();
      const db = getAdminFirestore();
      const listUsersResult = await auth.listUsers(1000);
      const testUsers = listUsersResult.users.filter(user =>
        user.email?.startsWith('test-')
      );

      if (testUsers.length === 0) {
        return NextResponse.json({
          message: 'No hay usuarios de test para eliminar',
          deleted: 0,
        });
      }

      const deleted: string[] = [];
      const errors: string[] = [];

      for (const user of testUsers) {
        try {
          const userDoc = await db.collection('users').doc(user.uid).get();
          if (userDoc.exists) {
            await db.collection('users').doc(user.uid).delete();
          }

          await auth.deleteUser(user.uid);
          deleted.push(user.email || user.uid);
        } catch (error) {
          errors.push(`${user.email}: ${error}`);
        }
      }

      return NextResponse.json({
        message: `Eliminados ${deleted.length} usuarios de test`,
        deleted,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      console.error('Error eliminando usuarios:', error);
      return NextResponse.json(
        { error: 'Error interno', details: String(error) },
        { status: 500 }
      );
    }
  },
  { roles: ['super_admin'] }
);
