import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import {
  KANBAN_DEFAULTS,
  KANBAN_MODULOS,
  KanbanColumnConfigSchema,
  type KanbanModulo,
  type KanbanSchema,
} from '@/types/kanbanSchema';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<Record<string, string>> };

const replaceBodySchema = z
  .object({
    columns: z.array(KanbanColumnConfigSchema).min(2).max(10),
    organization_id: z.string().trim().min(1).optional(),
    organizationId: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const ids = new Set<string>();
    const orders = new Set<number>();

    value.columns.forEach((column, index) => {
      if (ids.has(column.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No se permiten columnas con id duplicado',
          path: ['columns', index, 'id'],
        });
      }
      ids.add(column.id);

      if (orders.has(column.order)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'No se permiten columnas con order duplicado',
          path: ['columns', index, 'order'],
        });
      }
      orders.add(column.order);
    });
  });

function isKanbanModulo(value: string): value is KanbanModulo {
  return KANBAN_MODULOS.includes(value as KanbanModulo);
}

function getCollection(orgId: string) {
  return getAdminFirestore()
    .collection('organizations')
    .doc(orgId)
    .collection('kanban_schemas');
}

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

async function resolveModulo(
  context: RouteContext
): Promise<KanbanModulo | NextResponse> {
  const params = await context.params;
  const modulo = params.modulo;

  if (!modulo || !isKanbanModulo(modulo)) {
    return NextResponse.json(
      { success: false, error: 'Modulo de kanban invalido' },
      { status: 400 }
    );
  }

  return modulo;
}

export const GET = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const modulo = await resolveModulo(context);
      if (modulo instanceof NextResponse) {
        return modulo;
      }

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

      const snap = await getCollection(scope.organizationId).doc(modulo).get();
      const data = normalizeSchema(
        scope.organizationId,
        modulo,
        snap.exists ? (snap.data() as Record<string, unknown>) : null
      );

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[kanban-schemas/[modulo]][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el schema de kanban' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);

export const PUT = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const modulo = await resolveModulo(context);
      if (modulo instanceof NextResponse) {
        return modulo;
      }

      const rawBody = await request.json();
      const body = replaceBodySchema.parse(rawBody);
      const scope = await resolveAuthorizedOrganizationId(
        auth,
        getRequestedOrganizationId(request, body)
      );

      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const ref = getCollection(scope.organizationId).doc(modulo);
      const existing = await ref.get();
      const now = new Date().toISOString();
      const docPayload = {
        id: modulo,
        organization_id: scope.organizationId,
        modulo,
        columns: sortColumns(body.columns),
        is_custom: true,
        created_at: existing.exists
          ? String(existing.data()?.created_at || now)
          : now,
        updated_at: now,
      };

      await ref.set(docPayload);

      return NextResponse.json({
        success: true,
        data: normalizeSchema(scope.organizationId, modulo, docPayload),
        message: 'Schema de kanban actualizado correctamente',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload invalido', details: error.issues },
          { status: 400 }
        );
      }

      console.error('[kanban-schemas/[modulo]][PUT]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar el schema de kanban' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const modulo = await resolveModulo(context);
      if (modulo instanceof NextResponse) {
        return modulo;
      }

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

      await getCollection(scope.organizationId).doc(modulo).delete();

      return NextResponse.json({
        success: true,
        data: buildDefaultSchema(scope.organizationId, modulo),
        message: 'Schema de kanban restablecido a valores por defecto',
      });
    } catch (error) {
      console.error('[kanban-schemas/[modulo]][DELETE]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo restablecer el schema de kanban' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
