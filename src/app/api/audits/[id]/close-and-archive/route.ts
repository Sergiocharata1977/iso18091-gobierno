/**
 * API Route: POST /api/audits/[id]/close-and-archive
 *
 * Enhanced close endpoint that:
 * 1. Validates audit can be closed (all points verified, final report present)
 * 2. Generates PDF report
 * 3. Creates document in ABM Documentos
 * 4. Updates audit with reference to archived document
 * 5. Sets status to 'completed'
 */

import { withAuth } from '@/lib/api/withAuth';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

export const POST = withAuth(
  async (_request, { params }, auth) => {
    try {
      const { id: auditId } = await params;
      const db = getAdminFirestore();

      // 1. Get audit and validate
      const auditRef = db.collection('audits').doc(auditId);
      const auditDoc = await auditRef.get();

      if (!auditDoc.exists) {
        return NextResponse.json(
          { success: false, error: 'Auditoría no encontrada' },
          { status: 404 }
        );
      }

      const audit = { id: auditDoc.id, ...auditDoc.data() } as any;
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

      // Validate status
      if (audit.status === 'completed') {
        return NextResponse.json(
          { success: false, error: 'La auditoría ya está completada' },
          { status: 400 }
        );
      }

      // Validate all norm points are verified
      const unverifiedPoints = (audit.normPointsVerification || []).filter(
        (v: any) => v.conformityStatus === null
      );

      if (unverifiedPoints.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: `Hay ${unverifiedPoints.length} punto(s) sin verificar`,
            unverifiedCodes: unverifiedPoints.map((v: any) => v.normPointCode),
          },
          { status: 400 }
        );
      }

      // Validate final report is present
      if (!audit.finalReport || audit.finalReport.trim() === '') {
        return NextResponse.json(
          {
            success: false,
            error: 'El informe final del auditor es requerido',
          },
          { status: 400 }
        );
      }

      // 2. Generate PDF content (text-based for now, can be enhanced later)
      const pdfContent = generateAuditReportContent(audit);

      // 3. Create document in ABM Documentos
      const year = new Date().getFullYear();
      const documentCode = `AUD-${audit.auditNumber || auditId.substring(0, 8)}-${year}`;

      const documentData = {
        organization_id: audit.organization_id || 'default',
        code: documentCode,
        title: `Informe de Auditoría: ${audit.title}`,
        description: `Informe final de la auditoría ${audit.auditNumber || ''} - ${audit.scope || ''}`,
        keywords: ['auditoria', 'informe', 'iso9001', audit.auditNumber].filter(
          Boolean
        ),

        type: 'registro',
        category: 'informes_auditoria',

        status: 'aprobado',
        version: '1.0',

        responsible_user_id: audit.createdBy || 'system',

        iso_clause: '9.2',
        process_id: null,
        norm_point_ids: audit.selectedNormPoints || [],

        // Content stored as text (PDF would be in Storage in production)
        content: pdfContent,
        file_path: `audits/reports/${auditId}.txt`,
        mime_type: 'text/plain',

        effective_date: new Date(),
        approved_at: new Date(),
        approved_by: audit.leadAuditor || 'Auditor Líder',

        // Metadata linking to audit
        source_audit_id: auditId,
        source_audit_number: audit.auditNumber,

        download_count: 0,
        is_archived: false,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        created_by: auth.uid,
        updated_by: auth.uid,
      };

      // Create document
      const documentsRef = db.collection('documents');
      const newDocRef = await documentsRef.add(documentData);

      // 4. Lock evidences for ISO 9001 compliance (Gemini 3)
      try {
        const lockResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/documents/lock-references`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              module: 'audits',
              recordId: auditId,
              reason: `Auditoría cerrada - Evidencia protegida por ISO 9001 (${documentCode})`,
            }),
          }
        );

        if (lockResponse.ok) {
          const lockResult = await lockResponse.json();
          console.log(
            `[CloseAudit] ${lockResult.count} evidencias bloqueadas para auditoría ${auditId}`
          );
        } else {
          console.warn(
            '[CloseAudit] No se pudieron bloquear las evidencias, pero la auditoría se cerrará'
          );
        }
      } catch (lockError) {
        console.error('[CloseAudit] Error bloqueando evidencias:', lockError);
        // No fallar el cierre si falla el bloqueo
      }

      // 5. Update audit with document reference and complete status
      await auditRef.update({
        status: 'completed',
        archivedDocumentId: newDocRef.id,
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: 'Auditoría cerrada y archivada exitosamente',
        documentId: newDocRef.id,
        documentCode: documentCode,
      });
    } catch (error) {
      console.error('Error closing and archiving audit:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Error al cerrar y archivar la auditoría',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  },
  { roles: ['admin', 'gerente', 'jefe', 'auditor', 'super_admin'] }
);

/**
 * Generate audit report content as formatted text
 */
function generateAuditReportContent(audit: any): string {
  const lines: string[] = [];
  const separator = '═'.repeat(70);
  const thinSeparator = '─'.repeat(70);

  lines.push(separator);
  lines.push('INFORME DE AUDITORÍA INTERNA');
  lines.push(separator);
  lines.push('');

  // Header
  lines.push(`Número de Auditoría: ${audit.auditNumber || 'N/A'}`);
  lines.push(`Título: ${audit.title}`);
  lines.push(
    `Tipo: ${audit.auditType === 'complete' ? 'Auditoría Completa' : 'Auditoría Parcial'}`
  );
  lines.push(`Alcance: ${audit.scope}`);
  lines.push(`Auditor Líder: ${audit.leadAuditor}`);
  lines.push('');

  // Dates
  lines.push(thinSeparator);
  lines.push('FECHAS');
  lines.push(thinSeparator);
  const plannedDate =
    audit.plannedDate?.toDate?.() || new Date(audit.plannedDate);
  lines.push(`Fecha Planificada: ${plannedDate.toLocaleDateString('es-ES')}`);
  if (audit.executionDate) {
    const execDate =
      audit.executionDate?.toDate?.() || new Date(audit.executionDate);
    lines.push(`Fecha de Ejecución: ${execDate.toLocaleDateString('es-ES')}`);
  }
  lines.push(`Fecha de Cierre: ${new Date().toLocaleDateString('es-ES')}`);
  lines.push('');

  // Initial Comments
  if (audit.initialComments) {
    lines.push(thinSeparator);
    lines.push('COMENTARIOS INICIALES');
    lines.push(thinSeparator);
    lines.push(audit.initialComments);
    lines.push('');
  }

  // Verification Summary
  lines.push(thinSeparator);
  lines.push('RESUMEN DE VERIFICACIÓN');
  lines.push(thinSeparator);

  const verifications = audit.normPointsVerification || [];
  const summary: Record<string, number> = {
    CF: 0,
    NCM: 0,
    NCm: 0,
    NCT: 0,
    R: 0,
    OM: 0,
    F: 0,
  };

  verifications.forEach((v: any) => {
    if (v.conformityStatus && summary[v.conformityStatus] !== undefined) {
      summary[v.conformityStatus]++;
    }
  });

  lines.push(`Total de Puntos Evaluados: ${verifications.length}`);
  lines.push(`✅ Cumple Satisfactoriamente (CF): ${summary.CF}`);
  lines.push(`❌ No Conformidad Mayor (NCM): ${summary.NCM}`);
  lines.push(`⚠️ No Conformidad Menor (NCm): ${summary.NCm}`);
  lines.push(`⚡ No Conformidad Trivial (NCT): ${summary.NCT}`);
  lines.push(`🔮 Riesgo (R): ${summary.R}`);
  lines.push(`💡 Oportunidad de Mejora (OM): ${summary.OM}`);
  lines.push(`💪 Fortaleza (F): ${summary.F}`);
  lines.push('');

  // Detailed Verifications
  lines.push(thinSeparator);
  lines.push('DETALLE DE VERIFICACIONES');
  lines.push(thinSeparator);

  verifications.forEach((v: any, index: number) => {
    lines.push(`${index + 1}. Punto ${v.normPointCode}`);
    lines.push(`   Estado: ${v.conformityStatus}`);
    if (v.processes && v.processes.length > 0) {
      lines.push(`   Procesos: ${v.processes.join(', ')}`);
    }
    if (v.observations) {
      lines.push(`   Observaciones: ${v.observations}`);
    }
    lines.push('');
  });

  // Final Report
  lines.push(thinSeparator);
  lines.push('INFORME FINAL DEL AUDITOR');
  lines.push(thinSeparator);
  lines.push(audit.finalReport || 'Sin informe final');
  lines.push('');

  // Footer
  lines.push(separator);
  lines.push(`Generado: ${new Date().toLocaleString('es-ES')}`);
  lines.push(separator);

  return lines.join('\n');
}
