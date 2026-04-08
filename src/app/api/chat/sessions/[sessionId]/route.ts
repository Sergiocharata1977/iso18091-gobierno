// API: /api/chat/sessions/[sessionId]
// Operaciones sobre una sesion especifica

import { ChatService } from '@/features/chat/services/ChatService';
import { withAuth } from '@/lib/api/withAuth';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
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

const SessionRouteQuerySchema = z.object({
  organizationId: z.string().min(1).optional(),
  organization_id: z.string().min(1).optional(),
});

const SessionPatchBodySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    status: z.enum(['active', 'paused', 'completed']).optional(),
    tags: z.array(z.string().min(1).max(50)).max(20).optional(),
    organizationId: z.string().min(1).optional(),
    organization_id: z.string().min(1).optional(),
  })
  .refine(
    body =>
      body.title !== undefined ||
      body.status !== undefined ||
      body.tags !== undefined,
    { message: 'Debe enviar al menos un campo actualizable' }
  );

function canManageOtherUsers(role: string): boolean {
  return ELEVATED_ROLES.has(role);
}

export const GET = withAuth(
  async (request, context, auth) => {
    try {
      const { sessionId } = await context.params;
      const { searchParams } = new URL(request.url);
      const query = SessionRouteQuerySchema.parse(
        Object.fromEntries(searchParams.entries())
      );
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

      const messages = await ChatService.getMessages(sessionId, organizationId);

      return NextResponse.json({ success: true, session, messages });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Query invalida', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[API /chat/sessions/:id] Error:', error);
      if (error instanceof Error && error.message.includes('Access denied')) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      return NextResponse.json(
        {
          error: 'Error fetching session',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...CHAT_ROLES] }
);

export const PATCH = withAuth(
  async (request, context, auth) => {
    try {
      const { sessionId } = await context.params;
      const body = SessionPatchBodySchema.parse(await request.json());
      const { title, status, tags } = body;
      const orgScope = await resolveAuthorizedOrganizationId(
        auth,
        body.organizationId || body.organization_id || auth.organizationId,
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

      await ChatService.updateSession(sessionId, organizationId, {
        title,
        status,
        tags,
      });

      return NextResponse.json({
        success: true,
        message: 'Session updated successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[API /chat/sessions/:id] Error:', error);
      return NextResponse.json(
        {
          error: 'Error updating session',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...CHAT_ROLES] }
);

export const DELETE = withAuth(
  async (request, context, auth) => {
    try {
      const { sessionId } = await context.params;
      const { searchParams } = new URL(request.url);
      const query = SessionRouteQuerySchema.parse(
        Object.fromEntries(searchParams.entries())
      );
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
      console.error('[API /chat/sessions/:id] Error:', error);
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
