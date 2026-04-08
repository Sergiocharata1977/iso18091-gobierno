import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { UnifiedConverseService } from '@/services/ai-core/UnifiedConverseService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type LegacyConverseBody = {
  channel?: 'chat' | 'voice' | 'whatsapp';
  message?: string;
  text?: string;
  prompt?: string;
  sessionId?: string;
  session_id?: string;
  organizationId?: string;
  organization_id?: string;
  pathname?: string;
  dashboardData?: Record<string, unknown>;
};

type DepartmentContext = {
  departmentId?: string;
  departmentName?: string;
  jobTitle?: string;
};

async function resolveDepartmentContext(params: {
  userId: string;
  organizationId: string;
  personnelId?: string | null;
}): Promise<DepartmentContext | undefined> {
  try {
    const db = getAdminFirestore();
    const personnelId = params.personnelId?.trim();
    if (!personnelId) {
      return undefined;
    }

    const personnelDoc = await db.collection('personnel').doc(personnelId).get();
    if (!personnelDoc.exists) {
      return undefined;
    }

    const personnelData = personnelDoc.data() as Record<string, unknown>;
    if (
      typeof personnelData.organization_id === 'string' &&
      personnelData.organization_id &&
      personnelData.organization_id !== params.organizationId
    ) {
      return undefined;
    }

    const departmentId =
      (typeof personnelData.departamento_id === 'string' &&
        personnelData.departamento_id.trim()) ||
      '';
    const departmentRef =
      typeof personnelData.departamento === 'string'
        ? personnelData.departamento.trim()
        : '';
    const positionId =
      (typeof personnelData.puesto_id === 'string' &&
        personnelData.puesto_id.trim()) ||
      '';

    let departmentName =
      (typeof personnelData.departamento_nombre === 'string' &&
        personnelData.departamento_nombre.trim()) ||
      '';
    let jobTitle =
      (typeof personnelData.cargo === 'string' && personnelData.cargo.trim()) ||
      (typeof personnelData.puesto_nombre === 'string' &&
        personnelData.puesto_nombre.trim()) ||
      (typeof personnelData.puesto === 'string' && personnelData.puesto.trim()) ||
      '';

    const reads: Promise<void>[] = [];

    if (!departmentName && departmentId) {
      reads.push(
        db
          .collection('departments')
          .doc(departmentId)
          .get()
          .then(doc => {
            const data = doc.data() as Record<string, unknown> | undefined;
            if (typeof data?.nombre === 'string' && data.nombre.trim()) {
              departmentName = data.nombre.trim();
            }
          })
      );
    } else if (!departmentName && departmentRef && departmentRef !== departmentId) {
      departmentName = departmentRef;
    }

    if ((!jobTitle || jobTitle === positionId) && positionId) {
      reads.push(
        db
          .collection('positions')
          .doc(positionId)
          .get()
          .then(doc => {
            const data = doc.data() as Record<string, unknown> | undefined;
            if (typeof data?.nombre === 'string' && data.nombre.trim()) {
              jobTitle = data.nombre.trim();
            }
          })
      );
    }

    if (reads.length > 0) {
      await Promise.all(reads);
    }

    if (!departmentName && !jobTitle) {
      return undefined;
    }

    return {
      departmentId: departmentId || undefined,
      departmentName: departmentName || undefined,
      jobTitle: jobTitle || undefined,
    };
  } catch (error) {
    console.warn('[API /api/converse] Unable to resolve department context:', error);
    return undefined;
  }
}

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = (await request.json()) as LegacyConverseBody;
      const message = String(
        body.message || body.text || body.prompt || ''
      ).trim();
      if (!message) {
        return NextResponse.json(
          { error: 'message requerido' },
          { status: 400 }
        );
      }

      const organizationId = String(
        body.organizationId || body.organization_id || auth.organizationId || ''
      ).trim();
      if (!organizationId) {
        return NextResponse.json(
          { error: 'organizationId requerido' },
          { status: 400 }
        );
      }

      const sessionId = String(body.sessionId || body.session_id || '').trim();
      const resolvedSessionId =
        sessionId || `legacy-converse:${auth.uid || 'anonymous'}`;
      const departmentContext = await resolveDepartmentContext({
        userId: auth.uid,
        organizationId,
        personnelId: auth.user.personnel_id,
      });

      const result = await UnifiedConverseService.converse({
        channel: body.channel || 'chat',
        message,
        sessionId: resolvedSessionId,
        organizationId,
        userId: auth.uid,
        userRole: auth.role,
        pathname: body.pathname || undefined,
        departmentContext,
        dashboardData: body.dashboardData,
      });

      return NextResponse.json({
        reply: result.reply,
        sessionId: result.sessionId,
        tokensUsed: result.tokensUsed,
        traceId: result.traceId,
        conversationId: result.sessionId,
        messages: result.messages,
        voiceIntent: result.voiceIntent,
        uiCommands: result.uiCommands || [],
      });
    } catch (error) {
      console.error('[API /api/converse] Error:', error);
      return NextResponse.json(
        {
          error: 'Error al procesar conversacion IA',
          message: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);
