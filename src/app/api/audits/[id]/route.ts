import { withAuth } from '@/lib/api/withAuth';
import { AuditService } from '@/lib/sdk/modules/audits';
import { NextResponse } from 'next/server';

export const GET = withAuth(async (_req, { params }, auth) => {
  try {
    const { id } = await params;
    const auditService = new AuditService();
    const audit = await auditService.getById(id);

    if (!audit) {
      return NextResponse.json(
        { success: false, error: 'Auditoria no encontrada' },
        { status: 404 }
      );
    }

    if (
      auth.role !== 'super_admin' &&
      auth.organizationId &&
      (audit as any).organization_id !== auth.organizationId
    ) {
      return NextResponse.json(
        { success: false, error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: audit,
    });
  } catch (error) {
    console.error('Error getting audit:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener auditoria' },
      { status: 500 }
    );
  }
});

export const PUT = withAuth(
  async (req, { params }, auth) => {
    try {
      const { id } = await params;
      const auditService = new AuditService();
      const body = await req.json();
      const current = await auditService.getById(id);

      if (!current) {
        return NextResponse.json(
          { success: false, error: 'Auditoria no encontrada' },
          { status: 404 }
        );
      }

      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      if (body.plannedDate) {
        body.plannedDate = new Date(body.plannedDate);
      }

      await auditService.update(id, body, auth.uid);

      return NextResponse.json({
        success: true,
        message: 'Auditoria actualizada exitosamente',
      });
    } catch (error) {
      console.error('Error updating audit:', error);
      return NextResponse.json(
        { success: false, error: 'Error al actualizar auditoria' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

export const DELETE = withAuth(
  async (_req, { params }, auth) => {
    try {
      const { id } = await params;
      const auditService = new AuditService();
      const current = await auditService.getById(id);

      if (!current) {
        return NextResponse.json(
          { success: false, error: 'Auditoria no encontrada' },
          { status: 404 }
        );
      }

      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (current as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      await auditService.delete(id);

      return NextResponse.json({
        success: true,
        message: 'Auditoria eliminada exitosamente',
      });
    } catch (error) {
      console.error('Error deleting audit:', error);
      return NextResponse.json(
        { success: false, error: 'Error al eliminar auditoria' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'super_admin'] }
);
