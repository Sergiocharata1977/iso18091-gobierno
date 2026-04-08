import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/firebase/admin';
import { NextResponse } from 'next/server';
import type { TalentoIdentificado, PlanCarrera } from '@/types/rrhh-plugins';

// GET /api/rrhh/talento?tipo=talentos|planes
export const GET = withAuth(
  async (request, _context, auth) => {
    const { searchParams } = new URL(request.url);
    const organizationId = auth.role === 'super_admin'
      ? searchParams.get('organization_id') || auth.organizationId
      : auth.organizationId;
    if (!organizationId) return NextResponse.json({ error: 'organization_id requerido' }, { status: 400 });

    const tipo = searchParams.get('tipo') || 'talentos';
    const db = getAdminFirestore();
    const collection = tipo === 'planes' ? 'rrhh_planes_carrera' : 'rrhh_talentos';

    const snap = await db.collection(collection)
      .where('organization_id', '==', organizationId)
      .orderBy('created_at', 'desc').get();

    return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

// POST /api/rrhh/talento?tipo=talentos|planes
export const POST = withAuth(
  async (request, _context, auth) => {
    const { searchParams } = new URL(request.url);
    const body = await request.json();
    const organizationId = auth.role === 'super_admin'
      ? body.organization_id || auth.organizationId
      : auth.organizationId;
    if (!organizationId) return NextResponse.json({ error: 'organization_id requerido' }, { status: 400 });

    const tipo = searchParams.get('tipo') || 'talentos';
    const collection = tipo === 'planes' ? 'rrhh_planes_carrera' : 'rrhh_talentos';

    const { id: _id, created_at: _c, updated_at: _u, ...rest } = body;
    const doc = {
      ...rest,
      organization_id: organizationId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const db = getAdminFirestore();
    const ref = await db.collection(collection).add(doc);
    return NextResponse.json({ id: ref.id, ...doc }, { status: 201 });
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
