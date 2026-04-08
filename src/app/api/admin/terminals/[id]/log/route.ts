import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import type { TerminalActionLog } from '@/types/terminal-action-log';
import type { ToolName } from '@/types/terminal';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const patchBodySchema = z.object({
  action: z.enum(['approve', 'reject']),
});

export const GET = withAuth(
  async (request, context, auth) => {
    try {
      const params = await context.params;
      const terminalId = params['id'];

      if (!terminalId) {
        return NextResponse.json(
          { success: false, error: 'id es requerido' },
          { status: 400 }
        );
      }

      const orgScope = await resolveAuthorizedOrganizationId(auth, null, {
        requireOrg: true,
      });

      if (!orgScope.ok || !orgScope.organizationId) {
        const apiError = toOrganizationApiError(orgScope);
        return NextResponse.json(
          { success: false, error: apiError.error, errorCode: apiError.errorCode },
          { status: apiError.status }
        );
      }

      const orgId = orgScope.organizationId;
      const { searchParams } = new URL(request.url);
      const limit = Math.min(
        parseInt(searchParams.get('limit') ?? '50', 10) || 50,
        200
      );
      const toolFilter = searchParams.get('tool') as ToolName | null;
      const resultFilter = searchParams.get('result');

      const db = getAdminFirestore();
      let query = db
        .collection('organizations')
        .doc(orgId)
        .collection('terminal_action_log')
        .where('terminal_id', '==', terminalId) as FirebaseFirestore.Query;

      if (toolFilter) {
        query = query.where('tool', '==', toolFilter);
      }

      if (resultFilter) {
        query = query.where('result', '==', resultFilter);
      }

      query = query.orderBy('timestamp', 'desc').limit(limit);

      const snapshot = await query.get();
      const logs: (TerminalActionLog & { id: string })[] = snapshot.docs.map(
        doc => ({
          id: doc.id,
          ...(doc.data() as Omit<TerminalActionLog, 'id'>),
        })
      );

      return NextResponse.json({ success: true, data: logs });
    } catch (error) {
      console.error('[admin/terminals/[id]/log][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el historial' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request, context, auth) => {
    try {
      const params = await context.params;
      const terminalId = params['id'];

      if (!terminalId) {
        return NextResponse.json(
          { success: false, error: 'id es requerido' },
          { status: 400 }
        );
      }

      const { searchParams } = new URL(request.url);
      const logId = searchParams.get('logId');

      if (!logId) {
        return NextResponse.json(
          { success: false, error: 'logId es requerido como query param' },
          { status: 400 }
        );
      }

      const orgScope = await resolveAuthorizedOrganizationId(auth, null, {
        requireOrg: true,
      });

      if (!orgScope.ok || !orgScope.organizationId) {
        const apiError = toOrganizationApiError(orgScope);
        return NextResponse.json(
          { success: false, error: apiError.error, errorCode: apiError.errorCode },
          { status: apiError.status }
        );
      }

      const orgId = orgScope.organizationId;
      const rawBody = await request.json();
      const body = patchBodySchema.parse(rawBody);

      const db = getAdminFirestore();
      const logRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('terminal_action_log')
        .doc(logId);

      const logDoc = await logRef.get();

      if (!logDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Log no encontrado' },
          { status: 404 }
        );
      }

      const logData = logDoc.data() as Omit<TerminalActionLog, 'id'>;

      if (logData.terminal_id !== terminalId) {
        return NextResponse.json(
          { success: false, error: 'El log no pertenece a esta terminal' },
          { status: 403 }
        );
      }

      if (logData.result !== 'pending_approval') {
        return NextResponse.json(
          {
            success: false,
            error: 'Solo se pueden aprobar/rechazar logs en estado pending_approval',
          },
          { status: 409 }
        );
      }

      const now = Timestamp.now();
      let updates: Partial<Omit<TerminalActionLog, 'id'>>;

      if (body.action === 'approve') {
        updates = {
          result: 'success',
          approved_by: auth.uid,
          approved_at: now,
        };
      } else {
        updates = {
          result: 'blocked',
          block_reason: 'REJECTED_BY_ADMIN',
          approved_by: auth.uid,
        };
      }

      await logRef.update(updates);

      const updatedDoc = await logRef.get();
      const updatedData = updatedDoc.data() as Omit<TerminalActionLog, 'id'>;

      return NextResponse.json({
        success: true,
        data: { id: logId, ...updatedData },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[admin/terminals/[id]/log][PATCH] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo procesar la aprobacion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
