import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkHseCapability } from '../_lib/checkHseCapability';

export const dynamic = 'force-dynamic';

function calcularNivelRiesgo(probabilidad: number, severidad: number): string {
  const score = probabilidad * severidad;
  if (score >= 15) return 'critico';
  if (score >= 10) return 'alto';
  if (score >= 5) return 'medio';
  return 'bajo';
}

const createPeligroBody = z.object({
  proceso: z.string().min(2),
  actividad: z.string().min(2),
  peligro: z.string().min(2),
  tipo_peligro: z.enum([
    'fisico',
    'quimico',
    'biologico',
    'ergonomico',
    'psicosocial',
    'mecanico',
    'electrico',
    'locativo',
  ]),
  consecuencia: z.string().min(2),
  probabilidad: z.number().int().min(1).max(5),
  severidad: z.number().int().min(1).max(5),
  controles_existentes: z.string().optional(),
  controles_propuestos: z.string().optional(),
  responsable_uid: z.string().optional(),
  clausula_iso45001: z.string().optional(),
});

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
      const orgId = scope.organizationId;
      const capCheck = await checkHseCapability(orgId);
      if (capCheck) return capCheck;

      const db = getAdminFirestore();
      const snap = await db
        .collection('organizations')
        .doc(orgId)
        .collection('hse_peligros')
        .orderBy('created_at', 'desc')
        .get();

      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[hse/peligros][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los peligros' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = createPeligroBody.parse(await request.json());
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

      const nivel_riesgo = calcularNivelRiesgo(body.probabilidad, body.severidad);

      const db = getAdminFirestore();
      const ref = db
        .collection('organizations')
        .doc(orgId)
        .collection('hse_peligros')
        .doc();

      await ref.set({
        ...body,
        clausula_iso45001: body.clausula_iso45001 ?? '6.1.2',
        nivel_riesgo,
        organization_id: orgId,
        created_by: auth.uid,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { success: true, data: { id: ref.id, nivel_riesgo } },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Payload inválido', details: error.issues },
          { status: 400 }
        );
      }
      console.error('[hse/peligros][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear el peligro' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
