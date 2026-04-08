import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { ChannelIdentityResolver } from '@/services/ai-core/channelIdentityResolver';
import { UnifiedConverseService } from '@/services/ai-core/UnifiedConverseService';
import { UserRoleResolver } from '@/services/ai-core/userRoleResolver';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ConverseRequestSchema = z.object({
  channel: z.enum(['chat', 'voice', 'whatsapp']),
  message: z.string().trim().min(1, 'message requerido'),
  sessionId: z.string().trim().min(1, 'sessionId requerido'),
  organizationId: z.string().trim().min(1, 'organizationId requerido'),
  pathname: z.string().trim().optional(),
  externalId: z.string().trim().optional(),
  dashboardData: z.record(z.string(), z.unknown()).optional(),
});

type ConverseBody = z.infer<typeof ConverseRequestSchema>;

type DepartmentContext = {
  departmentId?: string;
  departmentName?: string;
  jobTitle?: string;
};

function resolveInternalWebhookSecret(): string {
  return (
    process.env.AI_INTERNAL_API_SECRET ||
    process.env.INTERNAL_API_SECRET ||
    process.env.WHATSAPP_INTERNAL_API_SECRET ||
    process.env.WHATSAPP_APP_SECRET ||
    ''
  );
}

async function runConverse(
  body: ConverseBody,
  actor: {
    userId: string;
    organizationId: string;
    userRole: string;
    personnelId?: string | null;
  }
) {
  const departmentContext = await resolveDepartmentContext(actor);
  const result = await UnifiedConverseService.converse({
    channel: body.channel,
    message: body.message,
    sessionId: body.sessionId,
    organizationId: actor.organizationId,
    userId: actor.userId,
    userRole: actor.userRole,
    pathname: body.pathname,
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
}

async function resolveDepartmentContext(actor: {
  userId: string;
  organizationId: string;
  personnelId?: string | null;
}): Promise<DepartmentContext | undefined> {
  try {
    const db = getAdminFirestore();
    let personnelId = actor.personnelId?.trim();

    if (!personnelId) {
      const userDoc = await db.collection('users').doc(actor.userId).get();
      const userData = userDoc.data();
      personnelId =
        typeof userData?.personnel_id === 'string'
          ? userData.personnel_id.trim()
          : '';
    }

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
      personnelData.organization_id !== actor.organizationId
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
    const rawJobTitle =
      (typeof personnelData.cargo === 'string' && personnelData.cargo.trim()) ||
      (typeof personnelData.puesto_nombre === 'string' &&
        personnelData.puesto_nombre.trim()) ||
      (typeof personnelData.puesto === 'string' && personnelData.puesto.trim()) ||
      '';
    const positionId =
      (typeof personnelData.puesto_id === 'string' &&
        personnelData.puesto_id.trim()) ||
      '';

    let departmentName =
      (typeof personnelData.departamento_nombre === 'string' &&
        personnelData.departamento_nombre.trim()) ||
      '';
    let jobTitle = rawJobTitle;

    const reads: Promise<void>[] = [];

    if (!departmentName && departmentId) {
      reads.push(
        db
          .collection('departments')
          .doc(departmentId)
          .get()
          .then(doc => {
            if (doc.exists) {
              const data = doc.data() as Record<string, unknown>;
              if (typeof data.nombre === 'string' && data.nombre.trim()) {
                departmentName = data.nombre.trim();
              }
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
            if (doc.exists) {
              const data = doc.data() as Record<string, unknown>;
              if (typeof data.nombre === 'string' && data.nombre.trim()) {
                jobTitle = data.nombre.trim();
              }
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
    console.warn('[API /api/ai/converse] Unable to resolve department context:', error);
    return undefined;
  }
}

const authenticatedPost = withAuth(
  async (request, _context, auth) => {
    const body = ConverseRequestSchema.parse(await request.json());
    const orgScope = await resolveAuthorizedOrganizationId(
      {
        uid: auth.uid,
        role: auth.role,
        organizationId: auth.organizationId,
      },
      body.organizationId
    );

    if (!orgScope.ok || !orgScope.organizationId) {
      const error = toOrganizationApiError(orgScope, {
        defaultStatus: 403,
        defaultError: 'Acceso denegado',
      });
      return NextResponse.json(
        { error: error.error, errorCode: error.errorCode },
        { status: error.status }
      );
    }

    return runConverse(body, {
      userId: auth.uid,
      organizationId: orgScope.organizationId,
      userRole: auth.role,
      personnelId: auth.user.personnel_id,
    });
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);

export async function POST(
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) {
  try {
    const internalSecret = resolveInternalWebhookSecret();
    const providedSecret = request.headers.get('x-internal-webhook-secret');

    if (internalSecret && providedSecret && providedSecret === internalSecret) {
      const body = ConverseRequestSchema.parse(await request.json());

      if (body.channel !== 'whatsapp') {
        return NextResponse.json(
          { error: 'Canal interno no permitido' },
          { status: 403 }
        );
      }

      const externalId = body.externalId?.trim();
      if (!externalId) {
        return NextResponse.json(
          { error: 'externalId requerido para WhatsApp interno' },
          { status: 400 }
        );
      }

      const identity = await ChannelIdentityResolver.resolveByExternalId({
        channel: 'whatsapp',
        externalId,
      });

      if (!identity?.organizationId) {
        return NextResponse.json(
          {
            error: 'Numero de WhatsApp no vinculado a un usuario',
            errorCode: 'IDENTITY_NOT_LINKED',
          },
          { status: 404 }
        );
      }

      const userRole = await UserRoleResolver.resolve(identity.userId);

      return runConverse(body, {
        userId: identity.userId,
        organizationId: identity.organizationId,
        userRole,
        personnelId: undefined,
      });
    }

    return await authenticatedPost(request, context);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Payload invalido', details: error.issues },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      (error.name === 'AIBudgetExceededError' ||
        (typeof (error as Error & { code?: string }).code === 'string' &&
          (error as Error & { code?: string }).code === 'AI_BUDGET_EXCEEDED'))
    ) {
      return NextResponse.json(
        {
          error: 'Limite mensual de IA alcanzado',
          message: error.message,
        },
        { status: 429 }
      );
    }

    console.error('[API /api/ai/converse] Error:', error);
    return NextResponse.json(
      {
        error: 'Error al procesar conversacion IA',
        message: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
