/**
 * Servicio MCP (Mini Copiloto)
 * Lógica de negocio para automatización y registro ISO 9001
 *
 * REFACTOR: Usando Firebase Admin SDK para evitar problemas de permisos (PERMISSION_DENIED)
 * al ejecutar desde API Routes (servidor).
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import {
  MCPCompleteTaskRequest,
  MCPEvidence,
  MCPExecutionStatus,
  MCPPendingTask,
  MCPRegisterExecutionRequest,
  MCPTaskExecution,
} from '@/types/mcp';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// Constantes
// ============================================================================

const COLLECTION_EXECUTIONS = 'mcp_executions';
const COLLECTION_ACTIONS = 'actions';
const COLLECTION_FINDINGS = 'findings';

// ============================================================================
// Servicio Principal
// ============================================================================

/**
 * Obtiene las tareas pendientes para un usuario
 */
export async function getTasksForUser(
  organizationId: string,
  _userId: string
): Promise<{ tareas: MCPPendingTask[]; total: number }> {
  const tareas: MCPPendingTask[] = [];
  const db = getAdminFirestore();

  try {
    // Buscar acciones pendientes
    const actionsSnapshot = await db
      .collection(COLLECTION_ACTIONS)
      .where('organization_id', '==', organizationId)
      .where('estado', 'in', ['pendiente', 'en_progreso'])
      .orderBy('created_at', 'desc')
      .limit(50)
      .get();

    actionsSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      tareas.push({
        id: docSnap.id,
        tipo: 'accion',
        titulo: data.titulo || data.descripcion || 'Acción sin título',
        descripcion: data.descripcion,
        fecha_limite: data.fecha_objetivo,
        prioridad: mapPrioridad(data.prioridad),
        accion_id: docSnap.id,
      });
    });

    // Buscar hallazgos pendientes
    const findingsSnapshot = await db
      .collection(COLLECTION_FINDINGS)
      .where('organization_id', '==', organizationId)
      .where('estado', 'in', ['pendiente', 'en_progreso'])
      .orderBy('created_at', 'desc')
      .limit(50)
      .get();

    findingsSnapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      tareas.push({
        id: docSnap.id,
        tipo: 'hallazgo',
        titulo: data.titulo || data.descripcion || 'Hallazgo sin título',
        descripcion: data.descripcion,
        fecha_limite: data.fecha_limite,
        prioridad: mapPrioridad(data.clasificacion),
        hallazgo_id: docSnap.id,
      });
    });

    return {
      tareas,
      total: tareas.length,
    };
  } catch (error) {
    console.error('[MCP Service] Error getting tasks:', error);
    throw error;
  }
}

/**
 * Marca una tarea como completada y registra la ejecución
 */
export async function markTaskCompleted(
  request: MCPCompleteTaskRequest
): Promise<{ execution_id: string }> {
  const db = getAdminFirestore();
  try {
    // Crear registro de ejecución
    const executionData: any = {
      // Usar any temporalmente para evitar conflictos de tipos Timestamp
      organization_id: request.organization_id,
      user_id: request.user_id,
      tarea_id: request.tarea_id,
      hallazgo_id: request.hallazgo_id,
      accion_id: request.accion_id,
      tipo: request.tipo,
      sistema_origen: request.sistema_origen,
      url_origen: request.url_origen,
      comando_original: request.comando_original,
      estado: request.estado,
      duracion_ms: request.duracion_ms,
      log_pasos: request.log_pasos.map((step, index) => ({
        ...step,
        orden: step.orden ?? index + 1,
        timestamp: Timestamp.now(),
      })),
      evidencias: [],
      created_at: FieldValue.serverTimestamp(),
    };

    const docRef = await db
      .collection(COLLECTION_EXECUTIONS)
      .add(executionData);

    // Actualizar tarea original si aplica
    if (request.estado === 'exitoso') {
      if (request.accion_id) {
        await db.collection(COLLECTION_ACTIONS).doc(request.accion_id).update({
          estado: 'completada',
          updated_at: FieldValue.serverTimestamp(),
          mcp_execution_id: docRef.id,
        });
      }
      if (request.hallazgo_id) {
        await db
          .collection(COLLECTION_FINDINGS)
          .doc(request.hallazgo_id)
          .update({
            estado: 'completado',
            updated_at: FieldValue.serverTimestamp(),
            mcp_execution_id: docRef.id,
          });
      }
    }

    return { execution_id: docRef.id };
  } catch (error) {
    console.error('[MCP Service] Error marking task completed:', error);
    throw error;
  }
}

