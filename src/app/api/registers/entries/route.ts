import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import type { CustomRegisterEntry, RegisterAuditEvent } from '@/types/registers';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createEntryBody = z.object({
  schema_id: z.string().min(1, 'schema_id requerido'),
  stage_id: z.string().min(1, 'stage_id requerido'),
  title: z.string().optional(),
  data: z.record(z.string(), z.unknown()).default({}),
});

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function normalizeEntry(id: string, data: Record<string, unknown>): CustomRegisterEntry {
  return {
    id,
    schema_id: String(data.schema_id || ''),
    organization_id: String(data.organization_id || ''),
    stage_id: String(data.stage_id || ''),
    title: data.title ? String(data.title) : undefined,
    data: (data.data as Record<string, unknown>) || {},
    audit_trail: Array.isArray(data.audit_trail)
      ? (data.audit_trail as RegisterAuditEvent[])
      : [],
    created_by: String(data.created_by || ''),
    created_at: toDate(data.created_at),
    updated_at: toDate(data.updated_at),
  };
}

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const schemaId = request.nextUrl.searchParams.get('schema_id');
      const stageId = request.nextUrl.searchParams.get('stage_id') || null;

      if (!schemaId) {
        return NextResponse.json(
          { success: false, error: 'schema_id requerido' },
          { status: 400 }
        );
      }

      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      const organizationId = scope.organizationId;

      const db = getAdminFirestore();
      let query = db
        .collection('organizations')
        .doc(organizationId)
        .collection('custom_register_entries')
        .where('schema_id', '==', schemaId)
        .orderBy('created_at', 'desc');

      if (stageId) {
        query = db
          .collection('organizations')
          .doc(organizationId)
          .collection('custom_register_entries')
          .where('schema_id', '==', schemaId)
          .where('stage_id', '==', stageId)
          .orderBy('created_at', 'desc');
      }

      const snap = await query.get();
      const data = snap.docs.map(doc =>
        normalizeEntry(doc.id, doc.data() as Record<string, unknown>)
      );

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[registers/entries][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener las entradas' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'auditor', 'operario', 'super_admin'] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = createEntryBody.parse(await request.json());
      const organizationIdParam =
        request.nextUrl.searchParams.get('organization_id') || undefined;
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      const organizationId = scope.organizationId;

      const db = getAdminFirestore();

      // verificar que el schema existe y pertenece a la org
      const schemaRef = db
        .collection('organizations')
        .doc(organizationId)
        .collection('custom_register_schemas')
        .doc(body.schema_id);
      const schemaSnap = await schemaRef.get();
      if (!schemaSnap.exists) {
        return NextResponse.json(
          { success: false, error: 'Schema no encontrado' },
          { status: 404 }
        );
      }

      const now = Timestamp.now();
      const auditEvent: RegisterAuditEvent = {
        id: `evt_${Date.now()}`,
        changed_by: auth.uid,
        changed_at: new Date(),
        action: 'created',
      };

      const ref = db
        .collection('organizations')
        .doc(organizationId)
        .collection('custom_register_entries')
        .doc();

      await ref.set({
        schema_id: body.schema_id,
        organization_id: organizationId,
        stage_id: body.stage_id,
        title: body.title || null,
        data: body.data,
        audit_trail: [auditEvent],
        created_by: auth.uid,
        created_at: now,
        updated_at: now,
      });

      return NextResponse.json(
        { success: true, data: { id: ref.id } },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload inválido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[registers/entries][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear la entrada' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'auditor', 'operario', 'super_admin'] }
);
