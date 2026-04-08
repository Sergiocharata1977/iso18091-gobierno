import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

export const PATCH = withAuth(
  async (request, { params }, auth) => {
    try {
      const { id: auditId } = await params;
      const body = await request.json();
      const { initialComments, finalReport } = body;

      const db = getAdminFirestore();
      const auditRef = db.collection('audits').doc(auditId);
      const auditDoc = await auditRef.get();

      if (!auditDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Auditoria no encontrada' },
          { status: 404 }
        );
      }

      const audit = auditDoc.data() as any;
      if (
        auth.role !== 'super_admin' &&
        auth.organizationId &&
        audit.organization_id !== auth.organizationId
      ) {
        return NextResponse.json(
          { success: false, error: 'Acceso denegado' },
          { status: 403 }
        );
      }

      const updateData: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (initialComments !== undefined)
        updateData.initialComments = initialComments;
      if (finalReport !== undefined) updateData.finalReport = finalReport;

      await auditRef.update(updateData);

      return NextResponse.json({
        success: true,
        message: 'Comentarios actualizados correctamente',
      });
    } catch (error) {
      console.error('Error updating audit comments:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al actualizar comentarios',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);
