import { withAuth } from '@/lib/api/withAuth';
import { MeasurementService } from '@/services/quality/MeasurementService';
import { NextResponse } from 'next/server';

const VIEW_ROLES = [
  'admin',
  'gerente',
  'jefe',
  'operario',
  'auditor',
  'super_admin',
] as const;

export const GET = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const measurements = await MeasurementService.getByIndicator(id);
      const filtered =
        auth.role === 'super_admin'
          ? measurements
          : measurements.filter(
              (item: any) =>
                !item.organization_id ||
                item.organization_id === auth.organizationId
            );
      return NextResponse.json(filtered);
    } catch (error) {
      console.error('Error in indicator measurements GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener mediciones del indicador' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);
