import { withAuth } from '@/lib/api/withAuth';
import { createClienteCRMSchema } from '@/lib/schemas/crm-schemas';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const clientesSnapshot = await db
        .collection('crm_organizaciones')
        .where('organization_id', '==', organizationId)
        .where('isActive', '==', true)
        .get();

      const clientes = clientesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      return NextResponse.json({ success: true, data: clientes });
    } catch (error: any) {
      console.error('Error in GET /api/crm/clientes:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to get clientes' },
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
      const organizationId =
        auth.role === 'super_admin'
          ? body.organization_id || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const validatedData = createClienteCRMSchema.parse({
        ...body,
        organization_id: organizationId,
      });
      const db = getAdminFirestore();

      const estadosSnapshot = await db
        .collection('crm_kanban_estados')
        .where('organization_id', '==', organizationId)
        .where('tipo', '==', 'crm')
        .get();

      let estadoKanbanId: string;
      if (estadosSnapshot.empty) {
        const defaultEstados = [
          { nombre: 'Prospecto', color: '#94a3b8', orden: 0 },
          { nombre: 'Contactado', color: '#60a5fa', orden: 1 },
          { nombre: 'Propuesta', color: '#fbbf24', orden: 2 },
          { nombre: 'Negociacion', color: '#f97316', orden: 3 },
          { nombre: 'Cerrado', color: '#22c55e', orden: 4 },
        ];

        const batch = db.batch();
        const estadoRefs: any[] = [];
        for (const estado of defaultEstados) {
          const ref = db.collection('crm_kanban_estados').doc();
          batch.set(ref, {
            ...estado,
            organization_id: organizationId,
            tipo: 'crm',
            created_at: new Date().toISOString(),
          });
          estadoRefs.push(ref);
        }
        await batch.commit();
        estadoKanbanId = estadoRefs[0].id;
      } else {
        const estados = estadosSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a: any, b: any) => a.orden - b.orden);
        estadoKanbanId = estados[0].id;
      }

      const now = new Date().toISOString();
      const clienteData = {
        ...validatedData,
        organization_id: organizationId,
        estado_kanban_id: estadoKanbanId,
        responsable_id: auth.uid,
        responsable_nombre: auth.email || 'Sistema',
        isActive: true,
        fecha_registro: now,
        ultima_interaccion: now,
        created_at: now,
        updated_at: now,
      };

      const docRef = await db.collection('crm_organizaciones').add(clienteData);
      return NextResponse.json({
        success: true,
        data: { id: docRef.id, ...clienteData },
      });
    } catch (error: any) {
      console.error('Error in POST /api/crm/clientes:', error);
      if (error.name === 'ZodError') {
        return NextResponse.json(
          {
            success: false,
            error: 'Error de validacion',
            details: error.errors,
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to create cliente' },
        { status: 500 }
      );
    }
  },
  { requiredCapability: 'crm', roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
