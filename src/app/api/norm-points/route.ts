import { withAuth } from '@/lib/api/withAuth';
import { NormPointSchema } from '@/lib/validations/normPoints';
import { NormPointService } from '@/services/normPoints/NormPointService';
import { NormPointServiceAdmin } from '@/services/normPoints/NormPointServiceAdmin';
import { NormPointFormData } from '@/types/normPoints';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ensureOrganization,
  filterRecordsByOrg,
  getRequestedOrgId,
  getRequestedOrgIdFromBody,
  READ_ROLES,
  validateRequestedOrg,
  WRITE_ROLES,
} from './_auth';

// GET /api/norm-points - List norm points with filters and pagination
export const GET = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const orgGuard = ensureOrganization(auth);
      if (orgGuard) return orgGuard;

      const { searchParams } = new URL(request.url);
      const orgValidation = validateRequestedOrg(
        getRequestedOrgId(searchParams),
        auth
      );
      if (orgValidation) return orgValidation;

      // Parse filters
      const filters: Record<string, string | number | boolean | undefined> = {};
      if (searchParams.get('tipo_norma'))
        filters.tipo_norma = searchParams.get('tipo_norma')!;
      if (searchParams.get('chapter'))
        filters.chapter = parseInt(searchParams.get('chapter')!);
      if (searchParams.get('category'))
        filters.category = searchParams.get('category')!;
      if (searchParams.get('priority'))
        filters.priority = searchParams.get('priority')!;
      if (searchParams.get('is_mandatory'))
        filters.is_mandatory = searchParams.get('is_mandatory') === 'true';
      if (searchParams.get('process_id'))
        filters.process_id = searchParams.get('process_id')!;

      // Parse pagination
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const sort = searchParams.get('sort') || 'created_at';
      const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

      // Org scope is applied before pagination to keep totals consistent.
      const allResult = await NormPointServiceAdmin.getPaginated(filters, {
        page: 1,
        limit: 100000,
        sort,
        order,
      });
      const scopedData = filterRecordsByOrg(
        allResult.data,
        auth.organizationId
      );
      const total = scopedData.length;
      const offset = (page - 1) * limit;
      const data = scopedData.slice(offset, offset + limit);

      return NextResponse.json({
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error('Error getting norm points:', error);
      return NextResponse.json(
        { error: 'Error al obtener puntos de norma' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

// POST /api/norm-points - Create new norm point
export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const orgGuard = ensureOrganization(auth);
      if (orgGuard) return orgGuard;

      const body = (await request.json()) as Record<string, unknown>;
      const orgValidation = validateRequestedOrg(
        getRequestedOrgIdFromBody(body),
        auth
      );
      if (orgValidation) return orgValidation;

      // Validate with Zod
      const validatedData = NormPointSchema.parse({
        ...body,
        created_by: auth.uid,
        updated_by: auth.uid,
      }) as NormPointFormData;

      const normPoint = await NormPointService.create({
        ...validatedData,
        organization_id: auth.organizationId,
      });

      return NextResponse.json(normPoint, { status: 201 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: error.issues },
          { status: 400 }
        );
      }

      console.error('Error creating norm point:', error);
      return NextResponse.json(
        { error: 'Error al crear punto de norma' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
