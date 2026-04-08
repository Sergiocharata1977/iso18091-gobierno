import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { UnifiedMessagesService } from '@/services/messages/UnifiedMessagesService';
import type { MessageChannel } from '@/types/messages';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALL_ROLES = [
  'admin',
  'super_admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
] as const;

function parseChannel(value: string | null): MessageChannel | undefined {
  if (value === 'whatsapp' || value === 'ai_chat') {
    return value;
  }

  return undefined;
}

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const searchParams = request.nextUrl.searchParams;
      const organizationIdParam = searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);

      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const channelParam = searchParams.get('channel');
      if (channelParam && channelParam !== 'whatsapp' && channelParam !== 'ai_chat') {
        return NextResponse.json(
          { success: false, error: 'Canal invalido' },
          { status: 400 }
        );
      }

      const limitRaw = Number.parseInt(searchParams.get('limit') || '50', 10);
      const conversations = await UnifiedMessagesService.listConversations({
        orgId: scope.organizationId,
        channel: parseChannel(channelParam),
        status: searchParams.get('status') || undefined,
        limit: Number.isNaN(limitRaw) ? 50 : Math.min(Math.max(limitRaw, 1), 100),
        search: searchParams.get('search') || undefined,
      });

      return NextResponse.json({ success: true, data: conversations });
    } catch (error) {
      console.error('[messages][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener las conversaciones' },
        { status: 500 }
      );
    }
  },
  { roles: [...ALL_ROLES] }
);
