import { withAuth } from '@/lib/api/withAuth';
import { FindingService } from '@/services/findings/FindingService';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await FindingService.getById(id);
      if (!current) {
        return NextResponse.json(
          { error: 'Hallazgo no encontrado' },
          { status: 404 }
        );
      }
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        current.organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await FindingService.close(id, auth.uid, auth.email || 'Usuario');
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error in POST /api/findings/[id]/close:', error);
      return NextResponse.json(
        { error: 'Error al cerrar hallazgo' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
