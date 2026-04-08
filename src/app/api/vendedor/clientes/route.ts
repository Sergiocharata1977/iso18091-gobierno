import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import type { ClienteCRM } from '@/types/crm';
import type { ClienteLocal } from '@/types/vendedor';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function mapClienteToLocal(
  id: string,
  data: Partial<ClienteCRM>,
  fallbackVendedorId?: string
): ClienteLocal {
  return {
    id,
    organizationId: data.organization_id || '',
    razonSocial: data.razon_social || 'Sin nombre',
    cuit: data.cuit_cuil || '',
    direccion: data.direccion || '',
    localidad: data.localidad || '',
    provincia: data.provincia || '',
    telefono: data.telefono || '',
    email: data.email || '',
    vendedorId: data.responsable_id || fallbackVendedorId || '',
    estado: data.isActive
      ? data.tipo_cliente === 'posible_cliente'
        ? 'prospecto'
        : 'activo'
      : 'inactivo',
    ultimaVisita:
      data.ultima_interaccion || data.fecha_ultima_compra || undefined,
    notas: data.notas || '',
    lastSyncAt: data.updated_at || new Date().toISOString(),
    version: 1,
  };
}

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const requestedOrgId =
        searchParams.get('organization_id') ||
        searchParams.get('organizationId');
      const vendedorId =
        searchParams.get('vendedor_id') || searchParams.get('vendedorId');

      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        requestedOrgId
      );

      if (!orgScope.ok || !orgScope.organizationId) {
        const error = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'Acceso denegado',
        });

        return NextResponse.json(
          { success: false, error: error.error, errorCode: error.errorCode },
          { status: error.status }
        );
      }

      const db = getAdminFirestore();
      let query = db
        .collection('crm_organizaciones')
        .where('organization_id', '==', orgScope.organizationId);

      if (vendedorId) {
        query = query.where('responsable_id', '==', vendedorId);
      }

      const snapshot = await query.orderBy('updatedAt', 'desc').limit(100).get();

      const clientes = snapshot.docs.map(doc =>
        mapClienteToLocal(
          doc.id,
          doc.data() as Partial<ClienteCRM>,
          vendedorId || undefined
        )
      );

      return NextResponse.json({
        success: true,
        clientes,
        count: clientes.length,
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[API Vendedor Clientes] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al listar clientes',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);
