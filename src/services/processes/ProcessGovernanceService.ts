import { getAdminFirestore } from '@/lib/firebase/admin';
import { ProcessDefinitionServiceAdmin } from '@/services/processRecords/ProcessDefinitionServiceAdmin';
import {
  DEFAULT_GOVERNANCE_CONFIG,
  DEFAULT_GOVERNANCE_THRESHOLDS,
  GovernanceAlert,
  GovernanceConfig,
  GovernanceScanResult,
  GovernanceThresholdConfig,
  ProcessComplianceReport,
  ProcessDefinition,
} from '@/types/processes-unified';
import { Timestamp } from 'firebase-admin/firestore';
import { ProcessComplianceEngine } from './ProcessComplianceEngine';

export class ProcessGovernanceService {
  /**
   * Ejecuta un escaneo completo de gobernanza para una organizacion.
   * Analiza todos los procesos activos y genera alertas si hay desviaciones.
   */
  static async runComplianceScan(
    organizationId: string
  ): Promise<GovernanceScanResult> {
    const processes =
      await ProcessDefinitionServiceAdmin.getAllActive(organizationId);
    const governanceConfig = await this.getGovernanceConfig(organizationId);

    const alerts: GovernanceAlert[] = [];
    let totalMaturity = 0;

    for (const process of processes) {
      const report = await ProcessComplianceEngine.generateReport(
        process.id,
        organizationId,
        governanceConfig.thresholds
      );

      totalMaturity += report.maturity.score;

      const processAlerts = governanceConfig.enabled
        ? this.generateAlertsForProcess(
            process,
            report,
            governanceConfig.thresholds
          )
        : [];

      alerts.push(...processAlerts);
    }

    return {
      scan_id: `scan_${Date.now()}_${organizationId}`,
      organization_id: organizationId,
      scanned_at: Timestamp.now().toDate(),
      processes_scanned: processes.length,
      average_maturity:
        processes.length > 0 ? Math.round(totalMaturity / processes.length) : 0,
      alerts_generated: alerts,
    };
  }

  /**
   * Genera alertas especificas para un proceso basado en su reporte de cumplimiento.
   */
  private static generateAlertsForProcess(
    process: ProcessDefinition,
    report: ProcessComplianceReport,
    thresholds: GovernanceThresholdConfig
  ): GovernanceAlert[] {
    const alerts: GovernanceAlert[] = [];

    // Alerta 1: Madurez baja segun umbral configurable
    if (report.maturity.level < thresholds.low_maturity_alert_level) {
      const isCritical =
        report.maturity.level <= thresholds.critical_maturity_level;

      alerts.push({
        id: `alert_${Date.now()}_${process.id}_maturity`,
        organization_id: process.organization_id,
        process_id: process.id,
        process_name: process.nombre,
        type: 'low_maturity',
        severity: isCritical ? 'critical' : 'high',
        message: `El proceso "${process.nombre}" tiene nivel de madurez ${report.maturity.level} (${report.maturity.label}), por debajo del umbral minimo ${thresholds.low_maturity_alert_level}.`,
        details: {
          level: report.maturity.level,
          threshold: thresholds.low_maturity_alert_level,
        },
        suggested_agent_action: 'iso.process.define_sipoc',
        created_at: Timestamp.now().toDate(),
        status: 'active',
      });
    }

    // Alerta 2: Controles faltantes
    const missingControls = report.inconsistencies.filter(
      inconsistency => inconsistency.type === 'missing_control'
    );

    if (missingControls.length >= thresholds.missing_controls_alert_min_count) {
      alerts.push({
        id: `alert_${Date.now()}_${process.id}_controls`,
        organization_id: process.organization_id,
        process_id: process.id,
        process_name: process.nombre,
        type: 'missing_controls',
        severity: 'critical',
        message: `El proceso "${process.nombre}" tiene actividades criticas sin controles definidos.`,
        details: {
          missing_count: missingControls.length,
          threshold: thresholds.missing_controls_alert_min_count,
        },
        suggested_agent_action: 'iso.control.create',
        created_at: Timestamp.now().toDate(),
        status: 'active',
      });
    }

    // Alerta 3: Riesgos con alta exposicion
    const highRiskIssues = report.inconsistencies.filter(inconsistency => {
      if (inconsistency.type === 'risk_exposure') {
        return true;
      }
      return (
        inconsistency.type === 'missing_evidence' &&
        inconsistency.description.includes('RPN')
      );
    });

    if (highRiskIssues.length > 0) {
      alerts.push({
        id: `alert_${Date.now()}_${process.id}_risks`,
        organization_id: process.organization_id,
        process_id: process.id,
        process_name: process.nombre,
        type: 'risk_exposure',
        severity: 'high',
        message: `El proceso "${process.nombre}" tiene riesgos con exposicion por RPN o sin evaluacion/mitigacion completa.`,
        details: {
          findings_count: highRiskIssues.length,
          high_rpn_threshold: thresholds.high_rpn_threshold,
        },
        suggested_agent_action: 'iso.risk.assess',
        created_at: Timestamp.now().toDate(),
        status: 'active',
      });
    }

    return alerts;
  }

