import { withAuth } from '@/lib/api/withAuth';
import { AuditService } from '@/services/audits/AuditService';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id } = await params;
      const current = await AuditService.getById(id);

      if (!current) {
        return NextResponse.json(
          { error: 'Auditoria no encontrada' },
          { status: 404 }
        );
      }

      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      await AuditService.complete(id);

      return NextResponse.json({
        message: 'Auditoria completada exitosamente',
      });
    } catch (error: unknown) {
      console.error('Error in POST /api/audits/[id]/complete:', error);
      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json(
        { error: 'Error al completar la auditoria' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
