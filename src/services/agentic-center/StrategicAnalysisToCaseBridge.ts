import type {
  AgenticCenterActionCard,
  AgenticCenterCase,
  AgenticCenterEvent,
  AgenticCenterTimelineItem,
} from '@/types/agentic-center';
import type { ExecutiveAlert } from '@/types/executive-alerts';
import type {
  StrategicAnalysisReport,
  StrategicNormGap,
  StrategicPriority,
} from '@/types/strategic-analysis';

type BridgeableStrategicReport = Pick<
  StrategicAnalysisReport,
  | 'id'
  | 'created_at'
  | 'confidence_level'
  | 'norm_gaps'
  | 'priorities'
  | 'executive_alerts'
>;

type ScoredNormGap = StrategicNormGap & {
  area?: string;
  score?: number;
  gap_description?: string;
};

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

function isRecentReport(createdAt: string): boolean {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return false;
  return Date.now() - createdTime <= NINETY_DAYS_MS;
}

function normalizePriorityImpact(
  impacto: StrategicPriority['impacto'] | 'alto' | 'critico' | string
): 'critico' | 'alto' | 'other' {
  if (impacto === 'critico' || impacto === 'critical') return 'critico';
  if (impacto === 'alto' || impacto === 'high') return 'alto';
  return 'other';
}

function buildWorkflow(timestamp: string, waitingLabel: string): AgenticCenterTimelineItem[] {
  return [
    {
      paso: 1,
      label: 'Reporte estrategico analizado',
      estado: 'completado',
      timestamp_opcional: timestamp,
    },
    {
      paso: 2,
      label: 'Bridge genera caso trazable para el Centro Agentico',
      estado: 'completado',
      timestamp_opcional: timestamp,
    },
    {
      paso: 3,
      label: waitingLabel,
      estado: 'activo',
      timestamp_opcional: timestamp,
    },
  ];
}

function buildActionCard(actionId: string, titulo: string, descripcion: string): AgenticCenterActionCard {
  return {
    actionId,
    titulo,
    descripcion_negocio: descripcion,
    entidad: 'Reporte estrategico',
    tipo_operacion: 'Revisar y decidir accion',
    estado: 'pendiente',
  };
}

function buildBaseCase(params: {
  id: string;
  orgId: string;
  reportId: string;
  createdAt: string;
  titulo: string;
  descripcion: string;
  eventType: string;
  eventDescription: string;
  severity: 'alta' | 'media';
  type: 'brecha_normativa' | 'alerta_ejecutiva' | 'accion_estrategica';
  waitingLabel: string;
  confidenceLevel?: 'alto' | 'medio' | 'bajo';
}): AgenticCenterCase {
  const evento: AgenticCenterEvent = {
    id: `event-${params.id}`,
    tipo: params.eventType,
    descripcion: params.eventDescription,
    origen: 'sistema',
    timestamp: params.createdAt,
    prioridad: params.severity === 'alta' ? 'alta' : 'media',
  };

  return {
    id: params.id,
    titulo: params.titulo,
    descripcion: params.descripcion,
    estado: 'esperando',
    timestamp: params.createdAt,
    evento_detectado: evento,
    workflow_pasos: buildWorkflow(params.createdAt, params.waitingLabel),
    accion_propuesta: buildActionCard(params.id, params.titulo, params.descripcion),
    persona_target: null,
    evidencia_final: null,
    type: params.type,
    source_entity: 'strategic_analysis_report',
    source_id: params.reportId,
    severity: params.severity,
    requires_human_decision: true,
    confidence_level: params.confidenceLevel,
    org_id: params.orgId,
  };
}

export class StrategicAnalysisToCaseBridge {
  toBridgedCases(report: BridgeableStrategicReport, orgId: string): AgenticCenterCase[] {
    if (!report.id || !isRecentReport(report.created_at)) {
      return [];
    }

    const bridgedCases: AgenticCenterCase[] = [];
    let index = 0;

    for (const gap of (report.norm_gaps ?? []) as ScoredNormGap[]) {
      if (typeof gap.score !== 'number' || gap.score >= 40) continue;

      const caseId = `bridge-${report.id}-${index++}`;
      const area = gap.area ?? gap.clausula ?? gap.titulo;
      bridgedCases.push(
        buildBaseCase({
          id: caseId,
          orgId,
          reportId: report.id,
          createdAt: report.created_at,
          titulo: `Brecha normativa severa - ${gap.titulo}`,
          descripcion:
            gap.gap_description ??
            `${gap.descripcion} Score detectado: ${gap.score}. Requiere decision ejecutiva antes de avanzar.`,
          eventType: 'Brecha normativa severa',
          eventDescription: `Se detecto una brecha normativa severa en ${area} asociada al reporte estrategico ${report.id}.`,
          severity: 'alta',
          type: 'brecha_normativa',
          waitingLabel: 'Pendiente de decision humana sobre plan de contencion',
          confidenceLevel: report.confidence_level,
        })
      );
    }

    for (const alert of report.executive_alerts ?? []) {
      if (!this.isCriticalExecutiveAlert(alert)) continue;

      const caseId = `bridge-${report.id}-${index++}`;
      bridgedCases.push(
        buildBaseCase({
          id: caseId,
          orgId,
          reportId: report.id,
          createdAt: report.created_at,
          titulo: `Alerta ejecutiva critica - ${alert.title}`,
          descripcion: alert.description,
          eventType: 'Alerta ejecutiva critica',
          eventDescription: `${alert.title}. ${alert.description}`,
          severity: 'alta',
          type: 'alerta_ejecutiva',
          waitingLabel: 'Pendiente de decision humana para tratamiento ejecutivo',
          confidenceLevel: report.confidence_level,
        })
      );
    }

    for (const priority of report.priorities ?? []) {
      const normalizedImpact = normalizePriorityImpact(priority.impacto);
      if (priority.horizonte !== '30d') continue;
      if (normalizedImpact !== 'critico' && normalizedImpact !== 'alto') continue;

      const caseId = `bridge-${report.id}-${index++}`;
      bridgedCases.push(
        buildBaseCase({
          id: caseId,
          orgId,
          reportId: report.id,
          createdAt: report.created_at,
          titulo: `Accion estrategica prioritaria - ${priority.titulo}`,
          descripcion: priority.descripcion,
          eventType: 'Prioridad estrategica de 30 dias',
          eventDescription: `${priority.titulo}. Impacto ${normalizedImpact} y horizonte ${priority.horizonte}.`,
          severity: 'media',
          type: 'accion_estrategica',
          waitingLabel: 'Pendiente de decision humana para ejecutar la prioridad estrategica',
          confidenceLevel: report.confidence_level,
        })
      );
    }

    return bridgedCases;
  }

  private isCriticalExecutiveAlert(alert: ExecutiveAlert): boolean {
    return alert.severity === 'critica';
  }
}
