import { getAdminFirestore } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkHseCapability } from '../_lib/checkHseCapability';

export const dynamic = 'force-dynamic';

const createIncidenteBody = z.object({
  tipo: z.enum(['accidente', 'incidente', 'casi_accidente', 'enfermedad_profesional']),
  fecha: z.string(),
  hora: z.string().optional(),
  descripcion: z.string().min(10),
  lugar: z.string().min(2),
  involucrados: z.array(z.string()).default([]),
  testigos: z.array(z.string()).default([]),
  lesiones: z.string().optional(),
  dias_perdidos: z.number().int().min(0).default(0),
  estado: z.enum(['abierto', 'en_investigacion', 'cerrado']).default('abierto'),
  gravedad: z.enum(['leve', 'moderado', 'grave', 'muy_grave']).optional(),
  causa_raiz: z.string().optional(),
  acciones_correctivas: z.array(z.string()).default([]),
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

      const tipo = request.nextUrl.searchParams.get('tipo');
      const estado = request.nextUrl.searchParams.get('estado');

      const db = getAdminFirestore();
      let query = db
        .collection('organizations')
        .doc(orgId)
        .collection('hse_incidentes')
        .orderBy('created_at', 'desc') as FirebaseFirestore.Query;

      if (tipo) {
        query = query.where('tipo', '==', tipo);
      }
      if (estado) {
        query = query.where('estado', '==', estado);
      }

      const snap = await query.get();
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[hse/incidentes][GET]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudieron obtener los incidentes' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);

export const POST = withAuth(
  async (request: NextRequest, _context, auth) => {
    try {
      const body = createIncidenteBody.parse(await request.json());
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
        .doc();

      await ref.set({
        ...body,
        clausula_iso45001: body.clausula_iso45001 ?? '10.2',
        organization_id: orgId,
        reported_by: auth.uid,
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
      console.error('[hse/incidentes][POST]', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo crear el incidente' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'operario', 'auditor', 'super_admin'] }
);
