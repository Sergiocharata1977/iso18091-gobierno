import { withAuth } from '@/lib/api/withAuth';
import { QualityIndicatorService } from '@/services/quality/QualityIndicatorService';
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
      const indicators = await QualityIndicatorService.getByObjective(id);
      const filtered =
        auth.role === 'super_admin'
          ? indicators
          : indicators.filter(
              (item: any) =>
                !item.organization_id ||
                item.organization_id === auth.organizationId
            );
      return NextResponse.json(filtered);
    } catch (error) {
      console.error('Error in objective indicators GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener indicadores del objetivo' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);
