// API: /api/ia/context
// Obtiene el contexto del usuario para la aplicacion
// Mantiene compatibilidad con useCurrentUser hook

import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;

function canReadUser(auth: { uid: string; role: string }, userId: string) {
  if (auth.role === 'super_admin') return true;
  if (auth.uid === userId) return true;
  return ['admin', 'gerente', 'jefe', 'auditor'].includes(auth.role);
}

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const userId = searchParams.get('userId') || auth.uid;
      const light = searchParams.get('light') === 'true';

      if (!canReadUser(auth, userId)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const db = getAdminFirestore();
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const userData = userDoc.data();
      const organizationId = userData?.organization_id || auth.organizationId;

      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        organizationId &&
        organizationId !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const user = {
        id: userDoc.id,
        email: userData?.email || '',
        rol: userData?.rol || 'operario',
        organization_id: organizationId,
        personnel_id: userData?.personnel_id || null,
        activo: userData?.activo !== false,
        modulos_habilitados: userData?.modulos_habilitados || [],
        created_at: userData?.created_at?.toDate?.() || new Date(),
        updated_at: userData?.updated_at?.toDate?.() || new Date(),
      };

      if (light) {
        return NextResponse.json({
          success: true,
          user,
          context: null,
        });
      }

      let personnel = null;
      let position = null;
      let department = null;

      if (user.personnel_id) {
        const personnelDoc = await db
          .collection('personnel')
          .doc(user.personnel_id)
          .get();
        if (personnelDoc.exists) {
          const pData = personnelDoc.data();
          personnel = {
            id: personnelDoc.id,
            nombres: pData?.nombres || '',
            apellidos: pData?.apellidos || '',
            email: pData?.email || '',
            tipo: pData?.tipo || '',
          };

          if (pData?.puesto) {
            const posDoc = await db
              .collection('positions')
              .doc(pData.puesto)
              .get();
            if (posDoc.exists) {
              position = { id: posDoc.id, nombre: posDoc.data()?.nombre || '' };
            }
          }

          if (pData?.departamento) {
            const deptDoc = await db
              .collection('departments')
              .doc(pData.departamento)
              .get();
            if (deptDoc.exists) {
              department = {
                id: deptDoc.id,
                nombre: deptDoc.data()?.nombre || '',
              };
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        user,
        context: {
          personnel,
          position,
          department,
        },
      });
    } catch (error) {
      console.error('[API /ia/context] Error:', error);
      return NextResponse.json(
        {
          error: 'Error fetching user context',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
