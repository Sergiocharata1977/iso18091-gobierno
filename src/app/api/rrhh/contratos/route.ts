import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/firebase/admin';
import { NextResponse } from 'next/server';
import type { Contrato, ContratoCreate } from '@/types/rrhh-plugins';

function calcularEstadoContrato(fecha_fin?: string): Contrato['estado'] {
  if (!fecha_fin) return 'vigente';
  const hoy = new Date();
  const vence = new Date(fecha_fin);
  const diffDias = Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDias < 0) return 'vencido';
  if (diffDias <= 30) return 'por_vencer';
  return 'vigente';
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
      let query = db
        .collection('rrhh_contratos')
        .where('organization_id', '==', organizationId)
        .orderBy('created_at', 'desc');

      const personnelId = searchParams.get('personnel_id');
      if (personnelId) {
        query = db
          .collection('rrhh_contratos')
          .where('organization_id', '==', organizationId)
          .where('personnel_id', '==', personnelId)
          .orderBy('created_at', 'desc');
      }

      const snap = await query.get();
      const contratos = snap.docs.map(doc => {
        const data = doc.data() as Omit<Contrato, 'id'>;
        return {
          id: doc.id,
          ...data,
          estado: data.estado || calcularEstadoContrato(data.fecha_fin),
        } as Contrato;
      });

      return NextResponse.json(contratos);
    } catch (error) {
      console.error('Error GET contratos:', error);
      return NextResponse.json({ error: 'Error al obtener contratos' }, { status: 500 });
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

      const { id: _id, created_at: _c, updated_at: _u, estado: _e, ...rest } = body;

      const contrato: Omit<Contrato, 'id'> = {
        ...(rest as ContratoCreate),
        organization_id: organizationId,
        estado: calcularEstadoContrato(body.fecha_fin),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: auth.uid,
      };

      const db = getAdminFirestore();
      const ref = await db.collection('rrhh_contratos').add(contrato);

      return NextResponse.json({ id: ref.id, ...contrato }, { status: 201 });
    } catch (error) {
      console.error('Error POST contratos:', error);
      return NextResponse.json({ error: 'Error al crear contrato' }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
