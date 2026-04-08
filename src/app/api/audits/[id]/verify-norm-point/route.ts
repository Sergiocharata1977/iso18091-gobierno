import { withAuth } from '@/lib/api/withAuth';
import { NormPointVerificationSchema } from '@/lib/validations/audits';
import { AuditService } from '@/services/audits/AuditService';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id } = await params;
      const audit = await AuditService.getById(id);

      if (!audit) {
        return NextResponse.json(
          { error: 'Auditoria no encontrada' },
          { status: 404 }
        );
      }

      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (audit as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }

      const body = await request.json();
      const validatedData = NormPointVerificationSchema.parse(body);

      const verificationData = {
        ...validatedData,
        observations: validatedData.observations ?? null,
      };

      await AuditService.updateNormPointVerification(
        id,
        validatedData.normPointCode,
        verificationData,
        auth.uid,
        auth.email
      );

      return NextResponse.json({
        message: 'Verificacion actualizada exitosamente',
      });
    } catch (error: unknown) {
      console.error('Error in POST /api/audits/[id]/verify-norm-point:', error);

      if (error instanceof Error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json(
        { error: 'Error al actualizar la verificacion' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
