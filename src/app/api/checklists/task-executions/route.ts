import { withAuth } from '@/lib/api/withAuth';
import { adminDb } from '@/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

const COLLECTION_NAME = 'checklist_task_executions';
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
      const taskId = searchParams.get('task_id');
      const checklistId = searchParams.get('checklist_id');

      if (!taskId || !checklistId) {
        return NextResponse.json(
          { error: 'task_id y checklist_id son requeridos' },
          { status: 400 }
        );
      }

      let q = adminDb
        .collection(COLLECTION_NAME)
        .where('task_id', '==', taskId)
        .where('checklist_id', '==', checklistId) as any;
      if (auth.role !== 'super_admin')
        q = q.where('organization_id', '==', auth.organizationId);

      const snapshot = await q.limit(1).get();
      if (snapshot.empty) return NextResponse.json(null);

      const doc = snapshot.docs[0];
      const data = doc.data();
      return NextResponse.json({
        id: doc.id,
        ...data,
        completado_at: data.completado_at?.toDate?.() || null,
        created_at: data.created_at?.toDate?.() || new Date(),
        updated_at: data.updated_at?.toDate?.() || new Date(),
      });
    } catch (error) {
      console.error('Error getting task execution:', error);
      return NextResponse.json(
        { error: 'Error al obtener ejecucion del checklist' },
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
      const { task_id, checklist_id, respuestas, estado } = body;

      if (!task_id || !checklist_id) {
        return NextResponse.json(
          { error: 'task_id y checklist_id son requeridos' },
          { status: 400 }
        );
      }

      const now = Timestamp.now();
      const docData: any = {
        task_id,
        checklist_id,
        organization_id: auth.organizationId,
        respuestas: respuestas || {},
        estado: estado || 'pendiente',
        created_by: auth.uid,
        created_at: now,
        updated_at: now,
      };
      if (estado === 'completado') docData.completado_at = now;

      const docRef = await adminDb.collection(COLLECTION_NAME).add(docData);
      return NextResponse.json(
        { id: docRef.id, message: 'Ejecucion creada exitosamente' },
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating task execution:', error);
      return NextResponse.json(
        { error: 'Error al crear ejecucion del checklist' },
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
      const { id, respuestas, estado } = body;
      if (!id)
        return NextResponse.json({ error: 'id es requerido' }, { status: 400 });

      const ref = adminDb.collection(COLLECTION_NAME).doc(id);
      const current = await ref.get();
      if (!current.exists)
        return NextResponse.json(
          { error: 'Ejecucion no encontrada' },
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

      const now = Timestamp.now();
      const updateData: any = {
        respuestas,
        estado: estado || 'pendiente',
        updated_at: now,
      };
      if (estado === 'completado') updateData.completado_at = now;

      await ref.update(updateData);
      return NextResponse.json({
        id,
        message: 'Ejecucion actualizada exitosamente',
      });
    } catch (error) {
      console.error('Error updating task execution:', error);
      return NextResponse.json(
        { error: 'Error al actualizar ejecucion del checklist' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
