import { getAdminFirestore } from '@/lib/firebase/admin';
import { ProcessDefinitionServiceAdmin } from '@/services/processRecords/ProcessDefinitionServiceAdmin';
import {
  DEFAULT_GOVERNANCE_THRESHOLDS,
  GovernanceThresholdConfig,
  Inconsistency,
  MaturityScore,
  ProcessComplianceReport,
  ProcessSIPOC,
} from '@/types/processes-unified';
import { Timestamp } from 'firebase-admin/firestore';

export class ProcessComplianceEngine {
  /**
   * Genera un reporte de cumplimiento para un proceso especifico.
   * Analiza la estructura SIPOC, controles, riesgos e indicadores.
   */
  static async generateReport(
    processId: string,
    organizationId?: string,
    thresholds?: GovernanceThresholdConfig
  ): Promise<ProcessComplianceReport> {
    const process =
      await ProcessDefinitionServiceAdmin.getByIdWithRelations(processId);

    if (!process) {
      throw new Error(`Process ${processId} not found`);
    }

    // Validar acceso por organizacion si se proporciona
    if (organizationId && process.organization_id !== organizationId) {
      throw new Error(
        `Acceso denegado: El proceso no pertenece a la organizacion ${organizationId}`
      );
    }

    const effectiveThresholds =
      thresholds ||
      (process.organization_id
        ? await this.getOrganizationThresholds(process.organization_id)
        : { ...DEFAULT_GOVERNANCE_THRESHOLDS });

    const sipoc = process.sipoc;
    const inconsistencies = this.findInconsistencies(
      sipoc,
      effectiveThresholds
    );
    const maturity = this.calculateMaturity(
      sipoc,
      inconsistencies,
      effectiveThresholds
    );

    return {
      process_id: processId,
      generated_at: Timestamp.now().toDate(),
      maturity,
      inconsistencies,
      missing_controls_count: inconsistencies.filter(
        inconsistency => inconsistency.type === 'missing_control'
      ).length,
      open_findings_count: 0, // TODO: Integrar con modulo de hallazgos
      indicators_status: {
        total: sipoc.controls.filter(control => control.type === 'indicator')
          .length,
        with_measurements: 0, // TODO: Integrar con modulo de indicadores
        within_target: 0, // TODO: Integrar con modulo de indicadores
      },
    };
  }

  /**
   * Detecta inconsistencias en la definicion del proceso
   */
  private static findInconsistencies(
    sipoc: ProcessSIPOC,
    thresholds: GovernanceThresholdConfig
  ): Inconsistency[] {
    const inconsistencies: Inconsistency[] = [];

    // 1. Verificar controles faltantes si hay actividades criticas
    if (sipoc.activities.length > 0 && sipoc.controls.length === 0) {
      inconsistencies.push({
        type: 'missing_control',
        description:
          'El proceso tiene actividades definidas pero ningun control asociado.',
        severity: 'high',
      });
    }

    // 2. Verificar inputs sin proveedor
    sipoc.inputs.forEach(input => {
      if (!input.supplier) {
        inconsistencies.push({
          type: 'missing_evidence',
          description: `La entrada "${input.description}" no tiene proveedor asignado.`,
          element_id: input.id,
          severity: 'medium',
        });
      }
    });

    // 3. Verificar outputs sin cliente
    sipoc.outputs.forEach(output => {
      if (!output.customer) {
        inconsistencies.push({
          type: 'missing_evidence',
          description: `La salida "${output.description}" no tiene cliente asignado.`,
          element_id: output.id,
          severity: 'medium',
        });
      }
    });

    // 4. Verificar riesgos sin RPN calculado o sin controles efectivos en RPN alto
    sipoc.risks.forEach(risk => {
      if (!risk.rpn || risk.rpn === 0) {
        inconsistencies.push({
          type: 'missing_evidence',
          description: `El riesgo "${risk.description}" no tiene RPN calculado.`,
          element_id: risk.id,
          severity: 'high',
        });
      }

      const hasMitigation = Boolean(risk.current_control?.trim());
      if ((risk.rpn || 0) >= thresholds.high_rpn_threshold && !hasMitigation) {
        inconsistencies.push({
          type: 'risk_exposure',
          description: `El riesgo "${risk.description}" tiene RPN ${risk.rpn} (>= ${thresholds.high_rpn_threshold}) sin control de mitigacion.`,
          element_id: risk.id,
          severity: 'high',
        });
      }
    });

    return inconsistencies;
  }

