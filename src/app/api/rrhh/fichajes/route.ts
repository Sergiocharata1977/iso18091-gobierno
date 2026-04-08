import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/firebase/admin';
import { NextResponse } from 'next/server';
import type { Fichaje } from '@/types/rrhh-plugins';

export const GET = withAuth(
  async (request, _context, auth) => {
    const { searchParams } = new URL(request.url);
    const organizationId = auth.role === 'super_admin'
      ? searchParams.get('organization_id') || auth.organizationId
      : auth.organizationId;
    if (!organizationId) return NextResponse.json({ error: 'organization_id requerido' }, { status: 400 });

    const db = getAdminFirestore();
    const personnelId = searchParams.get('personnel_id');
    const mes = searchParams.get('mes'); // YYYY-MM

    let q = db.collection('rrhh_fichajes').where('organization_id', '==', organizationId);
    if (personnelId) q = q.where('personnel_id', '==', personnelId);
    if (mes) {
      q = q.where('fecha', '>=', `${mes}-01`).where('fecha', '<=', `${mes}-31`);
    }

    const snap = await q.orderBy('fecha', 'desc').get();
    return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() } as Fichaje)));
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

    // Calcular horas trabajadas si hay entrada y salida
    let horas_trabajadas: number | undefined;
    if (rest.hora_entrada && rest.hora_salida) {
      const [hE, mE] = rest.hora_entrada.split(':').map(Number);
      const [hS, mS] = rest.hora_salida.split(':').map(Number);
      horas_trabajadas = (hS * 60 + mS - hE * 60 - mE) / 60;
    }

    const doc: Omit<Fichaje, 'id'> = {
      ...rest,
      organization_id: organizationId,
      horas_trabajadas,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const db = getAdminFirestore();
    const ref = await db.collection('rrhh_fichajes').add(doc);
    return NextResponse.json({ id: ref.id, ...doc }, { status: 201 });
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
