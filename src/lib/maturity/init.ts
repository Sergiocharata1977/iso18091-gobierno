import { db } from '@/firebase/config';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  CompanySize,
  FunctionalLevel,
  ImplementationMaturity,
  LevelStatus,
  MaturityLevel,
  MaturityTaskNode,
} from '../../types/maturity';
import { MATURITY_TREE_BLUEPRINT } from './definitions';

export const INITIAL_MATURITY_DATA = {
  globalScore: 0,
  globalLevel: MaturityLevel.INICIAL,
  nextSteps: [],
};

/**
 * Inicializa el registro de madurez para una organización si no existe.
 * Usa el Blueprint estático para crear la estructura base.
 */
export async function initializeMaturityRecord(
  organizationId: string,
  companySize: CompanySize = 'small' // Default a pequeña si no se sabe
): Promise<void> {
  const maturityRef = doc(
    db,
    'organizations',
    organizationId,
    'maturity',
    'current'
  );

  const docSnap = await getDoc(maturityRef);
  if (docSnap.exists()) {
    console.log(`Maturity record already exists for org ${organizationId}`);
    return;
  }

  // 1. Construir el árbol inicial vacío basado en el blueprint
  const initialLevels: Record<string, LevelStatus> = {};

  // Agrupar nodos por nivel
  const tasksByLevel: Record<string, MaturityTaskNode[]> = {};

  MATURITY_TREE_BLUEPRINT.forEach(blueprintNode => {
    const node: MaturityTaskNode = {
      ...blueprintNode,
      exists: false,
      evidenceCount: 0,
      score: 0,
      lastActivity: undefined,
    };

    if (!tasksByLevel[node.level]) {
      tasksByLevel[node.level] = [];
    }
    tasksByLevel[node.level].push(node);
  });

  // 2. Crear los objetos de Estado de Nivel
  Object.values(FunctionalLevel).forEach(level => {
    initialLevels[level] = {
      level: level,
      score: 0,
      tasks: tasksByLevel[level] || [],
    };
  });

  // 3. Crear el objeto completo
  const initialMaturity: Omit<ImplementationMaturity, 'updatedAt'> = {
    organizationId,
    companySize,
    globalScore: 0,
    globalLevel: MaturityLevel.INICIAL,
    levels: initialLevels as any, // Cast necesario por el índice dinámico
    nextSteps: [
      {
        id: 'init_1',
        title: 'Completar Perfil de Organización',
        description:
          'Define la estructura básica y responsables para comenzar a sumar puntos.',
        priority: 'high',
        impactLevel: FunctionalLevel.LEVEL_1_OPERATION,
        actionUrl: '/organizacion',
      },
    ],
  };

  // 4. Guardar en Firestore
  await setDoc(maturityRef, {
    ...initialMaturity,
    updatedAt: serverTimestamp(),
  });

  console.log(`Initialized maturity record for org ${organizationId}`);
}

/**
 * Crea un objeto de madurez "en blanco" basado en el blueprint.
 * Útil para mostrar el dashboard antes de que existan datos en Firestore.
 */
export function getBlankMaturityData(
  organizationId: string,
  companySize: CompanySize = 'small'
): ImplementationMaturity {
  const initialLevels: Record<string, LevelStatus> = {};
  const tasksByLevel: Record<string, MaturityTaskNode[]> = {};

  MATURITY_TREE_BLUEPRINT.forEach(blueprintNode => {
    const node: MaturityTaskNode = {
      ...blueprintNode,
      exists: false,
      evidenceCount: 0,
      score: 0,
    };

    if (!tasksByLevel[node.level]) {
      tasksByLevel[node.level] = [];
    }
    tasksByLevel[node.level].push(node);
  });

  Object.values(FunctionalLevel).forEach(level => {
    initialLevels[level] = {
      level: level,
      score: 0,
      tasks: tasksByLevel[level] || [],
    };
  });

  return {
    organizationId,
    companySize,
    globalScore: 0,
    globalLevel: MaturityLevel.INICIAL,
    levels: initialLevels as any,
    nextSteps: [
      {
        id: 'init_1',
        title: 'Comenzar evaluación real',
        description:
          'El sistema está listo para medir tu avance. Realiza acciones en los módulos para sumar puntos.',
        priority: 'high',
        impactLevel: FunctionalLevel.LEVEL_1_OPERATION,
        actionUrl: '/dashboard',
      },
    ],
    updatedAt: new Date(),
  };
}
