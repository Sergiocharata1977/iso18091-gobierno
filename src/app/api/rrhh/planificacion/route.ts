import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/firebase/admin';
import { NextResponse } from 'next/server';
import type { PlanificacionHeadcount } from '@/types/rrhh-plugins';

export const GET = withAuth(
  async (request, _context, auth) => {
    const { searchParams } = new URL(request.url);
    const organizationId = auth.role === 'super_admin'
      ? searchParams.get('organization_id') || auth.organizationId
      : auth.organizationId;
    if (!organizationId) return NextResponse.json({ error: 'organization_id requerido' }, { status: 400 });

    const db = getAdminFirestore();
    const snap = await db.collection('rrhh_planificacion')
      .where('organization_id', '==', organizationId)
      .orderBy('periodo', 'desc').get();

    return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() } as PlanificacionHeadcount)));
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    const body = await request.json();
    const organizationId = auth.role === 'super_admin'
      ? body.organization_id || auth.organizationId
      : auth.organizationId;
    if (!organizationId) return NextResponse.json({ error: 'organization_id requerido' }, { status: 400 });

    const { id: _id, created_at: _c, updated_at: _u, ...rest } = body;
    const doc: Omit<PlanificacionHeadcount, 'id'> = {
      ...rest,
      organization_id: organizationId,
      estado: body.estado || 'borrador',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: auth.uid,
    };
    const db = getAdminFirestore();
    const ref = await db.collection('rrhh_planificacion').add(doc);
    return NextResponse.json({ id: ref.id, ...doc }, { status: 201 });
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
