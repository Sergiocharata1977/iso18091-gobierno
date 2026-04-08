import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { AgentQueueService } from '@/services/agents/AgentQueueService';
import { CRMAccion } from '@/types/crmAcciones';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organization_id =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;
      const cliente_id = searchParams.get('cliente_id');
      const oportunidad_id = searchParams.get('oportunidad_id');
      const vendedor_id = searchParams.get('vendedor_id');
      const tipo = searchParams.get('tipo');
      const estado = searchParams.get('estado');
      const fecha_desde = searchParams.get('fecha_desde');
      const limit = parseInt(searchParams.get('limit') || '50');

      if (!organization_id)
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
        );

      const db = getAdminFirestore();
      let query: any = db
        .collection('organizations')
        .doc(organization_id)
        .collection('crm_acciones')
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (cliente_id) query = query.where('cliente_id', '==', cliente_id);
      if (oportunidad_id)
        query = query.where('oportunidad_id', '==', oportunidad_id);
      if (vendedor_id) query = query.where('vendedor_id', '==', vendedor_id);
      if (tipo) query = query.where('tipo', '==', tipo);
      if (estado) query = query.where('estado', '==', estado);
      if (fecha_desde) query = query.where('createdAt', '>=', fecha_desde);

      const snapshot = await query.get();
      const acciones = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      })) as CRMAccion[];
      return NextResponse.json({ success: true, data: acciones });
    } catch (error: any) {
      console.error('[API /crm/acciones] Error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Error interno' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'auditor', 'operario', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const organization_id =
        auth.role === 'super_admin'
          ? body.organization_id || auth.organizationId
          : auth.organizationId;

      if (!organization_id)
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
        );

      const db = getAdminFirestore();
      const nuevaAccion = {
        ...body,
        organization_id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        estado: body.estado || 'programada',
      };

      const docRef = await db
        .collection('organizations')
        .doc(organization_id)
        .collection('crm_acciones')
        .add(nuevaAccion);

      if (body?.vendedor_phone) {
        try {
          await AgentQueueService.enqueueJob(
            {
              organization_id,
              user_id: body.vendedor_id || auth.uid,
              intent: 'task.assign',
              payload: {
                task_id: docRef.id,
                accion_id: docRef.id,
                task_titulo: body.titulo || 'Tarea CRM',
                task_tipo: body.tipo || 'tarea',
                tipo: body.tipo || 'tarea',
                fecha_programada: body.fecha_programada || null,
                responsable_phone: body.vendedor_phone,
                vendedor_phone: body.vendedor_phone,
                responsable_nombre: body.vendedor_nombre || null,
                vendedor_nombre: body.vendedor_nombre || null,
                cliente_nombre: body.cliente_nombre || null,
                cliente_direccion: body.cliente_direccion || null,
              },
              priority: 'high',
            },
            body.vendedor_id || auth.uid
          );
        } catch (queueError) {
          console.error(
            '[API /crm/acciones] Error encolando task.assign:',
            queueError
          );
        }
      }

      return NextResponse.json({
        success: true,
        data: { id: docRef.id, ...nuevaAccion },
      });
    } catch (error: any) {
      console.error('[API /crm/acciones] Error creating:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Error creando accion' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
