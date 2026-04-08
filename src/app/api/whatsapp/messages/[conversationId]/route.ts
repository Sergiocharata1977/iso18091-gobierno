import { withAuth } from '@/lib/api/withAuth';
import { getMessages } from '@/services/whatsapp';
import { NextResponse } from 'next/server';

export const GET = withAuth(
  async (request, { params }, auth) => {
    try {
      const { conversationId } = await params;
      const { searchParams } = new URL(request.url);
      const limit = searchParams.get('limit');
      const organizationId = searchParams.get('organization_id');

      if (!conversationId) {
        return NextResponse.json(
          { success: false, error: 'conversationId es requerido' },
          { status: 400 }
        );
      }

      if (auth.role !== 'super_admin') {
        if (
          !auth.organizationId ||
          !organizationId ||
          organizationId !== auth.organizationId
        ) {
          return NextResponse.json(
            { success: false, error: 'Acceso denegado' },
            { status: 403 }
          );
        }
      }

      const messages = await getMessages(conversationId, {
        limit: limit ? parseInt(limit) : 50,
      });
      return NextResponse.json({
        success: true,
        data: messages,
        count: messages.length,
      });
    } catch (error: any) {
      console.error('[API /whatsapp/messages] Error:', error);
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