/**
 * Agrega evidencia a una ejecución existente
 */
export async function addEvidenceToExecution(
  executionId: string,
  evidence: MCPEvidence
): Promise<void> {
  const db = getAdminFirestore();
  try {
    const executionRef = db.collection(COLLECTION_EXECUTIONS).doc(executionId);
    const docSnap = await executionRef.get();

    if (!docSnap.exists) {
      throw new Error('Execution not found');
    }

    const currentData = docSnap.data();
    const updatedEvidencias = [...(currentData?.evidencias || []), evidence];

    await executionRef.update({
      evidencias: updatedEvidencias,
      updated_at: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('[MCP Service] Error adding evidence:', error);
    throw error;
  }
}

/**
 * Registra una ejecución ad-hoc (sin tarea previa)
 */
export async function registerExecution(
  request: MCPRegisterExecutionRequest
): Promise<{ execution_id: string }> {
  const db = getAdminFirestore();
  try {
    const evidencias: MCPEvidence[] = [];

    // Si hay evidencia inline, agregarla
    if (request.evidencia_base64 && request.evidencia_tipo) {
      evidencias.push({
        tipo: request.evidencia_tipo,
        url: '', // Se completará después del upload
        descripcion: request.evidencia_descripcion || 'Evidencia automática',
        timestamp: Timestamp.now() as any, // Cast to any to struct match
      });
    }

    const executionData: any = {
      organization_id: request.organization_id,
      user_id: request.user_id,
      tipo: request.tipo,
      sistema_origen: request.sistema_origen,
      url_origen: request.url_origen,
      comando_original: request.comando_original,
      estado: request.estado,
      duracion_ms: request.duracion_ms,
      log_pasos: request.log_pasos.map((step, index) => ({
        ...step,
        orden: step.orden ?? index + 1,
        timestamp: Timestamp.now(),
      })),
      evidencias,
      created_at: FieldValue.serverTimestamp(),
    };

    const docRef = await db
      .collection(COLLECTION_EXECUTIONS)
      .add(executionData);

    return { execution_id: docRef.id };
  } catch (error) {
    console.error('[MCP Service] Error registering execution:', error);
    throw error;
  }
}

/**
 * Obtiene el historial de ejecuciones
 */
export async function getExecutionHistory(
  organizationId: string,
  options?: {
    limit?: number;
    userId?: string;
    estado?: MCPExecutionStatus;
  }
): Promise<MCPTaskExecution[]> {
  const db = getAdminFirestore();
  try {
    let query = db
      .collection(COLLECTION_EXECUTIONS)
      .where('organization_id', '==', organizationId)
      .orderBy('created_at', 'desc')
      .limit(options?.limit || 50);

    // En Admin SDK, filtrado adicional complejo a veces requiere índices compuestos o filtrado en memoria
    // Firestore Admin permite chaining igual que Client SDK

    // Nota: Si filtramos por user_id, necesitamos índice compuesto con organization_id
    // Por simplicidad, traeremos los últimos 50 de la org y filtraremos en memoria si es necesario,
    // pero intentaremos aplicar el filtro directo si es posible.

    const snapshot = await query.get();

    let results = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as unknown as MCPTaskExecution[];

    if (options?.userId) {
      results = results.filter(r => r.user_id === options.userId);
    }
    if (options?.estado) {
      results = results.filter(r => r.estado === options.estado);
    }

    return results;
  } catch (error) {
    console.error('[MCP Service] Error getting execution history:', error);
    throw error;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function mapPrioridad(value?: string): 'alta' | 'media' | 'baja' {
  if (!value) return 'media';
  const normalized = value.toLowerCase();
  if (normalized.includes('alta') || normalized.includes('critico'))
    return 'alta';
  if (normalized.includes('baja') || normalized.includes('menor'))
    return 'baja';
  return 'media';
}
