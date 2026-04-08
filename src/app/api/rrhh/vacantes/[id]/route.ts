import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/firebase/admin';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (_request, context, auth) => {
    try {
      const { id } = await context.params;
      const db = getAdminFirestore();
      const doc = await db.collection('rrhh_vacantes').doc(id).get();
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
      const doc = await db.collection('rrhh_vacantes').doc(id).get();
      if (!doc.exists) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      const data = doc.data()!;
      if (auth.role !== 'super_admin' && data.organization_id !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
      const { id: _id, created_at: _c, organization_id: _o, ...updates } = body;
      await db.collection('rrhh_vacantes').doc(id).update({ ...updates, updated_at: new Date().toISOString() });
      return NextResponse.json({ id, ...data, ...updates });
    } catch {
      return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_request, context, auth) => {
    try {
      const { id } = await context.params;
      const db = getAdminFirestore();
      const doc = await db.collection('rrhh_vacantes').doc(id).get();
      if (!doc.exists) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
      const data = doc.data()!;
      if (auth.role !== 'super_admin' && data.organization_id !== auth.organizationId) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
      await db.collection('rrhh_vacantes').doc(id).delete();
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 });
    }
  },
  { roles: ['admin', 'super_admin'] }
);
