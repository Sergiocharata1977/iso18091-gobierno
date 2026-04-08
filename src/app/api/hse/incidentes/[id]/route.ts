import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkHseCapability } from '../../_lib/checkHseCapability';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<Record<string, string>> };

const patchIncidenteBody = z.object({
  tipo: z.enum(['accidente', 'incidente', 'casi_accidente', 'enfermedad_profesional']).optional(),
  fecha: z.string().optional(),
  hora: z.string().optional(),
  descripcion: z.string().min(10).optional(),
  lugar: z.string().min(2).optional(),
  involucrados: z.array(z.string()).optional(),
  testigos: z.array(z.string()).optional(),
  lesiones: z.string().optional(),
  dias_perdidos: z.number().int().min(0).optional(),
  estado: z.enum(['abierto', 'en_investigacion', 'cerrado']).optional(),
  gravedad: z.enum(['leve', 'moderado', 'grave', 'muy_grave']).optional(),
  causa_raiz: z.string().optional(),
  acciones_correctivas: z.array(z.string()).optional(),
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
        .collection('hse_incidentes')
        .doc(id)
        .get();

      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: 'Incidente no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } });
    } catch (error) {
      console.error('[hse/incidentes/[id]][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el incidente' },
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

      const body = patchIncidenteBody.parse(await request.json());
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
        .collection('hse_incidentes')
        .doc(id);

      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json(
          { success: false, error: 'Incidente no encontrado' },
          { status: 404 }
        );
      }

      const updateData: Record<string, unknown> = {
        ...body,
        updated_at: FieldValue.serverTimestamp(),
      };

      if (body.estado === 'cerrado') {
        updateData.closed_at = FieldValue.serverTimestamp();
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
      console.error('[hse/incidentes/[id]][PATCH]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar el incidente' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
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
        .collection('hse_incidentes')
        .doc(id);

      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json(
          { success: false, error: 'Incidente no encontrado' },
          { status: 404 }
        );
      }

      await ref.delete();

      return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
      console.error('[hse/incidentes/[id]][DELETE]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo eliminar el incidente' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'super_admin'] }
);
