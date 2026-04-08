import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/firebase/admin';
import { NextResponse } from 'next/server';
import type { Vacante, VacanteCreate } from '@/types/rrhh-plugins';

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
        .collection('rrhh_vacantes')
        .where('organization_id', '==', organizationId)
        .orderBy('created_at', 'desc')
        .get();

      const vacantes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vacante));
      return NextResponse.json(vacantes);
    } catch (error) {
      console.error('Error GET vacantes:', error);
      return NextResponse.json({ error: 'Error al obtener vacantes' }, { status: 500 });
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

      const { id: _id, created_at: _c, updated_at: _u, candidatos_count: _cc, ...rest } = body;

      const vacante: Omit<Vacante, 'id'> = {
        ...(rest as VacanteCreate),
        organization_id: organizationId,
        estado: body.estado || 'publicada',
        cantidad_posiciones: body.cantidad_posiciones || 1,
        candidatos_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: auth.uid,
      };

      const db = getAdminFirestore();
      const ref = await db.collection('rrhh_vacantes').add(vacante);

      return NextResponse.json({ id: ref.id, ...vacante }, { status: 201 });
    } catch (error) {
      console.error('Error POST vacantes:', error);
      return NextResponse.json({ error: 'Error al crear vacante' }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
