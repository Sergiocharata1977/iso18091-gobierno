import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { TerminalNarrativeService } from '@/services/terminales/TerminalNarrativeService';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import type { Terminal, TerminalStatus } from '@/types/terminal';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const patchBodySchema = z.object({
  nombre: z.string().trim().min(1).optional(),
  status: z.enum(['pending', 'active', 'offline', 'quarantined']).optional(),
  personnel_id: z.string().trim().min(1).optional(),
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
      const includeNarrative =
        searchParams.get('includeNarrative') === 'true' ||
        searchParams.get('include_narrative') === 'true';
      const db = getAdminFirestore();

      const terminalDoc = await db
        .collection('organizations')
        .doc(orgId)
        .collection('terminals')
        .doc(terminalId)
        .get();

      if (!terminalDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Terminal no encontrada' },
          { status: 404 }
        );
      }

      const terminalData = terminalDoc.data() as Omit<Terminal, 'id'>;

      if (terminalData.organization_id !== orgId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      if (!includeNarrative) {
        return NextResponse.json({
          success: true,
          data: { id: terminalDoc.id, ...terminalData },
        });
      }

      const narrative = await TerminalNarrativeService.getNarrativeByTerminal(
        orgId,
        terminalId
      );

      return NextResponse.json({
        success: true,
        data: {
          id: terminalDoc.id,
          ...terminalData,
          persona_nombre: narrative?.person.displayName,
          approvals_pendientes: narrative?.pendingApprovals.length ?? 0,
          politica_aplicada: narrative
            ? {
                allowed_tools: narrative.policy.allowedTools,
                require_approval_for: narrative.policy.approvalRequiredFor,
                allowed_hours: narrative.policy.allowedHours ?? null,
              }
            : null,
          narrative: narrative
            ? {
                state: narrative.state,
                businessExplanation: narrative.businessExplanation,
                phrasing: narrative.phrasing,
              }
            : null,
        },
      });
    } catch (error) {
      console.error('[admin/terminals/[id]][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la terminal' },
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
      const terminalRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('terminals')
        .doc(terminalId);

      const terminalDoc = await terminalRef.get();

      if (!terminalDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Terminal no encontrada' },
          { status: 404 }
        );
      }

      const existingData = terminalDoc.data() as Omit<Terminal, 'id'>;

      if (existingData.organization_id !== orgId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const updates: Partial<Omit<Terminal, 'id'>> & Record<string, unknown> = {};

      if (body.nombre !== undefined) {
        updates.nombre = body.nombre;
      }

      if (body.status !== undefined) {
        updates.status = body.status as TerminalStatus;
      }

      if (body.personnel_id !== undefined) {
        // Re-derive positional info from personnel
        const personnelDoc = await db
          .collection('organizations')
          .doc(orgId)
          .collection('personnel')
          .doc(body.personnel_id)
          .get();

        if (!personnelDoc.exists) {
          return NextResponse.json(
            { success: false, error: 'PERSONNEL_NOT_FOUND' },
            { status: 404 }
          );
        }

        const personnelData = personnelDoc.data()!;
        updates.personnel_id = body.personnel_id;
        updates.puesto_id = String(personnelData.puesto_id || '');
        updates.departamento_id = String(personnelData.departamento_id || '');
        updates.puesto_nombre = String(personnelData.puesto_nombre || '');
        updates.departamento_nombre = String(
          personnelData.departamento_nombre || ''
        );
      }

      // If quarantined, save immediately so withTerminalAuth picks it up
      if (body.status === 'quarantined') {
        updates.status = 'quarantined';
      }

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { success: false, error: 'No hay campos para actualizar' },
          { status: 400 }
        );
      }

      await terminalRef.update({
        ...updates,
        updated_at: Timestamp.now(),
      });

      const updatedDoc = await terminalRef.get();
      const updatedData = updatedDoc.data() as Omit<Terminal, 'id'>;

      return NextResponse.json({
        success: true,
        data: { id: terminalId, ...updatedData },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[admin/terminals/[id]][PATCH] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar la terminal' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
