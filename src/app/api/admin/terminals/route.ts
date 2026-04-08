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

const postBodySchema = z.object({
  nombre: z.string().trim().min(1, 'nombre es requerido'),
  personnel_id: z.string().trim().min(1, 'personnel_id es requerido'),
});

const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomAlphaNum(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)];
  }
  return result;
}

function generatePairingCode(): string {
  return `DC-${randomAlphaNum(4)}-${randomAlphaNum(4)}`;
}

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
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
      const statusFilter = searchParams.get('status') as TerminalStatus | null;
      const departamentoId = searchParams.get('departamento_id');
      const puestoId = searchParams.get('puesto_id');
      const includeNarrative =
        searchParams.get('includeNarrative') === 'true' ||
        searchParams.get('include_narrative') === 'true';

      const db = getAdminFirestore();
      let query = db
        .collection('organizations')
        .doc(orgId)
        .collection('terminals')
        .where('organization_id', '==', orgId) as FirebaseFirestore.Query;

      if (statusFilter) {
        query = query.where('status', '==', statusFilter);
      }
      if (departamentoId) {
        query = query.where('departamento_id', '==', departamentoId);
      }
      if (puestoId) {
        query = query.where('puesto_id', '==', puestoId);
      }

      // Order by last_heartbeat desc when no other constraints prevent it
      query = query.orderBy('last_heartbeat', 'desc');

      const snapshot = await query.get();
      const terminals: (Terminal & { id: string })[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Terminal, 'id'>),
      }));

      if (!includeNarrative) {
        return NextResponse.json({ success: true, data: terminals });
      }

      const narratives = await TerminalNarrativeService.getNarrativesByOrganization(orgId);
      const narrativeByTerminalId = new Map(
        narratives.map(narrative => [narrative.terminal.id, narrative])
      );

      const enrichedTerminals = terminals.map(terminal => {
        const narrative = narrativeByTerminalId.get(terminal.id);

        if (!narrative) {
          return terminal;
        }

        return {
          ...terminal,
          persona_nombre: narrative.person.displayName,
          approvals_pendientes: narrative.pendingApprovals.length,
          politica_aplicada: {
            allowed_tools: narrative.policy.allowedTools,
            require_approval_for: narrative.policy.approvalRequiredFor,
            allowed_hours: narrative.policy.allowedHours ?? null,
          },
          narrative: {
            state: narrative.state,
            businessExplanation: narrative.businessExplanation,
            phrasing: narrative.phrasing,
          },
        };
      });

      return NextResponse.json({ success: true, data: enrichedTerminals });
    } catch (error) {
      console.error('[admin/terminals][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron listar las terminales' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
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
      const body = postBodySchema.parse(rawBody);

      const db = getAdminFirestore();

      // Fetch personnel to derive positional info
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

      const now = Timestamp.now();
      const pairingExpiresAt = Timestamp.fromMillis(
        now.toMillis() + 24 * 60 * 60 * 1000
      );
      const pairingCode = generatePairingCode();

      const terminalRef = db
        .collection('organizations')
        .doc(orgId)
        .collection('terminals')
        .doc();

      const terminal: Omit<Terminal, 'id'> & { pairing_code: string } = {
        organization_id: orgId,
        nombre: body.nombre,
        hostname: '',
        os: 'windows',
        personnel_id: body.personnel_id,
        puesto_id: String(personnelData.puesto_id || ''),
        departamento_id: String(personnelData.departamento_id || ''),
        puesto_nombre: String(personnelData.puesto_nombre || ''),
        departamento_nombre: String(personnelData.departamento_nombre || ''),
        status: 'pending',
        agent_version: '',
        last_heartbeat: now,
        pairing_code: pairingCode,
        pairing_expires_at: pairingExpiresAt,
        created_at: now,
      };

      await terminalRef.set(terminal);

      return NextResponse.json(
        {
          success: true,
          data: { id: terminalRef.id, ...terminal },
        },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[admin/terminals][POST] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear la terminal' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
