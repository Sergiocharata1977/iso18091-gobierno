import { withAuth } from '@/lib/api/withAuth';
import { QualityObjectiveService } from '@/services/quality/QualityObjectiveService';
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
      const objectives = await QualityObjectiveService.getByProcess(id);
      const filtered =
        auth.role === 'super_admin'
          ? objectives
          : objectives.filter(
              (item: any) =>
                !item.organization_id ||
                item.organization_id === auth.organizationId
            );
      return NextResponse.json(filtered);
    } catch (error) {
      console.error('Error in process objectives GET:', error);
      return NextResponse.json(
        { error: 'Error al obtener objetivos del proceso' },
        { status: 500 }
      );
    }
  },
  { roles: [...VIEW_ROLES] }
);
