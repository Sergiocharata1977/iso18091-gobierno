// API: /api/chat/sessions
// Gestion de sesiones de chat

import { ChatService } from '@/features/chat/services/ChatService';
import { ContextService } from '@/features/chat/services/ContextService';
import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
  verifyTargetUserOrganizationScope,
} from '@/middleware/verifyOrganization';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const CHAT_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const ELEVATED_ROLES = new Set(['admin', 'gerente', 'jefe', 'super_admin']);

const SessionsGetQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const SessionsPostBodySchema = z.object({
  userId: z.string().min(1).optional(),
  type: z.enum(['advisor', 'assistant', 'form']).optional(),
  module: z.string().min(1).optional(),
});

const SessionsDeleteQuerySchema = z.object({
  sessionId: z.string().min(1),
  organizationId: z.string().min(1).optional(),
  organization_id: z.string().min(1).optional(),
});

async function getUserData(userId: string) {
  const db = getAdminFirestore();
  const userDoc = await db.collection('users').doc(userId).get();

  if (!userDoc.exists) {
    return null;
  }

  const data = userDoc.data();
  return {
    id: userDoc.id,
    organizationId: data?.organization_id,
    personnelId: data?.personnel_id,
    role: data?.rol,
  };
}

function canManageOtherUsers(role: string): boolean {
  return ELEVATED_ROLES.has(role);
}

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const query = SessionsGetQuerySchema.parse(
        Object.fromEntries(searchParams.entries())
      );
      const requestedUserId = query.userId;
      const limit = query.limit || 20;

      const targetUserId = requestedUserId || auth.uid;
      if (targetUserId !== auth.uid && !canManageOtherUsers(auth.role)) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
      }

      if (targetUserId !== auth.uid && auth.role !== 'super_admin') {
        const targetScope = await verifyTargetUserOrganizationScope(
          auth,
          targetUserId
        );
        if (!targetScope.ok) {
          const orgError = toOrganizationApiError(targetScope, {
            defaultStatus: 403,
            defaultError: 'Sin permisos',
          });
          return NextResponse.json(
            { error: orgError.error, errorCode: orgError.errorCode },
            { status: orgError.status }
          );
        }
      }

      let organizationId = auth.organizationId;
      if (targetUserId !== auth.uid) {
        const targetUser = await getUserData(targetUserId);
        if (!targetUser || !targetUser.organizationId) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        if (
          auth.role !== 'super_admin' &&
          targetUser.organizationId !== auth.organizationId
        ) {
          return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        organizationId = targetUser.organizationId;
      }

      const sessions = await ChatService.getSessions(
        organizationId,
        targetUserId,
        limit
      );

      return NextResponse.json({
        success: true,
        sessions,
        total: sessions.length,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Query invalida', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[API /chat/sessions] Error:', error);
      return NextResponse.json(
        {
          error: 'Error fetching sessions',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...CHAT_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const body = SessionsPostBodySchema.parse(await request.json());
      const { userId: requestedUserId, type = 'advisor', module } = body;

      const targetUserId = requestedUserId || auth.uid;
      if (targetUserId !== auth.uid && !canManageOtherUsers(auth.role)) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
      }

      if (targetUserId !== auth.uid && auth.role !== 'super_admin') {
        const targetScope = await verifyTargetUserOrganizationScope(
          auth,
          targetUserId
        );
        if (!targetScope.ok) {
          const orgError = toOrganizationApiError(targetScope, {
            defaultStatus: 403,
            defaultError: 'Sin permisos',
          });
          return NextResponse.json(
            { error: orgError.error, errorCode: orgError.errorCode },
            { status: orgError.status }
          );
        }
      }

      let targetUser = {
        id: auth.uid,
        organizationId: auth.organizationId,
        personnelId: auth.user.personnel_id,
      };

      if (targetUserId !== auth.uid) {
        const user = await getUserData(targetUserId);
        if (!user || !user.organizationId) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        if (
          auth.role !== 'super_admin' &&
          user.organizationId !== auth.organizationId
        ) {
          return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        targetUser = {
          id: user.id,
          organizationId: user.organizationId,
          personnelId: user.personnelId,
        };
      }

      const session = await ChatService.createSession({
        organizationId: targetUser.organizationId,
        userId: targetUser.id,
        personnelId: targetUser.personnelId || undefined,
        type,
        module,
      });

      const context = await ContextService.getContext(
        targetUser.organizationId,
        targetUser.id
      );

      return NextResponse.json({ success: true, session, context });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[API /chat/sessions] Error:', error);
      return NextResponse.json(
        {
          error: 'Error creating session',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...CHAT_ROLES] }
);

export const DELETE = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const query = SessionsDeleteQuerySchema.parse(
        Object.fromEntries(searchParams.entries())
      );
      const sessionId = query.sessionId;
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        query.organizationId || query.organization_id || auth.organizationId,
        { requireOrg: true }
      );
      if (!orgScope.ok || !orgScope.organizationId) {
        const orgError = toOrganizationApiError(orgScope, {
          defaultStatus: 403,
          defaultError: 'Sin permisos',
        });
        return NextResponse.json(
          { error: orgError.error, errorCode: orgError.errorCode },
          { status: orgError.status }
        );
      }
      const organizationId = orgScope.organizationId;

      const session = await ChatService.getSession(sessionId, organizationId);
      if (!session) {
        return NextResponse.json(
          { error: 'Session not found' },
          { status: 404 }
        );
      }

      const isOwner = session.userId === auth.uid;
      if (!isOwner && !canManageOtherUsers(auth.role)) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
      }

      await ChatService.deleteSession(sessionId, organizationId);

      return NextResponse.json({
        success: true,
        message: 'Session deleted successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Query invalida', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[API /chat/sessions] Error:', error);
      return NextResponse.json(
        {
          error: 'Error deleting session',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...CHAT_ROLES] }
);
