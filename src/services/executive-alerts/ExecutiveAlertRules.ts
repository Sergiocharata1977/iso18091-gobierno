import { Timestamp } from 'firebase-admin/firestore';
import type { ExecutiveAlert } from '@/types/executive-alerts';

type DateLike = Date | Timestamp;

export class ExecutiveAlertRules {
  static alertsFromStrategicAnalysis(report: {
    id: string;
    org_id: string;
    confidence_level?: string;
    global_score?: number;
    norm_gaps?: Array<{ area: string; score: number; gap_description?: string }>;
    created_at: Timestamp;
  }): ExecutiveAlert[] {
    const alerts: ExecutiveAlert[] = [];

    if (report.confidence_level === 'bajo') {
      alerts.push(
        this.buildAlert({
          source: 'confidence',
          source_ref_id: report.id,
          severity: 'alta',
          title: 'Analisis con baja confianza',
          description:
            'El reporte fue generado con nivel de confianza bajo y requiere validacion ejecutiva antes de tomar decisiones.',
          affected_entity: 'analisis_estrategico',
          requires_human_decision: true,
          recommended_action:
            'Revisar fuentes faltantes y validar manualmente las conclusiones criticas antes de ejecutar acciones.',
          org_id: report.org_id,
        })
      );
    }

    for (const gap of report.norm_gaps ?? []) {
      if (gap.score < 40) {
        alerts.push(
          this.buildAlert({
            source: 'strategic_analysis',
            source_ref_id: report.id,
            severity: 'alta',
            title: `Brecha severa en ${gap.area}`,
            description:
              gap.gap_description ??
              `Se detecto una brecha severa en ${gap.area} con score ${gap.score}.`,
            affected_entity: gap.area,
            requires_human_decision: true,
            recommended_action:
              'Definir un plan de contencion inmediato y asignar responsable ejecutivo para seguimiento.',
            org_id: report.org_id,
          })
        );
      }
    }

    if (typeof report.global_score === 'number' && report.global_score < 50) {
      alerts.push(
        this.buildAlert({
          source: 'strategic_analysis',
          source_ref_id: report.id,
          severity: 'media',
          title: 'Score global estrategico bajo',
          description: `El analisis estrategico arrojo un score global de ${report.global_score}, por debajo del umbral esperado.`,
          affected_entity: 'organizacion',
          requires_human_decision: true,
          recommended_action:
            'Priorizar un plan de recuperacion con foco en las dimensiones mas degradadas.',
          org_id: report.org_id,
        })
      );
    }

    return alerts;
  }

  static alertsFromAgingBacklog(params: {
    org_id: string;
    pending_approvals: Array<{
      id: string;
      created_at: Date | Timestamp;
      entity_description?: string;
    }>;
    max_days_before_alert: number;
  }): ExecutiveAlert[] {
    return params.pending_approvals
      .filter(approval => this.daysSince(approval.created_at) > params.max_days_before_alert)
      .map(approval =>
        this.buildAlert({
          source: 'aging',
          source_ref_id: approval.id,
          severity: 'alta',
          title: 'Aprobacion pendiente envejecida',
          description: `La aprobacion pendiente supera ${params.max_days_before_alert} dias sin resolucion.`,
          affected_entity: approval.entity_description,
          requires_human_decision: true,
          recommended_action:
            'Resolver la aprobacion o reasignarla a un responsable con capacidad de decision.',
          org_id: params.org_id,
        })
      );
  }

  static alertsFromBlockedSagas(params: {
    org_id: string;
    blocked_sagas: Array<{
      id: string;
      name?: string;
      paused_at?: Date | Timestamp;
      status: string;
    }>;
  }): ExecutiveAlert[] {
    return params.blocked_sagas
      .filter(
        saga =>
          saga.status === 'paused' &&
          saga.paused_at &&
          this.daysSince(saga.paused_at) > 7
      )
      .map(saga =>
        this.buildAlert({
          source: 'agentic_center',
          source_ref_id: saga.id,
          severity: 'media',
          title: 'Saga bloqueada por mas de 7 dias',
          description: `La saga ${saga.name ?? saga.id} permanece pausada hace mas de 7 dias.`,
          affected_entity: saga.name,
          requires_human_decision: true,
          recommended_action:
            'Revisar el bloqueo, decidir si se reanuda el flujo o si corresponde cerrarlo manualmente.',
          org_id: params.org_id,
        })
      );
  }

  private static buildAlert(params: {
    source: ExecutiveAlert['source'];
    source_ref_id?: string;
    severity: ExecutiveAlert['severity'];
    title: string;
    description: string;
    affected_entity?: string;
    requires_human_decision: boolean;
    recommended_action?: string;
    org_id: string;
  }): ExecutiveAlert {
    return {
      id: `${params.source}-${params.source_ref_id || Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      severity: params.severity,
      source: params.source,
      source_ref_id: params.source_ref_id,
      title: params.title,
      description: params.description,
      affected_entity: params.affected_entity,
      requires_human_decision: params.requires_human_decision,
      recommended_action: params.recommended_action,
      created_at: Timestamp.now(),
      org_id: params.org_id,
    };
  }

  private static daysSince(value: DateLike): number {
    const date = value instanceof Date ? value : value.toDate();
    const diffMs = Date.now() - date.getTime();
    return diffMs / (1000 * 60 * 60 * 24);
  }
}
