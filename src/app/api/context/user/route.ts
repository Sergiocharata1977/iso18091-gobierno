/**
 * User Context API Route
 * GET /api/context/user - Get complete user context for IA
 * GET /api/context/user?light=true - Get lightweight user context
 */

import { withAuth } from '@/lib/api/withAuth';
import {
  toOrganizationApiError,
  verifyTargetUserOrganizationScope,
} from '@/middleware/verifyOrganization';
import { UserContextService } from '@/services/context/UserContextService';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'auditor',
  'operario',
  'super_admin',
] as const;

const ContextUserQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  light: z.enum(['true', 'false']).optional(),
  refresh: z.enum(['true', 'false']).optional(),
});

function canReadUser(auth: { uid: string; role: string }, userId: string) {
  if (auth.role === 'super_admin') return true;
  if (auth.uid === userId) return true;
  return ['admin', 'gerente', 'jefe', 'auditor'].includes(auth.role);
}

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const query = ContextUserQuerySchema.parse(
        Object.fromEntries(searchParams.entries())
      );
      const targetUserId = query.userId || auth.uid;
      const light = query.light === 'true';
      const refresh = query.refresh === 'true';

      if (!canReadUser(auth, targetUserId)) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      if (auth.role !== 'super_admin' && targetUserId !== auth.uid) {
        const targetScope = await verifyTargetUserOrganizationScope(
          auth,
          targetUserId
        );
        if (!targetScope.ok) {
          const orgError = toOrganizationApiError(targetScope, {
            defaultStatus: 403,
            defaultError: 'Acceso denegado',
          });
          return NextResponse.json(
            { error: orgError.error, errorCode: orgError.errorCode },
            { status: orgError.status }
          );
        }
      }

      let context;
      if (refresh) {
        context = await UserContextService.refreshContext(targetUserId);
      } else if (light) {
        context = await UserContextService.getUserContextLight(targetUserId);
      } else {
        context = await UserContextService.getUserFullContext(targetUserId);
      }

      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (context as any)?.user?.organization_id &&
        (context as any).user.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      return NextResponse.json({ data: context }, { status: 200 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Query invalida', details: error.issues },
          { status: 400 }
        );
      }
      console.error('Error in GET /api/context/user:', error);
      return NextResponse.json(
        {
          error: 'Error al obtener contexto del usuario',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);
