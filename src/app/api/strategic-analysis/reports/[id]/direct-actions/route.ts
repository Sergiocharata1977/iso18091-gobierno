import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';
import { DirectActionService } from '@/services/direct-actions';
import { StrategicAnalysisReportService } from '@/services/strategic-analysis/StrategicAnalysisReportService';
import type { DirectActionEntity, DirectActionRequest, DirectActionType } from '@/types/direct-actions';
import type { StrategicSuggestedAction } from '@/types/strategic-analysis';
import { NextResponse } from 'next/server';

const WRITE_ROLES = ['admin', 'gerente', 'jefe', 'super_admin'] as const;
const ALLOWED_ENTITIES: DirectActionEntity[] = [
  'audit',
  'finding',
  'action',
  'process-record',
  'training',
  'evaluation',
];
const ALLOWED_TYPES: DirectActionType[] = ['CREATE', 'UPDATE', 'ASSIGN', 'CHANGE_STATUS'];

type Body = {
  actionId?: string;
  preset?: 'audit19011';
};

function toDirectActionRequest(
  reportId: string,
  suggested: StrategicSuggestedAction
): DirectActionRequest {
  const entity: DirectActionEntity = ALLOWED_ENTITIES.includes(suggested.entity as DirectActionEntity)
    ? (suggested.entity as DirectActionEntity)
    : 'action';
  const type: DirectActionType = ALLOWED_TYPES.includes(suggested.actionType as DirectActionType)
    ? (suggested.actionType as DirectActionType)
    : 'CREATE';

  return {
    type,
    entity,
    data: {
      ...suggested.payload,
      strategic_report_id: reportId,
      strategic_action_id: suggested.id,
      strategic_action_title: suggested.title,
    },
    reason: suggested.rationale,
    requiresConfirmation: true,
  };
}

function buildAudit19011Fallback(reportId: string): StrategicSuggestedAction {
  return {
    id: 'auto-audit-19011',
    actionType: 'CREATE',
    entity: 'audit',
    title: 'Programar auditoria interna focalizada',
    description: 'Crear auditoria interna extraordinaria sobre hallazgos y acciones vencidas.',
    payload: {
      titulo: 'Auditoria interna focalizada por analisis estrategico',
      estado: 'pendiente',
      origen: 'analisis_estrategico_ia',
      referencia_norma: 'ISO 19011',
      strategic_report_id: reportId,
    },
    requiresConfirmation: true,
    safeToAutoPrepare: true,
    rationale: 'Sugerencia 19011 para validar la efectividad del sistema sobre desvio detectado.',
  };
}

export const POST = withAuth(
  async (req, context, auth) => {
    try {
      const orgScope = await resolveAuthorizedOrganizationId(auth, auth.organizationId, {
        requireOrg: true,
      });
      if (!orgScope.ok || !orgScope.organizationId) {
        return NextResponse.json(
          { error: orgScope.error ?? 'Sin organizacion', errorCode: orgScope.errorCode },
          { status: orgScope.status ?? 403 }
        );
      }

      const { id: reportId } = await context.params;
      if (!reportId) {
        return NextResponse.json({ error: 'ID de reporte requerido' }, { status: 400 });
      }

      const report = await StrategicAnalysisReportService.getById(orgScope.organizationId, reportId);
      if (!report) {
        return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 });
      }

      const body = (await req.json().catch(() => ({}))) as Body;

      let suggested: StrategicSuggestedAction | undefined;
      if (body.preset === 'audit19011') {
        suggested = buildAudit19011Fallback(report.id);
      } else if (body.actionId) {
        suggested = report.suggested_actions.find(item => item.id === body.actionId);
      } else {
        suggested = report.suggested_actions[0];
      }

      if (!suggested) {
        return NextResponse.json({ error: 'No hay accion sugerida disponible' }, { status: 400 });
      }

      const directActionRequest = toDirectActionRequest(report.id, suggested);
      const result = await DirectActionService.createActionRequest(
        auth.uid,
        `strategic-analysis:${report.id}`,
        directActionRequest
      );

      return NextResponse.json({ action: result, confirmationUrl: result.confirmationUrl, suggested });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error interno';
      return NextResponse.json({ error: message }, { status: 500 });
    }
  },
  { roles: [...WRITE_ROLES] }
);
