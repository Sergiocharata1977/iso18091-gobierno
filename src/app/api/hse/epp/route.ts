import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkHseCapability } from '../_lib/checkHseCapability';

export const dynamic = 'force-dynamic';

const createEppBody = z.object({
  nombre: z.string().min(2),
  tipo: z.enum([
    'cabeza',
    'ojos_cara',
    'oidos',
    'respiratorio',
    'manos',
    'pies',
    'cuerpo',
    'caidas',
    'otro',
  ]),
  descripcion: z.string().optional(),
  norma_certificacion: z.string().optional(),
  fecha_vencimiento: z.string().optional(),
  estado: z
    .enum(['disponible', 'en_uso', 'en_mantenimiento', 'dado_de_baja'])
    .default('disponible'),
  cantidad_disponible: z.number().int().min(0).default(0),
  asignados: z
    .array(z.object({ uid: z.string(), fecha: z.string() }))
    .default([]),
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
        .collection('hse_epp')
        .orderBy('created_at', 'desc')
        .get();

      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[hse/epp][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los EPP' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = createEppBody.parse(await request.json());
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
        .collection('hse_epp')
        .doc();

      await ref.set({
        ...body,
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
      console.error('[hse/epp][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear el EPP' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'super_admin'] }
);
