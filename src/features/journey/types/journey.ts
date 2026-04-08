import {
  ISO_9001_PHASES,
  PhaseDefinition,
  PhaseModule,
  PhaseTask,
} from '@/lib/iso/phases';
import { JourneyService } from '@/services/JourneyService';

export type { PhaseDefinition, PhaseModule, PhaseTask };

/**
 * Estado de una fase del journey
 */
export type PhaseStatus = 'locked' | 'available' | 'in_progress' | 'completed';

/**
 * Estado de progreso del usuario en una fase
 */
export interface PhaseProgress {
  phaseId: number;
  status: PhaseStatus;
  porcentaje: number;
  tareasCompletadas: string[];
  fechaInicio?: Date;
  fechaCompletado?: Date;
}

/**
 * Journey completo de una organización
 */
export interface OrganizationJourney {
  id: string;
  organization_id: string;
  faseActual: number;
  progresoGlobal: number;
  fases: PhaseProgress[];
  fechaInicio: Date;
  fechaEstimadaFin?: Date;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// DEFINICIÓN DE LAS 6 FASES ISO 9001
// ============================================

export const FASES_ISO_9001 = ISO_9001_PHASES;

/**
 * Obtener el estado inicial del journey
 */
export function getDefaultJourneyProgress(): PhaseProgress[] {
  return FASES_ISO_9001.map((fase, index) => ({
    phaseId: fase.id,
    status: index === 0 ? 'available' : 'locked',
    porcentaje: 0,
    tareasCompletadas: [],
  }));
}

export async function getInitialJourneyProgress(
  organizationId: string
): Promise<PhaseProgress[]> {
  return JourneyService.getJourneyProgress(organizationId);
}
