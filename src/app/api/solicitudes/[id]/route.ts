import { withAuth } from '@/lib/api/withAuth';
import { UpdateSolicitudBodySchema } from '@/lib/validations/solicitudes';
import { SolicitudService } from '@/services/solicitudes/SolicitudService';
import { sendMessage } from '@/services/whatsapp/WhatsAppService';
import type { SolicitudEstado } from '@/types/solicitudes';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

function getStatusNotificationMessage(
  estado: SolicitudEstado,
  numero: string
): string | null {
  switch (estado) {
    case 'recibida':
      return null;
    case 'en_revision':
      return [
        '🔍 *Agro Biciufa - Actualizacion*',
        `Solicitud ${numero}`,
        'Estamos revisando tu consulta.',
        'Te avisamos cuando tengamos novedades.',
      ].join('\n');
    case 'gestionando':
      return [
        '🔧 *Agro Biciufa - En gestion*',
        `Solicitud ${numero}`,
        'Tu solicitud esta siendo procesada por nuestro equipo.',
        'Te contactamos a la brevedad.',
      ].join('\n');
    case 'cerrada':
      return [
        '✅ *Solicitud resuelta*',
        `Solicitud ${numero} - Agro Biciufa`,
        'Tu consulta fue gestionada.',
        'Todo bien? Responde OK para confirmarlo.',
        '_Para nueva consulta escribinos._',
      ].join('\n');
    case 'cancelada':
      return [
        '❌ *Solicitud cancelada*',
        `Solicitud ${numero} - Agro Biciufa`,
        'Tu solicitud fue cancelada.',
        'Para mas informacion responde este mensaje.',
      ].join('\n');
    default:
      return null;
  }
}

function denyByOrg(
  auth: { role: string; organizationId: string | null | undefined },
  organizationId: string
): boolean {
  if (auth.role === 'super_admin') return false;
  return !auth.organizationId || auth.organizationId !== organizationId;
}

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const solicitud = await SolicitudService.getById(id);

      if (!solicitud) {
        return NextResponse.json(
          { success: false, error: 'Solicitud no encontrada' },
          { status: 404 }
        );
      }

      if (denyByOrg(auth, solicitud.organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      return NextResponse.json({ success: true, data: solicitud });
    } catch (error) {
      console.error('[solicitudes/[id]][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la solicitud' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await SolicitudService.getById(id);

      if (!current) {
        return NextResponse.json(
          { success: false, error: 'Solicitud no encontrada' },
          { status: 404 }
        );
      }

      if (denyByOrg(auth, current.organization_id)) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const body = UpdateSolicitudBodySchema.parse(await request.json());
      const updated = await SolicitudService.update(id, body);

      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'Solicitud no encontrada' },
          { status: 404 }
        );
      }

      const estadoAnterior = current.estado;
      const estadoNuevo = updated.estado;
      const telefonoCliente = updated.telefono;
      const notificationMessage =
        estadoAnterior !== estadoNuevo && telefonoCliente
          ? getStatusNotificationMessage(estadoNuevo, updated.numero)
          : null;

      if (notificationMessage && telefonoCliente) {
        void sendMessage({
          organization_id: updated.organization_id,
          to: telefonoCliente,
          body: notificationMessage,
          sender_user_id: auth.uid,
          sender_name: auth.email || 'Sistema',
          cliente_nombre: updated.nombre,
          type: 'text',
        }).catch(error => {
          console.error(
            '[solicitudes/[id]][PATCH] Error enviando WhatsApp de cambio de estado:',
            error
          );
        });
      }

      return NextResponse.json({ success: true, data: updated });
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[solicitudes/[id]][PATCH] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar la solicitud' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
