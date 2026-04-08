import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import type { TerminalActionLog } from '@/types/terminal-action-log';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, context, auth) => {
    try {
      const params = await context.params;
      const procesoId = params['id'];

      if (!procesoId) {
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
      const db = getAdminFirestore();

      const snapshot = await db
        .collection('organizations')
        .doc(orgId)
        .collection('terminal_action_log')
        .where('proceso_id', '==', procesoId)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

      const logs: (TerminalActionLog & { id: string })[] = snapshot.docs.map(
        doc => ({
          id: doc.id,
          ...(doc.data() as Omit<TerminalActionLog, 'id'>),
        })
      );

      return NextResponse.json({ success: true, data: logs });
    } catch (error) {
      console.error('[admin/procesos/[id]/terminal-activity][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'Error interno al obtener actividad digital' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