  /**
   * Calcula el nivel de madurez del proceso (1-5)
   */
  private static calculateMaturity(
    sipoc: ProcessSIPOC,
    inconsistencies: Inconsistency[],
    thresholds: GovernanceThresholdConfig
  ): MaturityScore {
    let level: 1 | 2 | 3 | 4 | 5 = 1;
    let score = 20; // Base: Nivel 1 (Existencia)
    const criteria: string[] = ['Definicion basica del proceso'];
    const nextSteps: string[] = [];

    // Nivel 2: Estructura SIPOC completa
    const hasInputs = sipoc.inputs.length > 0;
    const hasOutputs = sipoc.outputs.length > 0;
    const hasActivities = sipoc.activities.length > 0;

    if (hasInputs && hasOutputs && hasActivities) {
      if (level < 2) {
        level = 2;
        score += 20;
        criteria.push('Estructura SIPOC completa (E-P-S)');
      }
    } else {
      nextSteps.push(
        'Completar estructura SIPOC (Entradas, Salidas, Actividades)'
      );
    }

    // Nivel 3: Controlado (Controles y Riesgos)
    const hasControls = sipoc.controls.length > 0;
    const hasRisks = sipoc.risks.length > 0;

    if (level === 2 && hasControls && hasRisks) {
      level = 3;
      score += 20;
      criteria.push('Controles y Riesgos identificados');
    } else if (level === 2) {
      if (!hasControls) {
        nextSteps.push('Definir controles para las actividades');
      }
      if (!hasRisks) {
        nextSteps.push('Identificar riesgos del proceso (AMFE)');
      }
    }

    // Nivel 4: Gestionado (Indicadores definidos)
    const hasIndicators = sipoc.controls.some(
      control => control.type === 'indicator'
    );

    if (level === 3 && hasIndicators) {
      level = 4;
      score += 20;
      criteria.push('Indicadores de gestion definidos');
    } else if (level === 3) {
      nextSteps.push('Definir indicadores de gestion para los controles');
    }

    // Nivel 5: Optimizado (sin inconsistencias de alta severidad sobre el umbral permitido)
    const highSeverityInconsistencies = inconsistencies.filter(
      inconsistency => inconsistency.severity === 'high'
    ).length;

    if (
      level === 4 &&
      highSeverityInconsistencies <= thresholds.max_high_severity_for_optimized
    ) {
      level = 5;
      score = 100;
      criteria.push('Estructura optimizada sin inconsistencias criticas');
    } else if (level === 4) {
      nextSteps.push('Resolver inconsistencias criticas detectadas');
    }

    return {
      level,
      score,
      label: this.getMaturityLabel(level),
      criteria_met: criteria,
      next_steps: nextSteps,
    };
  }

  private static getMaturityLabel(level: number): string {
    switch (level) {
      case 1:
        return 'Inicial';
      case 2:
        return 'Definido';
      case 3:
        return 'Controlado';
      case 4:
        return 'Gestionado';
      case 5:
        return 'Optimizado';
      default:
        return 'Desconocido';
    }
  }

  private static async getOrganizationThresholds(
    organizationId: string
  ): Promise<GovernanceThresholdConfig> {
    const db = getAdminFirestore();
    const orgSnap = await db
      .collection('organizations')
      .doc(organizationId)
      .get();

    if (!orgSnap.exists) {
      return { ...DEFAULT_GOVERNANCE_THRESHOLDS };
    }

    const rawThresholds = orgSnap.data()?.governance_config?.thresholds;
    return this.sanitizeThresholds(rawThresholds);
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
