import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import {
  KANBAN_DEFAULTS,
  KANBAN_MODULOS,
  KanbanSchemaSchema,
  type KanbanModulo,
  type KanbanSchema,
  type UpsertKanbanSchemaDTO,
} from '@/types/kanbanSchema';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Zod v4: no se puede usar .extend() sobre un schema con .superRefine()
// Parseamos los campos extra por separado
const orgIdBodySchema = z.object({
  organization_id: z.string().trim().min(1).optional(),
  organizationId: z.string().trim().min(1).optional(),
});

function getRequestedOrganizationId(
  request: NextRequest,
  body?: { organization_id?: string; organizationId?: string }
) {
  return (
    body?.organization_id ||
    body?.organizationId ||
    request.nextUrl.searchParams.get('organization_id') ||
    undefined
  );
}

function getCollection(orgId: string) {
  return getAdminFirestore()
    .collection('organizations')
    .doc(orgId)
    .collection('kanban_schemas');
}

function sortColumns<T extends { order: number }>(columns: T[]) {
  return [...columns].sort((a, b) => a.order - b.order);
}

function buildDefaultSchema(
  organizationId: string,
  modulo: KanbanModulo
): KanbanSchema {
  return {
    id: modulo,
    organization_id: organizationId,
    modulo,
    columns: sortColumns(KANBAN_DEFAULTS[modulo]),
    is_custom: false,
    created_at: '',
    updated_at: '',
  };
}

function normalizeSchema(
  organizationId: string,
  modulo: KanbanModulo,
  data?: Record<string, unknown> | null
): KanbanSchema {
  if (!data) {
    return buildDefaultSchema(organizationId, modulo);
  }

  const rawColumns = Array.isArray(data.columns) ? data.columns : [];

  return {
    id: String(data.id || modulo),
    organization_id: String(data.organization_id || organizationId),
    modulo,
    columns: sortColumns(rawColumns as KanbanSchema['columns']),
    is_custom: true,
    created_at: String(data.created_at || ''),
    updated_at: String(data.updated_at || ''),
  };
}

async function upsertSchema(
  organizationId: string,
  payload: UpsertKanbanSchemaDTO
): Promise<KanbanSchema> {
  const ref = getCollection(organizationId).doc(payload.modulo);
  const now = new Date().toISOString();
  const existing = await ref.get();

  const docPayload = {
    id: payload.modulo,
    organization_id: organizationId,
    modulo: payload.modulo,
    columns: sortColumns(payload.columns),
    is_custom: true,
    created_at: existing.exists
      ? String(existing.data()?.created_at || now)
      : now,
    updated_at: now,
  };

  await ref.set(docPayload);
  return normalizeSchema(organizationId, payload.modulo, docPayload);
}

export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const scope = await resolveAuthorizedOrganizationId(
        auth,
        request.nextUrl.searchParams.get('organization_id')
      );

      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const organizationId = scope.organizationId;
      const snapshot = await getCollection(organizationId).get();
      const customByModulo = new Map<KanbanModulo, Record<string, unknown>>();

      snapshot.docs.forEach(doc => {
        const data = doc.data() as Record<string, unknown>;
        const modulo = data.modulo;
        if (typeof modulo === 'string' && KANBAN_MODULOS.includes(modulo as KanbanModulo)) {
          customByModulo.set(modulo as KanbanModulo, data);
        }
      });

      const data = KANBAN_MODULOS.map(modulo =>
        normalizeSchema(organizationId, modulo, customByModulo.get(modulo) || null)
      );

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[kanban-schemas][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los schemas de kanban' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const rawBody = await request.json();
      const dto = KanbanSchemaSchema.parse(rawBody);
      const orgFields = orgIdBodySchema.parse(rawBody);
      const scope = await resolveAuthorizedOrganizationId(
        auth,
        getRequestedOrganizationId(request, orgFields)
      );

      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const data = await upsertSchema(scope.organizationId, dto);

      return NextResponse.json(
        {
          success: true,
          data,
          message: 'Schema de kanban guardado correctamente',
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

      console.error('[kanban-schemas][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo guardar el schema de kanban' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
