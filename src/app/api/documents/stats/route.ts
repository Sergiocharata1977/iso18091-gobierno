import { withAuth } from '@/lib/api/withAuth';
import { DocumentService } from '@/services/documents/DocumentService';
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

      const stats = await DocumentService.getStats(organizationId);
      return NextResponse.json(stats);
    } catch (error) {
      console.error('Error getting document stats:', error);
      return NextResponse.json(
        { error: 'Error al obtener estadisticas de documentos' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
