import { withAuth } from '@/lib/api/withAuth';
import { adminDb } from '@/firebase/admin';
import type { AccionLocal } from '@/types/vendedor';
import { NextResponse } from 'next/server';

function resolveOrg(auth: any, requested?: string | null) {
  return auth.role === 'super_admin'
    ? requested || auth.organizationId
    : auth.organizationId;
}

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const accion: AccionLocal = await request.json();
      const orgId = resolveOrg(auth, accion.organizationId);

      if (!orgId || !accion.vendedorId) {
        return NextResponse.json(
          { error: 'Faltan datos requeridos (organizationId, vendedorId)' },
          { status: 400 }
        );
      }

      const accionRef = adminDb
        .collection('organizations')
        .doc(orgId)
        .collection('crm_acciones')
        .doc(accion.id || adminDb.collection('_').doc().id);

      const accionData = {
        ...accion,
        organizationId: orgId,
        origen: 'app_vendedor',
        syncedAt: new Date().toISOString(),
        createdAt: accion.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        evidenciasIds: accion.evidenciasIds || [],
      };

      await accionRef.set(accionData);

      if (accion.clienteId) {
        const clienteRef = adminDb
          .collection('organizations')
          .doc(orgId)
          .collection('clientes')
          .doc(accion.clienteId);

        await clienteRef.update({
          ultimaInteraccion: accion.fechaRealizada || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        success: true,
        id: accionRef.id,
        message: 'Accion sincronizada exitosamente',
      });
    } catch (error) {
      console.error('Error al sincronizar accion:', error);
      return NextResponse.json(
        {
          error: 'Error al sincronizar accion',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const vendedorId =
        searchParams.get('vendedorId') || searchParams.get('vendedor_id');
      const requestedOrgId =
        searchParams.get('organizationId') ||
        searchParams.get('organization_id');
      const organizationId = resolveOrg(auth, requestedOrgId);
      const limit = parseInt(searchParams.get('limit') || '50');

      if (!vendedorId || !organizationId) {
        return NextResponse.json(
          {
            success: false,
            error: 'vendedorId y organizationId son requeridos',
            data: [],
          },
          { status: 400 }
        );
      }

      const accionesSnapshot = await adminDb
        .collection('organizations')
        .doc(organizationId)
        .collection('crm_acciones')
        .where('vendedorId', '==', vendedorId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      const acciones = accionesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({
        success: true,
        data: acciones,
        count: acciones.length,
      });
    } catch (error) {
      console.error('Error al listar acciones:', error);
      return NextResponse.json(
        {
          error: 'Error al listar acciones',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);
