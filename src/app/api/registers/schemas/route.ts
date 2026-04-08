import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import type {
  CustomRegisterSchema,
  RegisterFieldSchema,
  RegisterStage,
} from '@/types/registers';
import { Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const fieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  type: z.enum([
    'text', 'textarea', 'number', 'date', 'datetime',
    'boolean', 'select', 'multiselect', 'user', 'file', 'relation',
  ]),
  required: z.boolean(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  relation_collection: z.string().optional(),
  visible_in_kanban: z.boolean().optional(),
  visible_in_list: z.boolean().optional(),
  order: z.number(),
});

const stageSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  color: z.string(),
  order: z.number(),
  requires_approval: z.boolean().optional(),
  allowed_roles: z.array(z.string()).optional(),
  locked: z.boolean().optional(),
});

const createSchemaBody = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  description: z.string().optional(),
  icon: z.string().optional(),
  norma_referencia: z
    .enum(['ISO_9001', 'ISO_14001', 'ISO_45001', 'ISO_27001', 'ISO_18091', 'CUSTOM'])
    .optional(),
  clausula_referencia: z.string().optional(),
  fields: z.array(fieldSchema).min(1, 'Al menos un campo requerido'),
  stages: z.array(stageSchema).min(1, 'Al menos un stage requerido'),
  has_kanban: z.boolean().default(false),
  audit_level: z.enum(['basic', 'full']).optional(),
});

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function normalizeSchema(id: string, data: Record<string, unknown>): CustomRegisterSchema {
  return {
    id,
    organization_id: String(data.organization_id || ''),
    name: String(data.name || ''),
    description: data.description ? String(data.description) : undefined,
    icon: data.icon ? String(data.icon) : undefined,
    norma_referencia: data.norma_referencia as CustomRegisterSchema['norma_referencia'],
    clausula_referencia: data.clausula_referencia
      ? String(data.clausula_referencia)
      : undefined,
    fields: Array.isArray(data.fields) ? (data.fields as RegisterFieldSchema[]) : [],
    stages: Array.isArray(data.stages) ? (data.stages as RegisterStage[]) : [],
    has_kanban: Boolean(data.has_kanban),
    audit_level: (data.audit_level as 'basic' | 'full') || 'basic',
    automations: Array.isArray(data.automations) ? data.automations : undefined,
    active: data.active !== false,
    created_by: String(data.created_by || ''),
    created_at: toDate(data.created_at),
    updated_at: toDate(data.updated_at),
  };
}

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      const organizationId = scope.organizationId;

      const db = getAdminFirestore();
      const snap = await db
        .collection('organizations')
        .doc(organizationId)
        .collection('custom_register_schemas')
        .where('active', '==', true)
        .orderBy('created_at', 'desc')
        .get();

      const data = snap.docs.map(doc =>
        normalizeSchema(doc.id, doc.data() as Record<string, unknown>)
      );

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[registers/schemas][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los schemas' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'auditor', 'operario', 'super_admin'] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = createSchemaBody.parse(await request.json());
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

      // compliance: forzar audit_level 'full' si hay norma de referencia
      const auditLevel =
        body.audit_level ?? (body.norma_referencia ? 'full' : 'basic');

      const now = Timestamp.now();
      const db = getAdminFirestore();
      const ref = db
        .collection('organizations')
        .doc(organizationId)
        .collection('custom_register_schemas')
        .doc();

      await ref.set({
        ...body,
        audit_level: auditLevel,
        organization_id: organizationId,
        active: true,
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
      console.error('[registers/schemas][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear el schema' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
