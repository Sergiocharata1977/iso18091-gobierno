import { db } from '@/firebase/config';
import { withAuth } from '@/lib/api/withAuth';
import { AuditService } from '@/lib/sdk/modules/audits/AuditService';
import { doc, updateDoc } from 'firebase/firestore';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id: auditId } = await params;
      const { normPointCodes } = await request.json();

      if (!normPointCodes || !Array.isArray(normPointCodes)) {
        return NextResponse.json(
          {
            success: false,
            message: 'normPointCodes es requerido y debe ser un array',
          },
          { status: 400 }
        );
      }

      const auditService = new AuditService();
      const audit = await auditService.getById(auditId);

      if (!audit) {
        return NextResponse.json(
          { success: false, message: 'Auditoria no encontrada' },
          { status: 404 }
        );
      }

      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        (audit as any).organization_id !== auth.organizationId
      ) {
        return NextResponse.json(
          { success: false, message: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const newVerifications = normPointCodes.map((code: string) => ({
        normPointCode: code,
        normPointId: null,
        conformityStatus: null,
        processes: [],
        processIds: null,
        observations: null,
        verifiedAt: null,
        verifiedBy: null,
        verifiedByName: null,
      }));

      const existingCodes =
        audit.normPointsVerification?.map(v => v.normPointCode) || [];
      const uniqueNewVerifications = newVerifications.filter(
        v => !existingCodes.includes(v.normPointCode)
      );

      const updatedVerifications = [
        ...(audit.normPointsVerification || []),
        ...uniqueNewVerifications,
      ];

      const auditRef = doc(db, 'audits', auditId);
      await updateDoc(auditRef, {
        normPointsVerification: updatedVerifications,
        selectedNormPoints: updatedVerifications.map(v => v.normPointCode),
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: `${uniqueNewVerifications.length} puntos de norma agregados`,
      });
    } catch (error) {
      console.error('Error adding norm points:', error);
      return NextResponse.json(
        { success: false, message: 'Error al agregar puntos de norma' },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
