import { withAuth } from '@/lib/api/withAuth';
import { workSessionService } from '@/services/vendedor/WorkSessionService';
import { NextResponse } from 'next/server';

function resolveOrg(auth: any, requested?: string | null) {
  return auth.role === 'super_admin'
    ? requested || auth.organizationId
    : auth.organizationId;
}

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = await request.json();
      const {
        action,
        organization_id,
        vendedor_id,
        vendedor_nombre,
        vendedor_email,
        session_id,
        ubicacion,
      } = body;

      const orgId = resolveOrg(auth, organization_id);
      if (!orgId || !vendedor_id) {
        return NextResponse.json(
          { error: 'organization_id y vendedor_id son requeridos' },
          { status: 400 }
        );
      }

      if (action === 'start') {
        const session = await workSessionService.startSession({
          organization_id: orgId,
          vendedor_id,
          vendedor_nombre,
          vendedor_email,
          ubicacion,
        });
        return NextResponse.json({ success: true, session });
      }

      if (action === 'end') {
        if (!session_id) {
          return NextResponse.json(
            { error: 'session_id es requerido para finalizar' },
            { status: 400 }
          );
        }

        await workSessionService.endSession(orgId, session_id, ubicacion);
        return NextResponse.json({ success: true });
      }

      return NextResponse.json(
        { error: 'Accion no valida. Use "start" o "end"' },
        { status: 400 }
      );
    } catch (error: any) {
      console.error('[WorkSessionAPI] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Error interno' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organization_id');
      const organization_id = resolveOrg(auth, requestedOrgId);
      const vendedor_id = searchParams.get('vendedor_id');
      const type = searchParams.get('type') || 'active';

      if (!organization_id) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      if (vendedor_id && type === 'active') {
        const session = await workSessionService.getActiveSession(
          organization_id,
          vendedor_id
        );
        return NextResponse.json({ session });
      }

      if (vendedor_id && type === 'history') {
        const sessions = await workSessionService.getVendedorHistory(
          organization_id,
          vendedor_id
        );
        return NextResponse.json({ sessions });
      }

      if (type === 'all_active') {
        const sessions =
          await workSessionService.getActiveSessions(organization_id);
        return NextResponse.json({ sessions });
      }

      if (type === 'summary') {
        const summary =
          await workSessionService.getSupervisorSummary(organization_id);
        return NextResponse.json({ summary });
      }

      return NextResponse.json({ sessions: [] });
    } catch (error: any) {
      console.error('[WorkSessionAPI] Error:', error);
      return NextResponse.json(
        { error: error.message || 'Error interno' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'super_admin'] }
);
