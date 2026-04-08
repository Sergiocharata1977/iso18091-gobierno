import { checkRateLimit } from '@/lib/api/rateLimit';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { requireCapability } from '@/lib/plugins/PluginSecurityMiddleware';
import { resolvePublicOrgId } from '@/lib/public/resolveTenantOrg';
import { publicSolicitudSchema } from '@/lib/validations/dealer-solicitudes';
import { SolicitudCRMBridgeService } from '@/services/solicitudes/SolicitudCRMBridgeService';
import { SolicitudService } from '@/services/solicitudes/SolicitudService';
import { sendMessage } from '@/services/whatsapp/WhatsAppService';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CAPABILITY_ID = 'dealer_solicitudes';
const SOURCE = 'landing_public_dealer';

// Lee número de WhatsApp del operario y nombre de la org en una sola query
async function getOrgInfo(
  organizationId: string
): Promise<{ whatsappNumber: string | null; nombre: string }> {
  try {
    const db = getAdminFirestore();
    const orgDoc = await db.collection('organizations').doc(organizationId).get();
    const data = orgDoc.data() || {};
    const phone = data.whatsapp_notificaciones_dealer;
    return {
      whatsappNumber:
        typeof phone === 'string' && phone.trim().length > 0 ? phone.trim() : null,
      nombre: typeof data.nombre === 'string' ? data.nombre : 'El equipo',
    };
  } catch {
    return { whatsappNumber: null, nombre: 'El equipo' };
  }
}

function buildOperatorMessage(
  solicitud: { numero: string; nombre: string; telefono?: string | null; tipo: string },
  payloadData: Record<string, unknown>
): string {
  const lines = [
    '📥 *Nueva solicitud dealer*',
    `Número: ${solicitud.numero}`,
    `Tipo: ${solicitud.tipo}`,
    `Cliente: ${solicitud.nombre}`,
    `Tel: ${solicitud.telefono || 'no informado'}`,
    '',
  ];
  if (solicitud.tipo === 'repuesto') {
    lines.push(
      `Máquina: ${payloadData.maquina_tipo} ${payloadData.modelo || ''}`.trim()
    );
    lines.push(`Repuesto: ${payloadData.descripcion_repuesto}`);
  } else if (solicitud.tipo === 'servicio') {
    lines.push(
      `Máquina: ${payloadData.maquina_tipo} ${payloadData.modelo || ''}`.trim()
    );
    lines.push(`Localidad: ${payloadData.localidad}`);
    lines.push(`Problema: ${payloadData.descripcion_problema}`);
  } else if (solicitud.tipo === 'comercial') {
    lines.push(`Interés: ${payloadData.producto_interes}`);
    if (payloadData.requiere_financiacion) lines.push('Requiere financiación: Sí');
  }
  lines.push('', 'Ingresá al panel para gestionar.');
  return lines.filter(Boolean).join('\n');
}

function buildClientMessage(
  solicitud: { numero: string; tipo: string },
  payloadData: Record<string, unknown>,
  orgNombre: string
): string {
  let descripcion = '';
  if (solicitud.tipo === 'repuesto') {
    descripcion =
      `Repuesto para ${payloadData.maquina_tipo} ${payloadData.modelo || ''}`.trim();
  } else if (solicitud.tipo === 'servicio') {
    descripcion = `Servicio técnico para ${payloadData.maquina_tipo}`;
  } else if (solicitud.tipo === 'comercial') {
    descripcion = `Consulta sobre ${payloadData.producto_interes}`;
  }
  return [
    `✅ *${orgNombre} recibió tu solicitud*`,
    `Número: ${solicitud.numero}`,
    descripcion,
    '',
    'Te contactamos a la brevedad.',
    'Para consultas respondé este mensaje.',
    `_${orgNombre}_`,
  ]
    .filter(Boolean)
    .join('\n');
}

function getClientIdentifier(request: NextRequest, fallback: string) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
  return `${ip}:${fallback}`;
}

