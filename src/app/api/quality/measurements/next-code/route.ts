import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const COLLECTION_NAME = 'quality_measurements';
const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const indicatorId = searchParams.get('indicator_id');
      const measurementDate = searchParams.get('measurement_date');

      if (!indicatorId) {
        return NextResponse.json(
          { error: 'indicator_id es requerido' },
          { status: 400 }
        );
      }
      if (!measurementDate) {
        return NextResponse.json(
          { error: 'measurement_date es requerido' },
          { status: 400 }
        );
      }

      const db = getAdminFirestore();
      const indicatorDoc = await db
        .collection('quality_indicators')
        .doc(indicatorId)
        .get();
      if (!indicatorDoc.exists) {
        return NextResponse.json(
          { error: 'Indicador no encontrado' },
          { status: 404 }
        );
      }

      const indicatorData = indicatorDoc.data()!;
      if (
        auth.role !== 'super_admin' &&
        indicatorData.organization_id &&
        indicatorData.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const indicatorCode = indicatorData.code;
      const date = new Date(measurementDate);
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
      const code = `MED-${indicatorCode}-${dateStr}`;

      let existingQuery = db
        .collection(COLLECTION_NAME)
        .where('code', '==', code) as any;
      if (auth.role !== 'super_admin') {
        existingQuery = existingQuery.where(
          'organization_id',
          '==',
          auth.organizationId
        );
      }
      const existingSnapshot = await existingQuery.get();

      if (existingSnapshot.empty) {
        return NextResponse.json({ code, nextNumber: 1 });
      }
      const count = existingSnapshot.size;
      const suffixedCode = `${code}-${String(count + 1).padStart(3, '0')}`;
      return NextResponse.json({ code: suffixedCode, nextNumber: count + 1 });
    } catch (error) {
      console.error('Error generating measurement code:', error);
      return NextResponse.json(
        { error: 'Error al generar codigo de medicion' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);
