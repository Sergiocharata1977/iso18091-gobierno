import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const PUT = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const db = getAdminFirestore();
      const currentDoc = await db.collection('positions').doc(id).get();
      const current = currentDoc.exists
        ? ({
            id: currentDoc.id,
            ...(currentDoc.data() as Record<string, unknown>),
          } as Record<string, unknown>)
        : null;

      if (!current) {
        return NextResponse.json(
          { error: 'Puesto no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        current.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json(
        {
          error:
            'Las asignaciones por puesto quedaron en modo referencia. Use Mi Panel para administrar asignaciones por persona.',
        },
        { status: 409 }
      );
    } catch (error) {
      console.error('Error blocking legacy position assignments:', error);
      return NextResponse.json(
        { error: 'Error al validar asignaciones legacy del puesto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
