import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const db = getAdminFirestore();

      const positionDoc = await db.collection('positions').doc(id).get();
      if (!positionDoc.exists) {
        return NextResponse.json(
          { error: 'Puesto no encontrado' },
          { status: 404 }
        );
      }

      const position = { id: positionDoc.id, ...(positionDoc.data() as any) };
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        position.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const personnelSnap = await db
        .collection('personnel')
        .where('organization_id', '==', position.organization_id)
        .get();

      const personnel = personnelSnap.docs
        .filter(doc => {
          const data = doc.data() as any;
          return data.puesto_id === id || data.puesto === id;
        })
        .map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            fecha_nacimiento: data.fecha_nacimiento?.toDate?.(),
            fecha_contratacion: data.fecha_contratacion?.toDate?.(),
            fecha_inicio_ventas: data.fecha_inicio_ventas?.toDate?.(),
            created_at: data.created_at?.toDate?.() || new Date(),
            updated_at: data.updated_at?.toDate?.() || new Date(),
          };
        })
        .sort((a, b) => (a.apellidos || '').localeCompare(b.apellidos || ''));

      return NextResponse.json(personnel);
    } catch (error) {
      console.error('Error getting personnel in position:', error);
      return NextResponse.json(
        { error: 'Error al obtener personal del puesto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
