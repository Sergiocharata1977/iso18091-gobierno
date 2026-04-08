import { withAuth } from '@/lib/api/withAuth';
import {
  resolveAuthorizedOrganizationId,
  toOrganizationApiError,
} from '@/middleware/verifyOrganization';
import { SystemActivityLogService } from '@/services/system/SystemActivityLogService';
import { SYSTEM_ACTIVITY_STATUSES } from '@/types/system-activity-log';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_LIMIT = 100;

function parseDateParam(
  value: string,
  boundary: 'start' | 'end'
): Date | null {
  const trimmed = value.trim();

  if (DATE_ONLY_REGEX.test(trimmed)) {
    const suffix = boundary === 'start' ? 'T00:00:00.000Z' : 'T23:59:59.999Z';
    const parsed = new Date(`${trimmed}${suffix}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const startDateSchema = z
  .string()
  .trim()
  .min(1)
  .refine(value => parseDateParam(value, 'start') !== null, {
    message: 'start_date debe ser una fecha valida',
  });

const endDateSchema = z
  .string()
  .trim()
  .min(1)
  .refine(value => parseDateParam(value, 'end') !== null, {
    message: 'end_date debe ser una fecha valida',
  });

const querySchema = z
  .object({
    start_date: startDateSchema.optional(),
    end_date: endDateSchema.optional(),
    source_module: z.string().trim().min(1).optional(),
    actor_user_id: z.string().trim().min(1).optional(),
    department_id: z.string().trim().min(1).optional(),
    entity_type: z.string().trim().min(1).optional(),
    entity_id: z.string().trim().min(1).optional(),
    status: z.enum(SYSTEM_ACTIVITY_STATUSES).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.start_date || !value.end_date) {
      return;
    }

    const start = parseDateParam(value.start_date, 'start');
    const end = parseDateParam(value.end_date, 'end');

    if (!start || !end || start <= end) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['end_date'],
      message: 'end_date debe ser igual o posterior a start_date',
    });
  });

function extractAllowedQueryParams(
  request: NextRequest
): Record<string, string> {
  const allowedKeys = [
    'start_date',
    'end_date',
    'source_module',
    'actor_user_id',
    'department_id',
    'entity_type',
    'entity_id',
    'status',
    'limit',
  ] as const;

  const entries: Record<string, string> = {};

  for (const key of allowedKeys) {
    const value = request.nextUrl.searchParams.get(key);
    if (value !== null) {
      entries[key] = value;
    }
  }

  return entries;
}

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      if (
        request.nextUrl.searchParams.has('organization_id') ||
        request.nextUrl.searchParams.has('organizationId')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'organization_id no es un parametro permitido',
          },
          { status: 400 }
        );
      }

      const parsedQuery = querySchema.safeParse(
        extractAllowedQueryParams(request)
      );

      if (!parsedQuery.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_QUERY',
            details: parsedQuery.error.flatten(),
          },
          { status: 400 }
        );
      }

      const orgScope = await resolveAuthorizedOrganizationId(auth, undefined, {
        requireOrg: true,
      });

      if (!orgScope.ok || !orgScope.organizationId) {
        const apiError = toOrganizationApiError(orgScope);
        return NextResponse.json(
          {
            success: false,
            error: apiError.error,
            errorCode: apiError.errorCode,
          },
          { status: apiError.status }
        );
      }

      const query = parsedQuery.data;
      const occurredFrom = query.start_date
        ? parseDateParam(query.start_date, 'start')
        : null;
      const occurredTo = query.end_date
        ? parseDateParam(query.end_date, 'end')
        : null;
      const limit = query.limit ?? DEFAULT_LIMIT;

      const data = await SystemActivityLogService.getByOrganization(
        orgScope.organizationId,
        {
          occurred_from: occurredFrom ?? undefined,
          occurred_to: occurredTo ?? undefined,
          source_module: query.source_module,
          actor_user_id: query.actor_user_id,
          actor_department_id: query.department_id,
          entity_type: query.entity_type,
          entity_id: query.entity_id,
          status: query.status,
          limit,
        }
      );

      return NextResponse.json({
        success: true,
        data,
        filters: {
          start_date: query.start_date ?? null,
          end_date: query.end_date ?? null,
          source_module: query.source_module ?? null,
          actor_user_id: query.actor_user_id ?? null,
          department_id: query.department_id ?? null,
          entity_type: query.entity_type ?? null,
          entity_id: query.entity_id ?? null,
          status: query.status ?? null,
          limit,
        },
        pagination: {
          limit,
          returned: data.length,
          has_more: data.length === limit,
        },
      });
    } catch (error) {
      console.error('[GET /api/admin/system-activity-log] Error:', error);
      return NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
