/**
 * CONTEXTO DE IMPLEMENTACIÓN UNIFICADO
 *
 * Esta función unifica toda la información dispersa del sistema para
 * dársela a la IA como una sola fuente de verdad.
 *
 * Fuentes:
 * - Organización (organizations/{orgId})
 * - Wizard/Onboarding completado
 * - Mi SGC Roadmap (fase actual)
 * - Madurez Organizacional
 * - Planificación y Revisión
 * - Procesos existentes
 * - Objetivos de calidad
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import { getPlanificacionModuleStatusAdmin } from './planificacionStatusAdmin';

// ============================================
// TIPOS
// ============================================

export interface ImplementationContext {
  // Identificación
  organization_id: string;
  organization_name: string;

  // Datos básicos (de Wizard/Organización)
  rubro: string | null;
  tamaño: string | null;

  // Estado de implementación (0-6)
  implementation_stage: number;

  // Estado del SGC
  maturity_level: number | null;
  has_policy: boolean;
  has_objectives: boolean;
  has_process_map: boolean;

  // Datos existentes
  existing_processes: Array<{
    id: string;
    codigo: string;
    nombre: string;
    category_id?: number;
  }>;
  objectives: string[];

  // Flags de habilitación para IA
  can_suggest_processes: boolean;
  can_suggest_audits: boolean;
  can_suggest_documents: boolean;

  // Estado de RRHH/Personal
  has_personnel: boolean;
  personnel_count: number;

  // Dimensiones de madurez (4 ejes del radar)
  maturity_dimensions?: {
    operation: number;
    support: number;
    control: number;
    direction: number;
  };

  // Estado ISO por módulo (para priorización IA)
  iso_status_summary?: {
    planning: number; // Planificación (alcance, contexto, política)
    hr: number; // RRHH (personal, capacitaciones)
    processes: number; // Procesos operativos
    documents: number; // Documentación
    quality: number; // Calidad (objetivos, indicadores)
    improvements: number; // Mejoras (hallazgos, acciones)
    global_score: number; // Score global
    critical_gaps: string[]; // Módulos con score < 30%
  };

  // Metadata
  last_updated: Date;
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

/**
 * Obtiene el contexto unificado de implementación para una organización
 * Esta función es usada por TODOS los endpoints de IA
 */
