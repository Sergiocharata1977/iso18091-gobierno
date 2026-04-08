export type CompanySize = 'micro' | 'small' | 'medium' | 'large';

// Niveles de Madurez Global
export enum MaturityLevel {
  INICIAL = 'Inicial', // 0-20
  ORDENADO = 'Ordenado', // 21-40
  CONTROLADO = 'Controlado', // 41-60
  MADURO = 'Maduro', // 61-80
  EXCELENTE = 'Excelente', // 81-100
}

// Los 4 Niveles Funcionales del Modelo
export enum FunctionalLevel {
  LEVEL_1_OPERATION = 'operation', // Operativo (Bajo Nivel)
  LEVEL_2_SUPPORT = 'support', // Apoyo
  LEVEL_3_CONTROL = 'control', // Control y Mejora
  LEVEL_4_DIRECTION = 'direction', // Dirección (Alto Nivel)
}

// Nodo del Árbol de Tareas
export interface MaturityTaskNode {
  id: string;
  name: string;
  level: FunctionalLevel;
  description: string;

  // Estado actual
  exists: boolean; // ¿Está definida/registrada?
  evidenceCount: number; // Cantidad de evidencias recientes (últimos 30 días)
  lastActivity?: Date; // Fecha última evidencia

  // Puntuación del nodo (0-100)
  score: number;

  // Criterios de evaluación (para debugging/info)
  evaluationCriteria?: {
    hasResponsible: boolean;
    hasFrequency: boolean;
    hasRecentEvidence: boolean;
  };
}

// Estado de cada Nivel Funcional
export interface LevelStatus {
  level: FunctionalLevel;
  score: number; // 0-100
  tasks: MaturityTaskNode[]; // Tareas dentro de este nivel (Compras, Ventas, etc.)
}

// Interfaz Principal almacenada en Firestore
// Path: organizations/{orgId}/maturity/current
export interface ImplementationMaturity {
  organizationId: string;
  updatedAt: Date;

  companySize: CompanySize;

  // Scores Globales
  globalScore: number;
  globalLevel: MaturityLevel;

  // Desglose por Niveles
  levels: {
    [key in FunctionalLevel]: LevelStatus;
  };

  // Recomendaciones IA
  nextSteps: MaturityRecommendation[];
}

export interface MaturityRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  impactLevel: FunctionalLevel; // Qué nivel mejora esta acción
  actionUrl?: string; // Link al módulo para resolverlo
}

// Configuración de Pesos (Weights)
export interface MaturityWeights {
  [FunctionalLevel.LEVEL_1_OPERATION]: number;
  [FunctionalLevel.LEVEL_2_SUPPORT]: number;
  [FunctionalLevel.LEVEL_3_CONTROL]: number;
  [FunctionalLevel.LEVEL_4_DIRECTION]: number;
}
