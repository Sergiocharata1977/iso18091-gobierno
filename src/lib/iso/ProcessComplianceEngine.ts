import { ProcessDefinition, ProcessSIPOC } from '@/types/processes-unified';

export interface ComplianceIssue {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  section: 'general' | 'sipoc' | 'risks' | 'controls' | 'resources';
  suggestion?: string;
}

export interface ComplianceReport {
  score: number;
  issues: ComplianceIssue[];
  audit_checklist: string[];
}

export class ProcessComplianceEngine {
  /**
   * Valida un proceso contra los requisitos ISO 9001:2015
   */
  static validate(process: ProcessDefinition): ComplianceReport {
    const issues: ComplianceIssue[] = [];
    const checklist: string[] = [];

    // 1. Validación General (4.4.1)
    this.validateGeneral(process, issues, checklist);

    // 2. Validación SIPOC (4.4.1 a, b, c)
    if (process.sipoc) {
      this.validateSIPOC(process.sipoc, issues, checklist);
    } else {
      issues.push({
        severity: 'critical',
        message: 'No se ha definido la estructura SIPOC',
        section: 'sipoc',
        suggestion:
          'Utilice el editor SIPOC para definir Entradas, Salidas y Actividades.',
      });
    }

    // 3. Calcular Score
    const score = this.calculateScore(issues);

    return {
      score,
      issues,
      audit_checklist: checklist,
    };
  }

  private static validateGeneral(
    process: ProcessDefinition,
    issues: ComplianceIssue[],
    checklist: string[]
  ) {
    if (!process.objetivo) {
      issues.push({
        severity: 'critical',
        message: 'Falta definir el Objetivo del proceso',
        section: 'general',
        suggestion: 'Defina qué resultado busca lograr este proceso.',
      });
    } else {
      checklist.push(`¿Se cumple el objetivo definido: "${process.objetivo}"?`);
    }

    if (!process.alcance) {
      issues.push({
        severity: 'warning',
        message: 'Falta definir el Alcance del proceso',
        section: 'general',
        suggestion: 'Defina los límites (inicio y fin) del proceso.',
      });
    }

    if (!process.jefe_proceso_id && !process.owner_position_id) {
      issues.push({
        severity: 'critical',
        message: 'No hay Responsable/Dueño de proceso asignado (5.3)',
        section: 'resources',
        suggestion: 'Asigne un usuario o puesto responsable.',
      });
    } else {
      checklist.push(
        '¿El responsable del proceso conoce sus funciones y responsabilidades?'
      );
    }
  }

  private static validateSIPOC(
    sipoc: ProcessSIPOC,
    issues: ComplianceIssue[],
    checklist: string[]
  ) {
    // Entradas
    if (sipoc.inputs.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'No hay Entradas definidas',
        section: 'sipoc',
      });
    } else {
      sipoc.inputs.forEach(input => {
        if (!input.supplier) {
          issues.push({
            severity: 'info',
            message: `La entrada "${input.description}" no tiene Proveedor asignado`,
            section: 'sipoc',
          });
        }
      });
    }

    // Actividades
    if (sipoc.activities.length === 0) {
      issues.push({
        severity: 'critical',
        message: 'No hay Actividades definidas (4.4.1 c)',
        section: 'sipoc',
        suggestion: 'Describa el paso a paso del proceso.',
      });
    } else {
      sipoc.activities.forEach((act, idx) => {
        if (!act.responsible_position_id) {
          issues.push({
            severity: 'warning',
            message: `La actividad #${idx + 1} "${act.name}" no tiene rol responsable`,
            section: 'sipoc',
          });
        }
      });
    }

    // Salidas
    if (sipoc.outputs.length === 0) {
      issues.push({
        severity: 'critical',
        message: 'No hay Salidas definidas (4.4.1 a)',
        section: 'sipoc',
      });
    } else {
      sipoc.outputs.forEach(out => {
        if (!out.customer) {
          issues.push({
            severity: 'info',
            message: `La salida "${out.description}" no tiene Cliente definido`,
            section: 'sipoc',
          });
        }
        if (!out.quality_criteria) {
          issues.push({
            severity: 'warning',
            message: `La salida "${out.description}" no tiene Criterios de Aceptación`,
            section: 'sipoc',
            suggestion: 'Defina cómo sabe si la salida es conforme.',
          });
        } else {
          checklist.push(
            `Verificar evidencia de conformidad para "${out.description}" según criterio: "${out.quality_criteria}"`
          );
        }
      });
    }

    // Riesgos y Controles (6.1)
    if (sipoc.risks.length > 0) {
      sipoc.risks.forEach(risk => {
        // Buscar si existe algún control relacionado o general
        // Nota: En esta versión simple, chequeamos si hay controles globales si hay riesgos
        if (
          sipoc.controls.length === 0 &&
          (risk.probability === 'alta' ||
            risk.severity === 'alta' ||
            risk.severity === 'critica')
        ) {
          issues.push({
            severity: 'critical',
            message: `Riesgo crítico "${risk.description}" sin controles detectados`,
            section: 'risks',
            suggestion:
              'Agregue controles preventivos o detectivos para este riesgo.',
          });
          checklist.push(`¿Cómo se mitiga el riesgo: "${risk.description}"?`);
        }
      });
    } else {
      issues.push({
        severity: 'info',
        message: 'No se han identificado riesgos y oportunidades (6.1)',
        section: 'risks',
      });
    }
  }

  private static calculateScore(issues: ComplianceIssue[]): number {
    let score = 100;

    const penalties = {
      critical: 20,
      warning: 10,
      info: 2,
    };

    issues.forEach(issue => {
      score -= penalties[issue.severity];
    });

    return Math.max(0, score);
  }
}