export async function getImplementationContext(
  organizationId: string
): Promise<ImplementationContext> {
  const db = getAdminFirestore();

  // Valores por defecto
  const defaultContext: ImplementationContext = {
    organization_id: organizationId,
    organization_name: 'Organización',
    rubro: null,
    tamaño: null,
    implementation_stage: 0,
    maturity_level: null,
    has_policy: false,
    has_objectives: false,
    has_process_map: false,
    existing_processes: [],
    objectives: [],
    can_suggest_processes: false,
    can_suggest_audits: false,
    can_suggest_documents: false,
    has_personnel: false,
    personnel_count: 0,
    last_updated: new Date(),
  };

  try {
    // 1. Obtener datos de organización
    const orgDoc = await db
      .collection('organizations')
      .doc(organizationId)
      .get();
    if (orgDoc.exists) {
      const orgData = orgDoc.data();
      defaultContext.organization_name =
        orgData?.name || orgData?.nombre || 'Organización';
      defaultContext.rubro = orgData?.rubro || orgData?.industry || null;
      defaultContext.tamaño =
        orgData?.tamaño ||
        orgData?.size ||
        orgData?.employees?.toString() ||
        null;
    }

    // 2. Obtener estado de implementación (de roadmap/journey)
    const roadmapDoc = await db
      .collection('organizations')
      .doc(organizationId)
      .collection('implementation_status')
      .doc('current')
      .get();

    if (roadmapDoc.exists) {
      const roadmapData = roadmapDoc.data();
      defaultContext.implementation_stage = roadmapData?.current_stage || 0;
    } else {
      // Calcular etapa basado en lo que existe
      defaultContext.implementation_stage = await calculateImplementationStage(
        db,
        organizationId
      );
    }

    // 3. Obtener nivel de madurez
    const maturityDoc = await db
      .collection('organizations')
      .doc(organizationId)
      .collection('assessments')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (!maturityDoc.empty) {
      const maturityData = maturityDoc.docs[0].data();
      defaultContext.maturity_level =
        maturityData?.overall_score || maturityData?.score || null;
    }

    // 3b. Obtener dimensiones de madurez desde organizations/{orgId}/maturity/current
    const maturityCurrentDoc = await db
      .collection('organizations')
      .doc(organizationId)
      .collection('maturity')
      .doc('current')
      .get();

    if (maturityCurrentDoc.exists) {
      const maturityCurrentData = maturityCurrentDoc.data();
      if (maturityCurrentData?.levels) {
        const levels = maturityCurrentData.levels;
        defaultContext.maturity_dimensions = {
          operation: levels.LEVEL_1_OPERATION?.score || 0,
          support: levels.LEVEL_2_SUPPORT?.score || 0,
          control: levels.LEVEL_3_CONTROL?.score || 0,
          direction: levels.LEVEL_4_DIRECTION?.score || 0,
        };
        // Si no tenemos maturity_level del assessment, usar el globalScore
        if (!defaultContext.maturity_level && maturityCurrentData.globalScore) {
          defaultContext.maturity_level = maturityCurrentData.globalScore;
        }

        // 3c. Calcular iso_status_summary basado en tareas de madurez
        const allTasks: Array<{ id: string; score: number }> = [];
        Object.values(levels).forEach((level: any) => {
          if (level?.tasks) {
            level.tasks.forEach((task: any) => {
              allTasks.push({ id: task.id, score: task.score || 0 });
            });
          }
        });

        // Mapear tareas a módulos ISO
        const getTaskScore = (taskId: string) =>
          allTasks.find(t => t.id === taskId)?.score || 0;

        // Planning: usar estado real de colecciones plan_* (vigente=100%, borrador=50%, vacío=0%)
        // Esto se calcula después del bucle principal
        let planningScore = 0;
        try {
          const planStatus =
            await getPlanificacionModuleStatusAdmin(organizationId);
          planningScore = planStatus.globalScore;
        } catch (planError) {
          console.warn('Error obteniendo estado de Planificación:', planError);
          // Fallback: usar tareas de madurez si falla
          planningScore = Math.round(
            (getTaskScore('dir_context') + getTaskScore('dir_planning')) / 2
          );
        }

        // HR = sup_hr + sup_training
        const hrScore = Math.round(
          (getTaskScore('sup_hr') + getTaskScore('sup_training')) / 2
        );

        // Processes = op_purchases + op_sales + op_stock + op_production + op_logistics
        const processScores = [
          getTaskScore('op_purchases'),
          getTaskScore('op_sales'),
          getTaskScore('op_stock'),
          getTaskScore('op_production'),
          getTaskScore('op_logistics'),
        ];
        const processScore = Math.round(
          processScores.reduce((a, b) => a + b, 0) / processScores.length
        );

        // Documents = sup_docs
        const documentsScore = getTaskScore('sup_docs');

        // Quality = ctrl_kpi + ctrl_customer_sat
        const qualityScore = Math.round(
          (getTaskScore('ctrl_kpi') + getTaskScore('ctrl_customer_sat')) / 2
        );

        // Improvements = ctrl_audit + ctrl_nconformance
        const improvementsScore = Math.round(
          (getTaskScore('ctrl_audit') + getTaskScore('ctrl_nconformance')) / 2
        );

        // Identificar gaps críticos (< 30%)
        const criticalGaps: string[] = [];
        if (planningScore < 30) criticalGaps.push('Planificación');
        if (hrScore < 30) criticalGaps.push('RRHH');
        if (processScore < 30) criticalGaps.push('Procesos');
        if (documentsScore < 30) criticalGaps.push('Documentos');
        if (qualityScore < 30) criticalGaps.push('Calidad');
        if (improvementsScore < 30) criticalGaps.push('Mejoras');

        defaultContext.iso_status_summary = {
          planning: planningScore,
          hr: hrScore,
          processes: processScore,
          documents: documentsScore,
          quality: qualityScore,
          improvements: improvementsScore,
          global_score: maturityCurrentData.globalScore || 0,
          critical_gaps: criticalGaps,
        };
      }
    }

    // 4. Verificar si tiene política
    const policyDoc = await db
      .collection('policies')
      .where('organization_id', '==', organizationId)
      .where('tipo', '==', 'calidad')
      .limit(1)
      .get();
    defaultContext.has_policy = !policyDoc.empty;

    // 5. Obtener objetivos de calidad
    const objectivesSnap = await db
      .collection('quality_objectives')
      .where('organization_id', '==', organizationId)
      .where('activo', '==', true)
      .limit(10)
      .get();

    defaultContext.has_objectives = !objectivesSnap.empty;
    defaultContext.objectives = objectivesSnap.docs.map(
      d => d.data().nombre || d.data().title || ''
    );

    // 6. Obtener procesos existentes
    const processesSnap = await db
      .collection('process_definitions')
      .where('organization_id', '==', organizationId)
      .where('vigente', '==', true)
      .orderBy('category_id', 'asc')
      .limit(20)
      .get();

    defaultContext.existing_processes = processesSnap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        codigo:
          data.codigo ||
          `${data.category_id || ''}-${data.process_code || '???'}`,
        nombre: data.nombre,
        category_id: data.category_id,
      };
    });

    defaultContext.has_process_map =
      defaultContext.existing_processes.length >= 3;

    // 7. Verificar si tiene personal cargado
    const personnelSnap = await db
      .collection('personnel')
      .where('organization_id', '==', organizationId)
      .where('activo', '==', true)
      .limit(50)
      .get();

    defaultContext.has_personnel = !personnelSnap.empty;
    defaultContext.personnel_count = personnelSnap.size;

    // 8. Calcular flags de habilitación
    const stage = defaultContext.implementation_stage;
    defaultContext.can_suggest_documents = stage >= 2;
    defaultContext.can_suggest_processes = stage >= 3;
    defaultContext.can_suggest_audits =
      stage >= 4 && defaultContext.existing_processes.length >= 3;

    return defaultContext;
  } catch (error) {
    console.error('Error getting implementation context:', error);
    return defaultContext;
  }
}

