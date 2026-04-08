import { withAuth } from '@/lib/api/withAuth';
import { PersonnelService } from '@/services/rrhh/PersonnelService';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export const GET = withAuth(
  async (request, _context, auth) => {
    try {
      const { searchParams } = new URL(request.url);
      const requestedOrgId = searchParams.get('organization_id') || undefined;
      const organizationId =
        auth.role === 'super_admin'
          ? requestedOrgId || auth.organizationId
          : auth.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { error: 'organization_id es requerido' },
          { status: 400 }
        );
      }

      const personnel = await PersonnelService.getAll(organizationId);
      return NextResponse.json(personnel);
    } catch (error) {
      console.error('Error getting personnel:', error);
      return NextResponse.json(
        { error: 'Error al obtener personal' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
