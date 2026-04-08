import { withAuth } from '@/lib/api/withAuth';
import { NormPointSchema } from '@/lib/validations/normPoints';
import { NormPointService } from '@/services/normPoints/NormPointService';
import { NormPointFormData } from '@/types/normPoints';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  ensureOrganization,
  getRequestedOrgIdFromBody,
  isRecordAllowedByOrg,
  READ_ROLES,
  validateRequestedOrg,
  WRITE_ROLES,
} from '../_auth';

// GET /api/norm-points/[id] - Get norm point by ID
export const GET = withAuth(
  async (
    _request: NextRequest,
    { params }: { params: Promise<Record<string, string>> },
    auth
  ) => {
    try {
      const orgGuard = ensureOrganization(auth);
      if (orgGuard) return orgGuard;

      const { id } = await params;
      const normPoint = await NormPointService.getById(id);

      if (!normPoint) {
        return NextResponse.json(
          { error: 'Punto de norma no encontrado' },
          { status: 404 }
        );
      }

      if (!isRecordAllowedByOrg(normPoint, auth.organizationId)) {
        return NextResponse.json(
          {
            error: 'Acceso denegado',
            message: 'No puedes acceder a recursos de otra organizacion',
          },
          { status: 403 }
        );
      }

      return NextResponse.json(normPoint);
    } catch (error) {
      console.error('Error getting norm point:', error);
      return NextResponse.json(
        { error: 'Error al obtener punto de norma' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

// PUT /api/norm-points/[id] - Update norm point
export const PUT = withAuth(
  async (
    request: NextRequest,
    { params }: { params: Promise<Record<string, string>> },
    auth
  ) => {
    try {
      const orgGuard = ensureOrganization(auth);
      if (orgGuard) return orgGuard;

      const { id } = await params;
      const existing = await NormPointService.getById(id);
      if (!existing) {
        return NextResponse.json(
          { error: 'Punto de norma no encontrado' },
          { status: 404 }
        );
      }

      if (!isRecordAllowedByOrg(existing, auth.organizationId)) {
        return NextResponse.json(
          {
            error: 'Acceso denegado',
            message: 'No puedes operar sobre otra organizacion',
          },
          { status: 403 }
        );
      }

      const body = (await request.json()) as Record<string, unknown>;
      const orgValidation = validateRequestedOrg(
        getRequestedOrgIdFromBody(body),
        auth
      );
      if (orgValidation) return orgValidation;

      // Validate with Zod (partial update)
      const validatedData = NormPointSchema.partial().parse({
        ...body,
        updated_by: auth.uid,
        organization_id: auth.organizationId,
      }) as Partial<NormPointFormData>;

      const normPoint = await NormPointService.update(id, validatedData);

      return NextResponse.json(normPoint);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Datos inválidos', details: error.issues },
          { status: 400 }
        );
      }

      console.error('Error updating norm point:', error);
      return NextResponse.json(
        { error: 'Error al actualizar punto de norma' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);

// DELETE /api/norm-points/[id] - Delete norm point
export const DELETE = withAuth(
  async (
    _request: NextRequest,
    { params }: { params: Promise<Record<string, string>> },
    auth
  ) => {
    try {
      const orgGuard = ensureOrganization(auth);
      if (orgGuard) return orgGuard;

      const { id } = await params;
      const existing = await NormPointService.getById(id);
      if (!existing) {
        return NextResponse.json(
          { error: 'Punto de norma no encontrado' },
          { status: 404 }
        );
      }

      if (!isRecordAllowedByOrg(existing, auth.organizationId)) {
        return NextResponse.json(
          {
            error: 'Acceso denegado',
            message: 'No puedes operar sobre otra organizacion',
          },
          { status: 403 }
        );
      }

      await NormPointService.delete(id);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting norm point:', error);
      return NextResponse.json(
        { error: 'Error al eliminar punto de norma' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