/**
 * Calcula la etapa de implementación basado en lo que existe en el sistema
 */
async function calculateImplementationStage(
  db: FirebaseFirestore.Firestore,
  organizationId: string
): Promise<number> {
  let stage = 0;

  // Etapa 1: Tiene algún diagnóstico/madurez?
  const hasAssessment = await db
    .collection('organizations')
    .doc(organizationId)
    .collection('assessments')
    .limit(1)
    .get();
  if (!hasAssessment.empty) stage = 1;

  // Etapa 2: Tiene política o declaraciones?
  const hasPolicy = await db
    .collection('policies')
    .where('organization_id', '==', organizationId)
    .limit(1)
    .get();
  if (!hasPolicy.empty) stage = 2;

  // Etapa 3: Tiene procesos definidos?
  const hasProcesses = await db
    .collection('process_definitions')
    .where('organization_id', '==', organizationId)
    .where('vigente', '==', true)
    .limit(1)
    .get();
  if (!hasProcesses.empty) stage = 3;

  // Etapa 4: Tiene auditorías?
  const hasAudits = await db
    .collection('auditorias')
    .where('organization_id', '==', organizationId)
    .limit(1)
    .get();
  if (!hasAudits.empty) stage = 4;

  // Etapa 5: Tiene mejoras/NC tratadas?
  const hasImprovements = await db
    .collection('acciones')
    .where('organization_id', '==', organizationId)
    .where('estado', '==', 'cerrada')
    .limit(1)
    .get();
  if (!hasImprovements.empty) stage = 5;

  return stage;
}

/**
 * Valida si una acción de IA está permitida según la etapa
 */
export function validateAIAction(
  context: ImplementationContext,
  action: 'suggest_process' | 'suggest_audit' | 'suggest_document' | 'general'
): { allowed: boolean; message?: string } {
  switch (action) {
    case 'suggest_process':
      if (!context.can_suggest_processes) {
        return {
          allowed: false,
          message: `Tu organización está en etapa ${context.implementation_stage}. Para sugerir procesos, primero completá la Planificación Estratégica (etapa 2) definiendo política y objetivos de calidad.`,
        };
      }
      break;

    case 'suggest_audit':
      if (!context.can_suggest_audits) {
        return {
          allowed: false,
          message: `Para planificar auditorías internas, primero necesitás tener al menos 3 procesos operativos definidos e implementados.`,
        };
      }
      break;

    case 'suggest_document':
      if (!context.can_suggest_documents) {
        return {
          allowed: false,
          message: `Antes de crear documentación, completá el diagnóstico inicial y definí el alcance del SGC.`,
        };
      }
      break;
  }

  return { allowed: true };
}

/**
 * Obtiene un resumen breve del contexto para logs/debug
 */
export function getContextSummary(context: ImplementationContext): string {
  return (
    `[${context.organization_name}] Etapa ${context.implementation_stage}/6 | ` +
    `Procesos: ${context.existing_processes.length} | ` +
    `Política: ${context.has_policy ? '✓' : '✗'} | ` +
    `Objetivos: ${context.has_objectives ? '✓' : '✗'}`
  );
}
