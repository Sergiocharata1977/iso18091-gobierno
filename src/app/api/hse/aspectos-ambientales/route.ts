import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkHseCapability } from '../_lib/checkHseCapability';

export const dynamic = 'force-dynamic';

const createAspectoBody = z.object({
  actividad: z.string().min(2),
  aspecto: z.string().min(2),
  impacto: z.string().min(2),
  tipo: z.enum(['directo', 'indirecto']),
  situacion: z.enum(['normal', 'anormal', 'emergencia']),
  probabilidad: z.number().int().min(1).max(5),
  severidad: z.number().int().min(1).max(5),
  requiere_control: z.boolean().default(false),
  clausula_iso14001: z.string().optional(),
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
        .collection('hse_aspectos_ambientales')
        .orderBy('created_at', 'desc')
        .get();

      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[hse/aspectos-ambientales][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los aspectos ambientales' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = createAspectoBody.parse(await request.json());
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

      const significativo = body.probabilidad * body.severidad >= 12;

      const db = getAdminFirestore();
      const ref = db
        .collection('organizations')
        .doc(orgId)
        .collection('hse_aspectos_ambientales')
        .doc();

      await ref.set({
        ...body,
        significativo,
        organization_id: orgId,
        created_by: auth.uid,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
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
      console.error('[hse/aspectos-ambientales][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear el aspecto ambiental' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
