import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  calculateMaturityTotals,
  serializeDiagnosticoMadurez,
} from '@/lib/gov/maturity-dimensions';
import {
  MATURITY_DIMENSION_IDS,
  type DiagnosticoMadurez,
  type DiagnosticoMadurezPayload,
  type MaturityDimensionId,
  type MaturityScore,
} from '@/types/gov/maturity';
import { Timestamp } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const COLLECTION_NAME = 'municipio_madurez';
const READ_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;
const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;

const scoreSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

const payloadSchema = z.object({
  fecha: z.string().date().optional(),
  puntajes: z.object({
    D1: scoreSchema,
    D2: scoreSchema,
    D3: scoreSchema,
    D4: scoreSchema,
    D5: scoreSchema,
  }),
});

function normalizeOrganizationId(auth: {
  role?: string;
  organizationId?: string | null;
}) {
  if (auth.role === 'super_admin') {
    return auth.organizationId || 'default-org';
  }

  return auth.organizationId;
}

function normalizeScores(
  scores: DiagnosticoMadurezPayload['puntajes']
): Record<MaturityDimensionId, MaturityScore> {
  return MATURITY_DIMENSION_IDS.reduce(
    (acc, dimensionId) => {
      acc[dimensionId] = scores[dimensionId];
      return acc;
    },
    {} as Record<MaturityDimensionId, MaturityScore>
  );
}

export const GET = withAuth(
  async (_request, _context, auth) => {
    try {
      const organizationId = normalizeOrganizationId(auth);
      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId)
        .orderBy('created_at', 'desc')
        .limit(10)
        .get();

      const items = snapshot.docs.map(doc =>
        serializeDiagnosticoMadurez(
          doc.id,
          doc.data() as Omit<DiagnosticoMadurez, 'id'>
        )
      );

      return NextResponse.json({
        success: true,
        data: {
          latest: items[0] ?? null,
          items,
        },
      });
    } catch (error) {
      console.error('[municipio/madurez][GET] Error:', error);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener el diagnostico de madurez' },
        { status: 500 }
      );
    }
  },
  { roles: [...READ_ROLES] }
);

export const POST = withAuth(
  async (request, _context, auth) => {
    try {
      const organizationId = normalizeOrganizationId(auth);
      if (!organizationId) {
        return NextResponse.json(
          { success: false, error: 'organization_id requerido' },
          { status: 400 }
        );
      }

      const body = payloadSchema.parse(await request.json());
      const puntajes = normalizeScores(body.puntajes);
      const { puntaje_total, nivel_global, plan_mejora } =
        calculateMaturityTotals(puntajes);

      const db = getAdminFirestore();
      const now = Timestamp.now();
      const docData: Omit<DiagnosticoMadurez, 'id'> = {
        organization_id: organizationId,
        fecha: body.fecha || now.toDate().toISOString().slice(0, 10),
        puntajes,
        puntaje_total,
        nivel_global,
        plan_mejora,
        created_by: auth.uid,
        created_at: now,
      };

      const docRef = await db.collection(COLLECTION_NAME).add(docData);

      return NextResponse.json(
        {
          success: true,
          data: serializeDiagnosticoMadurez(docRef.id, docData),
        },
        { status: 201 }
      );
    } catch (error) {
      console.error('[municipio/madurez][POST] Error:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { success: false, error: 'Datos invalidos', details: error.issues },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'No se pudo guardar el diagnostico de madurez' },
        { status: 500 }
      );
    }
  },
  { roles: [...WRITE_ROLES] }
);
