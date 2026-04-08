import { NextResponse, type NextRequest } from 'next/server';

import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { SolicitudCRMBridgeService } from '@/services/solicitudes/SolicitudCRMBridgeService';

export const POST = withAuth(
  async (request: NextRequest, context, auth) => {
    try {
      const orgScope = await resolveAuthorizedOrganizationId(auth, null);
      if (!orgScope.ok || !orgScope.organizationId) {
        const apiError = toOrganizationApiError(orgScope, {
          defaultError: 'Acceso denegado',
        });
        return NextResponse.json(
          { success: false, error: apiError.error, errorCode: apiError.errorCode },
          { status: apiError.status }
        );
      }

      const { id } = await context.params;
      if (!id) {
        return NextResponse.json(
          { success: false, error: 'ID de solicitud requerido' },
          { status: 400 }
        );
      }

      const docRef = getAdminFirestore().collection('solicitudes').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: 'Solicitud no encontrada' },
          { status: 404 }
        );
      }

      const solicitud = doc.data() as Record<string, unknown>;
      if (solicitud.organization_id !== orgScope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      if (typeof solicitud.crm_oportunidad_id === 'string') {
        return NextResponse.json(
          {
            success: false,
            error: 'Ya fue convertida',
            oportunidadId: solicitud.crm_oportunidad_id,
          },
          { status: 409 }
        );
      }

      const result = await SolicitudCRMBridgeService.integrate(id);
      if (!result.bridged) {
        return NextResponse.json({
          success: true,
          bridged: false,
          reason: result.reason ?? 'crm_not_installed',
          oportunidadId: null,
          clienteId: result.crm_cliente_id,
        });
      }

      return NextResponse.json({
        success: true,
        oportunidadId: result.crm_oportunidad_id,
        clienteId: result.crm_cliente_id,
      });
    } catch (error) {
      console.error('[POST /api/vendedor/solicitudes/[id]/convertir]', error);
      return NextResponse.json(
        { success: false, error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);
