import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/firebase/admin';
import { NextResponse } from 'next/server';
import type { Offboarding, OffboardingCreate } from '@/types/rrhh-plugins';

function calcularProgreso(tareas: Offboarding['tareas']): number {
  if (!tareas || tareas.length === 0) return 0;
  const completadas = tareas.filter(t => t.estado === 'completada').length;
  return Math.round((completadas / tareas.length) * 100);
}

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const organizationId =
        auth.role === 'super_admin'
          ? searchParams.get('organization_id') || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json({ error: 'organization_id requerido' }, { status: 400 });
      }

      const db = getAdminFirestore();
      const snap = await db
        .collection('rrhh_offboarding')
        .where('organization_id', '==', organizationId)
        .orderBy('created_at', 'desc')
        .get();

      const offboardings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offboarding));
      return NextResponse.json(offboardings);
    } catch (error) {
      console.error('Error GET offboarding:', error);
      return NextResponse.json({ error: 'Error al obtener offboardings' }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const organizationId =
        auth.role === 'super_admin'
          ? body.organization_id || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json({ error: 'organization_id requerido' }, { status: 400 });
      }

      const { id: _id, created_at: _c, updated_at: _u, progreso: _p, ...rest } = body;

      const tareas = body.tareas || defaultTareasOffboarding();
      const offboarding: Omit<Offboarding, 'id'> = {
        ...(rest as OffboardingCreate),
        organization_id: organizationId,
        tareas,
        progreso: calcularProgreso(tareas),
        estado: 'en_proceso',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const db = getAdminFirestore();
      const ref = await db.collection('rrhh_offboarding').add(offboarding);

      return NextResponse.json({ id: ref.id, ...offboarding }, { status: 201 });
    } catch (error) {
      console.error('Error POST offboarding:', error);
      return NextResponse.json({ error: 'Error al crear offboarding' }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

function defaultTareasOffboarding(): Offboarding['tareas'] {
  return [
    { id: '1', titulo: 'Entrevista de salida', categoria: 'entrevista', estado: 'pendiente', orden: 1 },
    { id: '2', titulo: 'Revocación de accesos a sistemas', categoria: 'accesos', estado: 'pendiente', orden: 2 },
    { id: '3', titulo: 'Devolución de equipamiento', categoria: 'equipamiento', estado: 'pendiente', orden: 3 },
    { id: '4', titulo: 'Baja AFIP / ANSES', categoria: 'documentacion', estado: 'pendiente', orden: 4 },
    { id: '5', titulo: 'Liquidación final', categoria: 'liquidacion', estado: 'pendiente', orden: 5 },
    { id: '6', titulo: 'Traspaso de tareas / documentación', categoria: 'documentacion', estado: 'pendiente', orden: 6 },
  ];
}