  static async getGovernanceConfig(
    organizationId: string
  ): Promise<GovernanceConfig> {
    const db = getAdminFirestore();
    const orgRef = db.collection('organizations').doc(organizationId);
    const orgSnap = await orgRef.get();

    const rawConfig = orgSnap.exists ? orgSnap.data()?.governance_config : null;
    return this.normalizeGovernanceConfig(rawConfig);
  }

  static async upsertGovernanceConfig(
    organizationId: string,
    incoming: Partial<GovernanceConfig>,
    updatedBy = 'system'
  ): Promise<GovernanceConfig> {
    const db = getAdminFirestore();
    const orgRef = db.collection('organizations').doc(organizationId);
    const current = await this.getGovernanceConfig(organizationId);

    const merged: GovernanceConfig = {
      enabled:
        typeof incoming.enabled === 'boolean'
          ? incoming.enabled
          : current.enabled,
      thresholds: this.sanitizeThresholds({
        ...current.thresholds,
        ...(incoming.thresholds || {}),
      }),
      updated_at: Timestamp.now().toDate(),
      updated_by: updatedBy,
    };

    await orgRef.set(
      {
        governance_config: merged,
        updated_at: Timestamp.now().toDate(),
      },
      { merge: true }
    );

    return merged;
  }

  private static normalizeGovernanceConfig(raw: any): GovernanceConfig {
    if (!raw || typeof raw !== 'object') {
      return {
        ...DEFAULT_GOVERNANCE_CONFIG,
        thresholds: { ...DEFAULT_GOVERNANCE_THRESHOLDS },
      };
    }

    return {
      enabled:
        typeof raw.enabled === 'boolean'
          ? raw.enabled
          : DEFAULT_GOVERNANCE_CONFIG.enabled,
      thresholds: this.sanitizeThresholds(raw.thresholds),
      updated_at: raw.updated_at,
      updated_by:
        typeof raw.updated_by === 'string' ? raw.updated_by : undefined,
    };
  }

  private static sanitizeThresholds(
    raw: Partial<GovernanceThresholdConfig> | undefined
  ): GovernanceThresholdConfig {
    const source = raw || {};

    const clamp = (
      value: unknown,
      min: number,
      max: number,
      fallback: number
    ): number => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return fallback;
      }
      return Math.min(max, Math.max(min, Math.round(numeric)));
    };

    return {
      low_maturity_alert_level: clamp(
        source.low_maturity_alert_level,
        1,
        5,
        DEFAULT_GOVERNANCE_THRESHOLDS.low_maturity_alert_level
      ),
      critical_maturity_level: clamp(
        source.critical_maturity_level,
        1,
        5,
        DEFAULT_GOVERNANCE_THRESHOLDS.critical_maturity_level
      ),
      missing_controls_alert_min_count: clamp(
        source.missing_controls_alert_min_count,
        1,
        999,
        DEFAULT_GOVERNANCE_THRESHOLDS.missing_controls_alert_min_count
      ),
      high_rpn_threshold: clamp(
        source.high_rpn_threshold,
        1,
        1000,
        DEFAULT_GOVERNANCE_THRESHOLDS.high_rpn_threshold
      ),
      max_high_severity_for_optimized: clamp(
        source.max_high_severity_for_optimized,
        0,
        999,
        DEFAULT_GOVERNANCE_THRESHOLDS.max_high_severity_for_optimized
      ),
    };
  }
}
