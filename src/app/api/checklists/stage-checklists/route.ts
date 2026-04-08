import { withAuth } from '@/lib/api/withAuth';
import { adminDb } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

const COLLECTION_NAME = 'stageChecklists';
const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const WRITE_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'super_admin',
] as const;

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const stageId = searchParams.get('stage_id');
      const processRecordId = searchParams.get('process_record_id');

      if (!stageId || !processRecordId) {
        return NextResponse.json(
          { error: 'Se requiere stage_id y process_record_id' },
          { status: 400 }
        );
      }

      let q = adminDb
        .collection(COLLECTION_NAME)
        .where('stage_id', '==', stageId)
        .where('process_record_id', '==', processRecordId) as any;
      if (auth.role !== 'super_admin')
        q = q.where('organization_id', '==', auth.organizationId);

      const snapshot = await q.limit(1).get();
      if (snapshot.empty) return NextResponse.json(null);

      const doc = snapshot.docs[0];
      const data = doc.data();
      return NextResponse.json({
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate?.()?.toISOString(),
        updated_at: data.updated_at?.toDate?.()?.toISOString(),
      });
    } catch (error) {
      console.error('Error getting stage checklist:', error);
      return NextResponse.json(
        { error: 'Error al obtener checklist' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const { stage_id, process_record_id, nombre, campos } = body;

      if (!stage_id || !process_record_id) {
        return NextResponse.json(
          { error: 'Se requiere stage_id y process_record_id' },
          { status: 400 }
        );
      }

      const now = Timestamp.now();
      const docRef = await adminDb.collection(COLLECTION_NAME).add({
        stage_id,
        process_record_id,
        organization_id: auth.organizationId,
        nombre: nombre || 'Checklist',
        campos: campos || [],
        created_at: now,
        updated_at: now,
      });

      return NextResponse.json(
        { id: docRef.id, message: 'Checklist creado exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating stage checklist:', error);
      return NextResponse.json(
        { error: 'Error al crear checklist' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

export const PUT = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const { id, nombre, campos } = body;
      if (!id)
        return NextResponse.json({ error: 'Se requiere id' }, { status: 400 });

      const ref = adminDb.collection(COLLECTION_NAME).doc(id);
      const current = await ref.get();
      if (!current.exists)
        return NextResponse.json(
          { error: 'Checklist no encontrado' },
          { status: 404 }
        );
      const currentData = current.data()!;
      if (
        auth.role !== 'super_admin' &&
        currentData.organization_id &&
        currentData.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await ref.update({
        nombre: nombre || 'Checklist',
        campos: campos || [],
        updated_at: Timestamp.now(),
      });
      return NextResponse.json({
        id,
        message: 'Checklist actualizado exitosamente',
      });
    } catch (error) {
      console.error('Error updating stage checklist:', error);
      return NextResponse.json(
        { error: 'Error al actualizar checklist' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
