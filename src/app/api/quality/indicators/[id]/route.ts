import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { qualityIndicatorSchema } from '@/lib/validations/quality';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

const COLLECTION_NAME = 'quality_indicators';
const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

function denied(
  auth: { role: string; organizationId: string },
  orgId?: string
) {
  return (
    auth.role !== 'super_admin' && !!orgId && orgId !== auth.organizationId
  );
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const db = getAdminFirestore();
      const doc = await db.collection(COLLECTION_NAME).doc(id).get();

      if (!doc.exists) {
        return NextResponse.json(
          { error: 'Indicador de calidad no encontrado' },
          { status: 404 }
        );
      }

      const data = doc.data()!;
      if (denied(auth, data.organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json({
        id: doc.id,
        ...data,
        created_at:
          data.created_at?.toDate?.().toISOString() || data.created_at,
        updated_at:
          data.updated_at?.toDate?.().toISOString() || data.updated_at,
        last_measurement_date:
          data.last_measurement_date?.toDate?.().toISOString() ||
          data.last_measurement_date,
      });
    } catch (error) {
      console.error('Error in quality indicator GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener indicador de calidad' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const PUT = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const db = getAdminFirestore();
      const current = await db.collection(COLLECTION_NAME).doc(id).get();
      if (!current.exists) {
        return NextResponse.json(
          { error: 'Indicador de calidad no encontrado' },
          { status: 404 }
        );
      }

      const currentData = current.data()!;
      if (denied(auth, currentData.organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();
      const validatedData = qualityIndicatorSchema.partial().parse(body);
      await db
        .collection(COLLECTION_NAME)
        .doc(id)
        .update({ ...validatedData, updated_at: Timestamp.now() });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error in quality indicator PUT:', error);
      if (
        error &&
        typeof error === 'object' &&
        'name' in error &&
        error.name === 'ZodError'
      ) {
        return NextResponse.json(
          { error: 'Datos invalidos', details: (error as any).errors },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Error al actualizar indicador de calidad' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const PATCH = PUT;

export const DELETE = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const db = getAdminFirestore();
      const current = await db.collection(COLLECTION_NAME).doc(id).get();
      if (!current.exists) {
        return NextResponse.json(
          { error: 'Indicador de calidad no encontrado' },
          { status: 404 }
        );
      }

      const currentData = current.data()!;
      if (denied(auth, currentData.organization_id)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await db.collection(COLLECTION_NAME).doc(id).update({
        is_active: false,
        status: 'inactivo',
        updated_at: Timestamp.now(),
      });

      return NextResponse.json({
        message: 'Indicador de calidad eliminado exitosamente',
      });
    } catch (error) {
      console.error('Error in quality indicator DELETE:', error);
      return NextResponse.json(
        { error: 'Error al eliminar indicador de calidad' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
