import { withAuth } from '@/lib/api/withAuth';
import { sendMessage } from '@/services/whatsapp';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const SendMessageSchema = z.object({
  organization_id: z.string().min(1, 'organization_id es requerido'),
  to: z.string().min(10, 'Numero de telefono invalido'),
  body: z.string().min(1, 'El mensaje no puede estar vacio'),
  conversation_id: z.string().optional(),
  media_url: z.string().url().optional(),
  template_name: z.string().optional(),
  template_variables: z.array(z.string()).optional(),
  sender_user_id: z.string().min(1, 'sender_user_id es requerido'),
  sender_name: z.string().min(1, 'sender_name es requerido'),
  cliente_id: z.string().optional(),
  cliente_nombre: z.string().optional(),
  vendedor_id: z.string().optional(),
  accion_id: z.string().optional(),
  auditoria_id: z.string().optional(),
});

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const validationResult = SendMessageSchema.safeParse(body);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Datos invalidos',
            details: validationResult.error.flatten().fieldErrors,
          },
          { status: 400 }
        );
      }

      const data = validationResult.data;
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        data.organization_id !== auth.organizationId
      ) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      if (
        !process.env.TWILIO_ACCOUNT_SID ||
        !process.env.TWILIO_AUTH_TOKEN ||
        !process.env.TWILIO_WHATSAPP_NUMBER
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'WhatsApp no esta configurado. Contacte al administrador.',
          },
          { status: 503 }
        );
      }

      const result = await sendMessage(data);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          message_id: result.message_id,
          conversation_id: result.conversation_id,
          twilio_sid: result.twilio_sid,
        },
      });
    } catch (error: any) {
      console.error('[API /whatsapp/send] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Error interno del servidor',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);
