import {
  CompanySize,
  FunctionalLevel,
  LevelStatus,
  MaturityLevel,
  MaturityTaskNode,
  MaturityWeights,
} from '../../types/maturity';

// Pesos según tamaño de empresa
const SIZE_WEIGHTS: Record<CompanySize, MaturityWeights> = {
  micro: {
    [FunctionalLevel.LEVEL_1_OPERATION]: 0.45, // Mucho peso en lo básico
    [FunctionalLevel.LEVEL_2_SUPPORT]: 0.2,
    [FunctionalLevel.LEVEL_3_CONTROL]: 0.2,
    [FunctionalLevel.LEVEL_4_DIRECTION]: 0.15, // Poco peso en dirección formal
  },
  small: {
    [FunctionalLevel.LEVEL_1_OPERATION]: 0.4,
    [FunctionalLevel.LEVEL_2_SUPPORT]: 0.2,
    [FunctionalLevel.LEVEL_3_CONTROL]: 0.2,
    [FunctionalLevel.LEVEL_4_DIRECTION]: 0.2,
  },
  medium: {
    [FunctionalLevel.LEVEL_1_OPERATION]: 0.3,
    [FunctionalLevel.LEVEL_2_SUPPORT]: 0.25,
    [FunctionalLevel.LEVEL_3_CONTROL]: 0.25,
    [FunctionalLevel.LEVEL_4_DIRECTION]: 0.2,
  },
  large: {
    [FunctionalLevel.LEVEL_1_OPERATION]: 0.25, // Balanceado
    [FunctionalLevel.LEVEL_2_SUPPORT]: 0.25,
    [FunctionalLevel.LEVEL_3_CONTROL]: 0.25,
    [FunctionalLevel.LEVEL_4_DIRECTION]: 0.25,
  },
};

export class MaturityCalculator {
  /**
   * Calcula el score de un Nivel específico basándose en sus tareas
   */
  static calculateLevelScore(tasks: MaturityTaskNode[]): number {
    if (!tasks || tasks.length === 0) return 0;

    const totalScore = tasks.reduce((sum, task) => sum + (task.score || 0), 0);
    const score = totalScore / tasks.length;

    // Seguridad contra NaN o Infinity
    return isFinite(score) ? Math.min(Math.max(Math.round(score), 0), 100) : 0;
  }

  /**
   * Calcula el Score Global ponderado por tamaño de empresa
   */
  static calculateGlobalScore(
    levels: Record<FunctionalLevel, LevelStatus>,
    companySize: CompanySize
  ): number {
    const weights = SIZE_WEIGHTS[companySize] || SIZE_WEIGHTS.small;

    let weightedScore = 0;

    Object.values(FunctionalLevel).forEach(levelKey => {
      const level = levelKey as FunctionalLevel;
      const levelStatus = levels[level];

      if (levelStatus && isFinite(levelStatus.score)) {
        weightedScore += (levelStatus.score || 0) * (weights[level] || 0);
      }
    });

    return isFinite(weightedScore)
      ? Math.min(Math.max(Math.round(weightedScore), 0), 100)
      : 0;
  }

  /**
   * Determina el Nivel de Madurez (textual) basado en el score numérico
   */
  static getMaturityLabel(score: number): MaturityLevel {
    if (score <= 20) return MaturityLevel.INICIAL;
    if (score <= 40) return MaturityLevel.ORDENADO;
    if (score <= 60) return MaturityLevel.CONTROLADO;
    if (score <= 80) return MaturityLevel.MADURO;
    return MaturityLevel.EXCELENTE;
  }

  /**
   * Calcula el score de una tarea individual basado en criterios simples
   * Esta función será usada por el Evaluator cuando lea datos reales
   */
  static calculateTaskScore(
    exists: boolean,
    evidenceCount: number,
    lastActivityDaysAgo: number | null
  ): number {
    if (!exists) return 0;

    let score = 30; // Base por existir/estar definida

    // Bonus por evidencia reciente (últimos 30 días)
    if (evidenceCount > 0) {
      score += 30;

      // Más evidencia = más robustez (hasta un tope)
      score += Math.min(evidenceCount * 2, 20);
    }

    // Penalización por inactividad
    if (lastActivityDaysAgo !== null) {
      if (lastActivityDaysAgo < 30)
        score += 20; // Activo
      else if (lastActivityDaysAgo < 60) score += 10; // Algo activo
      // > 60 días no suma
    } else {
      // Si no hay lastActivity pero hay evidenceCount (caso raro), asumimos activo
      if (evidenceCount > 0) score += 20;
    }

    return Math.min(score, 100);
  }
}
