import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkHseCapability } from '../../_lib/checkHseCapability';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<Record<string, string>> };

const patchAspectoBody = z.object({
  actividad: z.string().min(2).optional(),
  aspecto: z.string().min(2).optional(),
  impacto: z.string().min(2).optional(),
  tipo: z.enum(['directo', 'indirecto']).optional(),
  situacion: z.enum(['normal', 'anormal', 'emergencia']).optional(),
  probabilidad: z.number().int().min(1).max(5).optional(),
  severidad: z.number().int().min(1).max(5).optional(),
  requiere_control: z.boolean().optional(),
  clausula_iso14001: z.string().optional(),
});

export const GET = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const params = await context.params;
      const id = params.id;

      const organizationIdParam = request.nextUrl.searchParams.get('organization_id');
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      const orgId = scope.organizationId;
      const capCheck = await checkHseCapability(orgId);
      if (capCheck) return capCheck;

      const db = getAdminFirestore();
      const doc = await db
        .collection('organizations')
        .doc(orgId)
        .collection('hse_aspectos_ambientales')
        .doc(id)
        .get();

      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: 'Aspecto ambiental no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } });
    } catch (error) {
      console.error('[hse/aspectos-ambientales/[id]][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el aspecto ambiental' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);

export const PATCH = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const params = await context.params;
      const id = params.id;

      const body = patchAspectoBody.parse(await request.json());
      const organizationIdParam =
        request.nextUrl.searchParams.get('organization_id') || undefined;
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      const orgId = scope.organizationId;
      const capCheck = await checkHseCapability(orgId);
      if (capCheck) return capCheck;

      const db = getAdminFirestore();
      const ref = db
        .collection('organizations')
        .doc(orgId)
        .collection('hse_aspectos_ambientales')
        .doc(id);

      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json(
          { success: false, error: 'Aspecto ambiental no encontrado' },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {
        ...body,
        updated_at: FieldValue.serverTimestamp(),
      };

      // Recalculate significativo if probabilidad or severidad changed
      const existingData = existing.data() as Record<string, unknown>;
      const newProbabilidad =
        body.probabilidad ?? (existingData.probabilidad as number);
      const newSeveridad =
        body.severidad ?? (existingData.severidad as number);

      if (body.probabilidad !== undefined || body.severidad !== undefined) {
        updateData.significativo = newProbabilidad * newSeveridad >= 12;
      }

      await ref.update(updateData);

      return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload inválido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[hse/aspectos-ambientales/[id]][PATCH]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar el aspecto ambiental' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);

export const DELETE = withAuth(
  async (request: NextRequest, context: RouteContext, auth) => {
    try {
      const params = await context.params;
      const id = params.id;

      const organizationIdParam =
        request.nextUrl.searchParams.get('organization_id') || undefined;
      const scope = await resolveAuthorizedOrganizationId(auth, organizationIdParam);
      if (!scope.ok || !scope.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }
      const orgId = scope.organizationId;
      const capCheck = await checkHseCapability(orgId);
      if (capCheck) return capCheck;

      const db = getAdminFirestore();
      const ref = db
        .collection('organizations')
        .doc(orgId)
        .collection('hse_aspectos_ambientales')
        .doc(id);

      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json(
          { success: false, error: 'Aspecto ambiental no encontrado' },
          { status: 404 }
        );
      }

      await ref.delete();
      return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
      console.error('[hse/aspectos-ambientales/[id]][DELETE]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo eliminar el aspecto ambiental' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
