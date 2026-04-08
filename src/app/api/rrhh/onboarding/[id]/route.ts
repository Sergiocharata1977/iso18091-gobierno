import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/firebase/admin';
import { NextResponse } from 'next/server';
import type { Onboarding } from '@/types/rrhh-plugins';

function calcularProgreso(tareas: Onboarding['tareas']): number {
  if (!tareas || tareas.length === 0) return 0;
  const completadas = tareas.filter(t => t.estado === 'completada').length;
  return Math.round((completadas / tareas.length) * 100);
}

export const GET = withAuth(
  async (_request, context, auth) => {
    try {
      const { id } = await context.params;
      const db = getAdminFirestore();
      const doc = await db.collection('rrhh_onboarding').doc(id).get();
      if (!doc.exists) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      const data = doc.data()!;
      if (auth.role !== 'super_admin' && data.organization_id !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
      return NextResponse.json({ id: doc.id, ...data });
    } catch {
      return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const PUT = withAuth(
  async (request, context, auth) => {
    try {
      const { id } = await context.params;
      const body = await request.json();
      const db = getAdminFirestore();
      const doc = await db.collection('rrhh_onboarding').doc(id).get();
      if (!doc.exists) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      const data = doc.data()!;
      if (auth.role !== 'super_admin' && data.organization_id !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const { id: _id, created_at: _c, organization_id: _o, ...updates } = body;

      // Recalcular progreso si vienen tareas
      if (updates.tareas) {
        updates.progreso = calcularProgreso(updates.tareas);
        // Auto completar si todas las tareas terminadas
        const allDone = updates.tareas.every(
          (t: Onboarding['tareas'][0]) => t.estado === 'completada' || t.estado === 'omitida'
        );
        if (allDone) updates.estado = 'completado';
      }

      await db.collection('rrhh_onboarding').doc(id).update({ ...updates, updated_at: new Date().toISOString() });
      return NextResponse.json({ id, ...data, ...updates });
    } catch {
      return NextResponse.json({ error: 'Error al actualizar onboarding' }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
