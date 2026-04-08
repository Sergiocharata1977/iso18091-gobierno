import { StrategicAnalysisReportService } from '@/services/strategic-analysis/StrategicAnalysisReportService';
import type { StrategicAnalysisReport, StrategicFinding } from '@/types/strategic-analysis';

export interface JourneyPhaseBadge {
  phaseId: number;
  level: 'warning' | 'critical';
  count: number;
  topFinding: string;
  reportId: string;
}

const DIMENSION_TO_PHASES: Record<string, number[]> = {
  leadership: [2],
  policy: [2],
  objectives: [2],
  processes: [3, 4],
  operations: [3, 4],
  documentation: [3],
  personnel: [4],
  training: [4],
  competences: [4],
  audits: [5],
  monitoring: [5],
  measurement: [5],
  nonconformity: [6],
  corrective_actions: [6],
  context: [1],
  interested_parties: [1],
  infrastructure: [4],
  resources: [4],
  findings_actions: [6],
  kpis: [5],
  rrhh: [4],
  audit_program: [5],
  governance: [2],
};

const SEVERITY_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

interface BadgeAccumulator {
  phaseId: number;
  count: number;
  hasCritical: boolean;
  topFinding: string;
  topSeverity: number;
}

function normalizeDimension(value: string | undefined): string {
  return (value || '').trim().toLowerCase();
}

function resolvePhaseIds(finding: StrategicFinding): number[] {
  const dimension = normalizeDimension(finding.dimension);
  return DIMENSION_TO_PHASES[dimension] || [];
}

function getSeverityRank(level: StrategicFinding['level']): number {
  return SEVERITY_RANK[level] || 0;
}

function getRelevantFindings(report: StrategicAnalysisReport): StrategicFinding[] {
  const findings = Array.isArray(report.strategic_findings)
    ? report.strategic_findings
    : [];
  const alerts = Array.isArray(report.risks_alerts) ? report.risks_alerts : [];

  return [...findings, ...alerts].filter(
    finding => finding.level === 'high' || finding.level === 'critical'
  );
}

export class JourneyStrategicBadgeService {
  static async getBadgesForOrg(
    organizationId: string
  ): Promise<JourneyPhaseBadge[]> {
    const reports = await StrategicAnalysisReportService.list(organizationId, {
      limit: 1,
    });
    const latestReport = reports[0];

    if (!latestReport) {
      return [];
    }

    const grouped = new Map<number, BadgeAccumulator>();

    for (const finding of getRelevantFindings(latestReport)) {
      const phaseIds = resolvePhaseIds(finding);
      if (phaseIds.length === 0) continue;

      const severity = getSeverityRank(finding.level);
      const title = finding.titulo?.trim() || 'Hallazgo sin titulo';

      for (const phaseId of phaseIds) {
        const current = grouped.get(phaseId) || {
          phaseId,
          count: 0,
          hasCritical: false,
          topFinding: title,
          topSeverity: severity,
        };

        current.count += 1;
        current.hasCritical = current.hasCritical || finding.level === 'critical';

        if (
          severity > current.topSeverity ||
          (severity === current.topSeverity && !current.topFinding)
        ) {
          current.topSeverity = severity;
          current.topFinding = title;
        }

        grouped.set(phaseId, current);
      }
    }

    return Array.from(grouped.values())
      .sort((a, b) => a.phaseId - b.phaseId)
      .map(({ phaseId, count, hasCritical, topFinding }) => ({
        phaseId,
        level: hasCritical ? 'critical' : 'warning',
        count,
        topFinding,
        reportId: latestReport.id,
      }));
  }
}
