// Ola 1 (refuerzo) — Índice de confianza del análisis estratégico
// Mide qué porcentaje de las fuentes de datos esperadas están disponibles
// y expone qué dimensiones tienen cobertura real vs. inferida.

import type { StrategicAnalysisContext } from '@/types/strategic-analysis';

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface StrategicAnalysisConfidence {
  /** Porcentaje de fuentes disponibles sobre el total esperado (0–100) */
  context_completeness_pct: number;
  /** Lista de fuentes que no tienen datos en el contexto actual */
  missing_sources: string[];
  /** Nivel de confianza derivado del porcentaje de completitud */
  confidence_level: 'alto' | 'medio' | 'bajo';
  /**
   * Mapeo dimensión → fuentes que contribuyeron a esa dimensión.
   * Solo incluye dimensiones con al menos una fuente disponible.
   */
  dimension_coverage: Record<string, string[]>;
}

// ---------------------------------------------------------------------------
// Constantes internas
// ---------------------------------------------------------------------------

/** Fuentes esperadas en orden canónico */
const EXPECTED_SOURCES = [
  'processes',
  'audits',
  'findings',
  'actions',
  'documents',
  'compliance',
  'maturity',
  'personnel',
] as const;

type ExpectedSource = (typeof EXPECTED_SOURCES)[number];

/**
 * Mapeo dimensión → fuentes que la alimentan.
 * Se usa para construir `dimension_coverage` filtrando solo las disponibles.
 */
const DIMENSION_SOURCE_MAP: Record<string, ExpectedSource[]> = {
  liderazgo:       ['compliance', 'audits', 'maturity'],
  planificacion:   ['compliance', 'maturity', 'processes'],
  operaciones:     ['processes', 'findings', 'actions'],
  auditorias:      ['audits', 'findings'],
  hallazgos:       ['findings', 'actions'],
  documentacion:   ['documents', 'processes'],
  rrhh:            ['personnel', 'maturity'],
  mejora_continua: ['findings', 'actions', 'audits'],
  kpis:            ['processes', 'compliance', 'maturity'],
  gobernanza:      ['compliance', 'audits', 'maturity', 'personnel'],
};

// ---------------------------------------------------------------------------
// Servicio
// ---------------------------------------------------------------------------

export class StrategicAnalysisConfidenceService {
  /**
   * Calcula el índice de confianza del análisis estratégico a partir del contexto.
   * Puro (sin efectos secundarios) — no accede a Firestore.
   */
  computeConfidence(context: StrategicAnalysisContext): StrategicAnalysisConfidence {
    const ev = context.evidenceSummary;

    // --- Detectar fuentes disponibles ---
    const available = new Set<ExpectedSource>();

    if ((ev.processesTotal ?? 0) > 0) {
      available.add('processes');
    }
    if ((ev.auditsTotal ?? 0) > 0) {
      available.add('audits');
    }
    // findingsOpen puede ser 0 (sin hallazgos abiertos) pero si el campo
    // está definido se considera que la fuente fue consultada.
    if (ev.findingsOpen !== undefined) {
      available.add('findings');
    }
    if (ev.actionsOpen !== undefined) {
      available.add('actions');
    }
    if (ev.documentsPending !== undefined) {
      available.add('documents');
    }
    if (context.compliance !== undefined && context.compliance !== null) {
      available.add('compliance');
    }
    if (context.maturity !== undefined && context.maturity !== null) {
      available.add('maturity');
    }
    // personnel se infiere del conteo de empleados de la organización o
    // de la presencia de trainingsPending en evidenceSummary.
    if (
      (context.organization.employeeCount !== undefined &&
        context.organization.employeeCount !== null) ||
      ev.trainingsPending !== undefined
    ) {
      available.add('personnel');
    }

    // --- Calcular completitud ---
    const totalExpected = EXPECTED_SOURCES.length; // 8
    const totalAvailable = available.size;
    const context_completeness_pct = Math.round((totalAvailable / totalExpected) * 100);

    // --- Nivel de confianza ---
    let confidence_level: 'alto' | 'medio' | 'bajo';
    if (context_completeness_pct >= 75) {
      confidence_level = 'alto';
    } else if (context_completeness_pct >= 50) {
      confidence_level = 'medio';
    } else {
      confidence_level = 'bajo';
    }

    // --- Fuentes faltantes ---
    const missing_sources = EXPECTED_SOURCES.filter(s => !available.has(s));

    // --- Cobertura por dimensión (solo dimensiones con al menos 1 fuente disponible) ---
    const dimension_coverage: Record<string, string[]> = {};
    for (const [dimension, sources] of Object.entries(DIMENSION_SOURCE_MAP)) {
      const covered = sources.filter(s => available.has(s));
      if (covered.length > 0) {
        dimension_coverage[dimension] = covered;
      }
    }

    return {
      context_completeness_pct,
      missing_sources,
      confidence_level,
      dimension_coverage,
    };
  }
}
