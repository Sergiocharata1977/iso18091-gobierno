import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { PositionFormData } from '@/types/rrhh';
import { Timestamp } from 'firebase-admin/firestore';
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

      const positionData = positionDoc.data() as any;
      const position = {
        id: positionDoc.id,
        ...positionData,
        created_at: positionData.created_at?.toDate?.() || new Date(),
        updated_at: positionData.updated_at?.toDate?.() || new Date(),
      } as any;

      if (!position) {
        return NextResponse.json(
          { error: 'Puesto no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (position as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const personnelSnap = await db
        .collection('personnel')
        .where('organization_id', '==', position.organization_id)
        .get();
      const personnelInPosition = personnelSnap.docs.filter(d => {
        const p = d.data() as any;
        return p.puesto_id === id || p.puesto === id;
      });

      return NextResponse.json({
        ...position,
        personnel_count: personnelInPosition.length,
      });
    } catch (error) {
      console.error('Error getting position:', error);
      return NextResponse.json(
        { error: 'Error al obtener puesto' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const db = getAdminFirestore();
      const currentDoc = await db.collection('positions').doc(id).get();
      const current = currentDoc.exists
        ? ({ id: currentDoc.id, ...(currentDoc.data() as any) } as any)
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
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();
      const data: Partial<PositionFormData> = {
        nombre: body.nombre,
        descripcion_responsabilidades: body.descripcion_responsabilidades,
        requisitos_experiencia: body.requisitos_experiencia,
        requisitos_formacion: body.requisitos_formacion,
        departamento_id: body.departamento_id,
        reporta_a_id: body.reporta_a_id,
      };

      await db
        .collection('positions')
        .doc(id)
        .update({
          ...Object.fromEntries(
            Object.entries(data).filter(([, v]) => v !== undefined)
          ),
          updated_at: Timestamp.now(),
        });
      return NextResponse.json({ message: 'Puesto actualizado exitosamente' });
    } catch (error) {
      console.error('Error updating position:', error);
      const message =
        error instanceof Error ? error.message : 'Error al actualizar puesto';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const db = getAdminFirestore();
      const currentDoc = await db.collection('positions').doc(id).get();
      const current = currentDoc.exists
        ? ({ id: currentDoc.id, ...(currentDoc.data() as any) } as any)
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
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const personnelSnap = await db
        .collection('personnel')
        .where('organization_id', '==', current.organization_id)
        .get();
      const activePersonnel = personnelSnap.docs.filter(d => {
        const p = d.data() as any;
        const inPosition = p.puesto_id === id || p.puesto === id;
        return inPosition && p.estado === 'Activo';
      });
      if (activePersonnel.length > 0) {
        return NextResponse.json(
          {
            error: `No se puede eliminar. Hay ${activePersonnel.length} persona(s) activa(s) en este puesto`,
          },
          { status: 400 }
        );
      }

      await db.collection('positions').doc(id).delete();
      return NextResponse.json({ message: 'Puesto eliminado exitosamente' });
    } catch (error) {
      console.error('Error deleting position:', error);
      const message =
        error instanceof Error ? error.message : 'Error al eliminar puesto';
      const status = message.includes('persona(s) activa(s)') ? 400 : 500;
      return NextResponse.json({ error: message }, { status });
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
