import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkHseCapability } from '../../_lib/checkHseCapability';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<Record<string, string>> };

function calcularNivelRiesgo(probabilidad: number, severidad: number): string {
  const score = probabilidad * severidad;
  if (score >= 15) return 'critico';
  if (score >= 10) return 'alto';
  if (score >= 5) return 'medio';
  return 'bajo';
}

const patchPeligroBody = z.object({
  proceso: z.string().min(2).optional(),
  actividad: z.string().min(2).optional(),
  peligro: z.string().min(2).optional(),
  tipo_peligro: z
    .enum([
      'fisico',
      'quimico',
      'biologico',
      'ergonomico',
      'psicosocial',
      'mecanico',
      'electrico',
      'locativo',
    ])
    .optional(),
  consecuencia: z.string().min(2).optional(),
  probabilidad: z.number().int().min(1).max(5).optional(),
  severidad: z.number().int().min(1).max(5).optional(),
  controles_existentes: z.string().optional(),
  controles_propuestos: z.string().optional(),
  responsable_uid: z.string().optional(),
  clausula_iso45001: z.string().optional(),
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
        .collection('hse_peligros')
        .doc(id)
        .get();

      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: 'Peligro no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } });
    } catch (error) {
      console.error('[hse/peligros/[id]][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el peligro' },
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

      const body = patchPeligroBody.parse(await request.json());
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
        .collection('hse_peligros')
        .doc(id);

      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json(
          { success: false, error: 'Peligro no encontrado' },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {
        ...body,
        updated_at: FieldValue.serverTimestamp(),
      };

      // Recalculate nivel_riesgo if probabilidad or severidad changed
      if (body.probabilidad !== undefined || body.severidad !== undefined) {
        const existingData = existing.data() as Record<string, unknown>;
        const probabilidad =
          body.probabilidad ?? (existingData.probabilidad as number);
        const severidad =
          body.severidad ?? (existingData.severidad as number);
        updateData.nivel_riesgo = calcularNivelRiesgo(probabilidad, severidad);
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
      console.error('[hse/peligros/[id]][PATCH]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar el peligro' },
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
        .collection('hse_peligros')
        .doc(id);

      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json(
          { success: false, error: 'Peligro no encontrado' },
          { status: 404 }
        );
      }

      await ref.delete();

      return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
      console.error('[hse/peligros/[id]][DELETE]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo eliminar el peligro' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
