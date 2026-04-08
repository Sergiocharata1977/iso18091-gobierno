/**
 * Cálculo de Estado Global del Módulo Planificación (Versión Admin/Server)
 *
 * Para uso en APIs de IA que corren en servidor con Firebase Admin SDK
 *
 * Evalúa el estado de TODOS los subcomponentes:
 * - plan_identidad
 * - plan_alcance
 * - plan_contexto
 * - plan_estructura
 * - plan_politicas
 *
 * Regla:
 * - Si hay registro vigente: 100%
 * - Si solo hay borradores: 50%
 * - Si no hay registros: 0%
 */

import { getAdminFirestore } from '@/lib/firebase/admin';

const PLAN_COLLECTIONS = {
  identidad: 'plan_identidad',
  alcance: 'plan_alcance',
  contexto: 'plan_contexto',
  estructura: 'plan_estructura',
  politicas: 'plan_politicas',
} as const;

type PlanCollectionType = keyof typeof PLAN_COLLECTIONS;

interface SubcomponentStatus {
  id: PlanCollectionType;
  name: string;
  hasVigente: boolean;
  hasBorrador: boolean;
  score: number;
}

export interface PlanificacionModuleStatus {
  subcomponents: SubcomponentStatus[];
  globalScore: number;
  criticalGaps: string[];
}

const SUBCOMPONENT_NAMES: Record<PlanCollectionType, string> = {
  identidad: 'Identidad Organizacional',
  alcance: 'Alcance del SGC',
  contexto: 'Contexto de la Organización',
  estructura: 'Estructura Organizacional',
  politicas: 'Políticas',
};

/**
 * Obtiene el estado global del módulo Planificación (versión Admin para servidor)
 */
export async function getPlanificacionModuleStatusAdmin(
  organizationId: string
): Promise<PlanificacionModuleStatus> {
  const db = getAdminFirestore();
  const subcomponents: SubcomponentStatus[] = [];

  for (const [key, collectionName] of Object.entries(PLAN_COLLECTIONS)) {
    const tipo = key as PlanCollectionType;

    try {
      const snapshot = await db
        .collection(collectionName)
        .where('organization_id', '==', organizationId)
        .get();

      const docs = snapshot.docs.map(d => d.data());

      const hasVigente = docs.some(d => d.estado === 'vigente');
      const hasBorrador = docs.some(d => d.estado === 'borrador');

      // Calcular score según regla ISO
      let score = 0;
      if (hasVigente) {
        score = 100;
      } else if (hasBorrador) {
        score = 50;
      }

      subcomponents.push({
        id: tipo,
        name: SUBCOMPONENT_NAMES[tipo],
        hasVigente,
        hasBorrador,
        score,
      });
    } catch (error) {
      console.warn(`Error obteniendo estado de ${collectionName}:`, error);
      subcomponents.push({
        id: tipo,
        name: SUBCOMPONENT_NAMES[tipo],
        hasVigente: false,
        hasBorrador: false,
        score: 0,
      });
    }
  }

  // Calcular score global (promedio)
  const globalScore = Math.round(
    subcomponents.reduce((acc, s) => acc + s.score, 0) / subcomponents.length
  );

  // Identificar gaps críticos (score < 50%)
  const criticalGaps = subcomponents.filter(s => s.score < 50).map(s => s.name);

  return {
    subcomponents,
    globalScore,
    criticalGaps,
  };
}