export async function POST(request: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Body JSON invalido' },
        { status: 400 }
      );
    }

    const payload = publicSolicitudSchema.parse(rawBody);

    // Resolver org por tenant_slug (body) > ?tenant= (query) > env var
    const organizationId = await resolvePublicOrgId(
      request,
      payload.tenant_slug || null
    );
    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organización no encontrada o módulo de solicitudes no configurado',
          errorCode: 'ORG_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const rateLimitResponse = checkRateLimit(request, {
      maxRequests: 12,
      windowSeconds: 3600,
      identifier: getClientIdentifier(request, payload.email),
    });
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    if (payload.website) {
      return NextResponse.json(
        {
          success: false,
          error: 'Solicitud bloqueada por filtros anti-spam',
          errorCode: 'SPAM_DETECTED',
        },
        { status: 422 }
      );
    }

    if (payload.form_started_at && Date.now() - payload.form_started_at < 2500) {
      return NextResponse.json(
        {
          success: false,
          error: 'Solicitud bloqueada por filtros anti-spam',
          errorCode: 'SPAM_DETECTED',
        },
        { status: 422 }
      );
    }

    try {
      await requireCapability(organizationId, CAPABILITY_ID);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Capability no habilitada';
      return NextResponse.json(
        { success: false, error: message, errorCode: 'CAPABILITY_DISABLED' },
        { status: 503 }
      );
    }

    let payloadData: Record<string, unknown>;
    let mensaje: string;

    switch (payload.tipo) {
      case 'repuesto':
        payloadData = {
          maquina_tipo: payload.maquina_tipo,
          modelo: payload.modelo,
          numero_serie: payload.numero_serie || null,
          descripcion_repuesto: payload.descripcion_repuesto,
        };
        mensaje = payload.descripcion_repuesto;
        break;
      case 'servicio':
        payloadData = {
          maquina_tipo: payload.maquina_tipo,
          modelo: payload.modelo,
          numero_serie: payload.numero_serie || null,
          descripcion_problema: payload.descripcion_problema,
          localidad: payload.localidad,
          provincia: payload.provincia,
        };
        mensaje = payload.descripcion_problema;
        break;
      case 'comercial':
        payloadData = {
          producto_interes: payload.producto_interes,
          requiere_financiacion: payload.requiere_financiacion,
          comentarios: payload.comentarios,
        };
        mensaje = payload.comentarios;
        break;
    }

    const { solicitud } = await SolicitudService.create({
      organization_id: organizationId,
      tipo: payload.tipo,
      nombre: payload.nombre,
      telefono: payload.telefono,
      email: payload.email,
      cuit: payload.cuit || null,
      mensaje,
      payload: payloadData,
      origen: SOURCE,
    });

    let crmWarning: string | null = null;
    if (solicitud.tipo === 'comercial') {
      try {
        await SolicitudCRMBridgeService.integrate(solicitud.id);
      } catch (error) {
        crmWarning =
          error instanceof Error ? error.message : 'No se pudo sincronizar con CRM';
      }
    }

    // Leer org info una sola vez para WhatsApp
    const orgInfo = await getOrgInfo(organizationId);

    // WhatsApp al operario — fire-and-forget
    if (orgInfo.whatsappNumber) {
      try {
        await sendMessage({
          organization_id: organizationId,
          to: orgInfo.whatsappNumber,
          body: buildOperatorMessage(solicitud, payloadData),
          sender_user_id: 'system',
          sender_name: 'Sistema Dealer',
          type: 'text',
        });
      } catch (waError) {
        console.error('[public][solicitudes] WhatsApp operario falló:', waError);
      }
    }

    // WhatsApp al cliente — fire-and-forget
    if (solicitud.telefono) {
      try {
        await sendMessage({
          organization_id: organizationId,
          to: solicitud.telefono,
          body: buildClientMessage(solicitud, payloadData, orgInfo.nombre),
          sender_user_id: 'system',
          sender_name: orgInfo.nombre,
          type: 'text',
        });
      } catch (waError) {
        console.error('[public][solicitudes] WhatsApp cliente falló:', waError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        id: solicitud.id,
        numeroSolicitud: solicitud.numero,
        tipo: payload.tipo,
        message: crmWarning
          ? 'Solicitud registrada correctamente. La sincronizacion CRM quedo pendiente.'
          : 'Solicitud registrada correctamente',
        crmWarning,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Payload invalido', details: error.issues },
        { status: 400 }
      );
    }

    console.error('[public][solicitudes][POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo registrar la solicitud' },
      { status: 500 }
    );
  }
}
