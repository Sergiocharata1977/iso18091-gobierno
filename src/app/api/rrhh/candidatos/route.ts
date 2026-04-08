import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/firebase/admin';
import { NextResponse } from 'next/server';
import type { Candidato, CandidatoCreate } from '@/types/rrhh-plugins';

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
      let query = db
        .collection('rrhh_candidatos')
        .where('organization_id', '==', organizationId)
        .orderBy('created_at', 'desc');

      const vacanteId = searchParams.get('vacante_id');
      if (vacanteId) {
        query = db
          .collection('rrhh_candidatos')
          .where('organization_id', '==', organizationId)
          .where('vacante_id', '==', vacanteId)
          .orderBy('created_at', 'desc');
      }

      const snap = await query.get();
      const candidatos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidato));
      return NextResponse.json(candidatos);
    } catch (error) {
      console.error('Error GET candidatos:', error);
      return NextResponse.json({ error: 'Error al obtener candidatos' }, { status: 500 });
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

      const { id: _id, created_at: _c, updated_at: _u, ...rest } = body;

      const candidato: Omit<Candidato, 'id'> = {
        ...(rest as CandidatoCreate),
        organization_id: organizationId,
        etapa: body.etapa || 'postulado',
        fecha_postulacion: body.fecha_postulacion || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const db = getAdminFirestore();
      const ref = await db.collection('rrhh_candidatos').add(candidato);

      // Incrementar contador en vacante
      if (candidato.vacante_id) {
        const vacanteRef = db.collection('rrhh_vacantes').doc(candidato.vacante_id);
        const vacanteDoc = await vacanteRef.get();
        if (vacanteDoc.exists) {
          const current = (vacanteDoc.data()?.candidatos_count || 0) as number;
          await vacanteRef.update({ candidatos_count: current + 1 });
        }
      }

      return NextResponse.json({ id: ref.id, ...candidato }, { status: 201 });
    } catch (error) {
      console.error('Error POST candidatos:', error);
      return NextResponse.json({ error: 'Error al crear candidato' }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
