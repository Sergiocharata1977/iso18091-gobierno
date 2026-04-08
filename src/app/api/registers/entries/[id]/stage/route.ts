import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import type { RegisterAuditEvent, RegisterStage } from '@/types/registers';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<Record<string, string>> };

const stageBody = z.object({
  stage_id: z.string().min(1, 'stage_id requerido'),
  note: z.string().optional(),
});

export const PATCH = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const { id } = await context.params;
      const body = stageBody.parse(await request.json());
      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
      }
      const organizationId = scope.organizationId;

      const db = getAdminFirestore();
      const entryRef = db
        .collection('organizations')
        .doc(organizationId)
        .collection('custom_register_entries')
        .doc(id);

      const entrySnap = await entryRef.get();
      if (!entrySnap.exists) {
        return NextResponse.json({ success: false, error: 'Entrada no encontrada' }, { status: 404 });
      }
      const entryData = entrySnap.data() as Record<string, unknown>;

      // verificar que el stage pertenece al schema
      const schemaSnap = await db
        .collection('organizations')
        .doc(organizationId)
        .collection('custom_register_schemas')
        .doc(String(entryData.schema_id))
        .get();

      if (!schemaSnap.exists) {
        return NextResponse.json({ success: false, error: 'Schema no encontrado' }, { status: 404 });
      }

      const stages = (schemaSnap.data()?.stages as RegisterStage[]) || [];
      const targetStage = stages.find(s => s.id === body.stage_id);
      if (!targetStage) {
        return NextResponse.json(
          { success: false, error: 'Stage no encontrado en el schema' },
          { status: 400 }
        );
      }

      // compliance: audit trail append-only
      const auditEvent: RegisterAuditEvent = {
        id: `evt_${Date.now()}`,
        changed_by: auth.uid,
        changed_at: new Date(),
        action: 'stage_changed',
        old_value: entryData.stage_id,
        new_value: body.stage_id,
        note: body.note,
      };

      await entryRef.update({
        stage_id: body.stage_id,
        audit_trail: [
          ...((entryData.audit_trail as RegisterAuditEvent[]) || []),
          auditEvent,
        ],
        updated_at: Timestamp.now(),
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload inválido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[registers/entries/[id]/stage][PATCH]', error);
      return NextResponse.json({ success: false, error: 'Error al mover stage' }, { status: 500 });
    }
  },
  { roles: ['admin', 'gerente', 'auditor', 'operario', 'super_admin'] }
);
