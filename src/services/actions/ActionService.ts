import { db } from '@/firebase/config';
import { TraceabilityService } from '@/services/shared/TraceabilityService';
import type {
  Action,
  ActionControlExecutionFormData,
  ActionControlPlanningFormData,
  ActionExecutionFormData,
  ActionFilters,
  ActionFormData,
  ActionStats,
} from '@/types/actions';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  QueryConstraint,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const COLLECTION_NAME = 'actions';

export class ActionService {
  // ============================================
  // CREAR ACCIÓN (Formulario 1: Planificación)
  // ============================================

  static async create(
    data: ActionFormData & { findingId?: string; findingNumber?: string },
    userId: string,
    userName: string,
    organizationId: string
  ): Promise<string> {
    try {
      // Generar número de acción
      // TODO: Usar organizationId para secuencia independiente en Fase 6
      const year = new Date().getFullYear();
      const actionNumber = await TraceabilityService.generateNumber(
        'ACC',
        year
      );

      const now = Timestamp.now();

      const actionData: Omit<Action, 'id'> = {
        actionNumber,
        organization_id: organizationId,
        title: data.title,
        description: data.description,

        actionType: data.actionType,
        priority: data.priority,

        sourceType: data.sourceType,
        findingId: data.findingId || null,
        findingNumber: data.findingNumber || null,
        sourceName: data.sourceName,

        processId: data.processId,
        processName: data.processName,

        // Fase 1: Planificación
        planning: {
          responsiblePersonId: data.implementationResponsibleId,
          responsiblePersonName: data.implementationResponsibleName,
          plannedDate: Timestamp.fromDate(data.plannedExecutionDate),
          observations: data.planningObservations || null,
        },

        // Fase 2: Ejecución (null inicialmente)
        execution: null,

        // Fase 3: Planificación del Control (null inicialmente, se completa después de ejecutar)
        controlPlanning: null,

        // Fase 4: Ejecución del Control (null inicialmente)
        controlExecution: null,

        status: 'planificada',
        currentPhase: 'planning',
        progress: 0,

        observations: null,

        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        createdByName: userName,
        updatedBy: null,
        updatedByName: null,
        isActive: true,
      };

      const docRef = await addDoc(collection(db, COLLECTION_NAME), actionData);

      return docRef.id;
    } catch (error) {
      console.error('Error creating action:', error);
      throw new Error('Error al crear la acción');
    }
  }

  // ============================================
  // OBTENER ACCIÓN POR ID
  // ============================================

  static async getById(id: string): Promise<Action | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return null;
      }

      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Action;
    } catch (error) {
      console.error('Error getting action:', error);
      throw new Error('Error al obtener la acción');
    }
  }

  // ============================================
  // LISTAR ACCIONES CON FILTROS
  // ============================================

  static async list(
    organizationId: string,
    filters?: ActionFilters,
    pageSize: number = 50
  ): Promise<{ actions: Action[] }> {
    try {
      const constraints: QueryConstraint[] = [
        where('isActive', '==', true),
        where('organization_id', '==', organizationId),
      ];

      // Aplicar filtros
      if (filters?.status) {
        constraints.push(where('status', '==', filters.status));
      }

      if (filters?.actionType) {
        constraints.push(where('actionType', '==', filters.actionType));
      }

      if (filters?.priority) {
        constraints.push(where('priority', '==', filters.priority));
      }

      if (filters?.processId) {
        constraints.push(where('processId', '==', filters.processId));
      }

      if (filters?.findingId) {
        constraints.push(where('findingId', '==', filters.findingId));
      }

      if (filters?.year) {
        const startDate = new Date(filters.year, 0, 1);
        const endDate = new Date(filters.year, 11, 31, 23, 59, 59);
        constraints.push(
          where('createdAt', '>=', Timestamp.fromDate(startDate))
        );
        constraints.push(where('createdAt', '<=', Timestamp.fromDate(endDate)));
      }

      // Ordenar por fecha de creación
      constraints.push(orderBy('createdAt', 'desc'));
      constraints.push(limit(pageSize));

      const q = query(collection(db, COLLECTION_NAME), ...constraints);
      const querySnapshot = await getDocs(q);

      const actions: Action[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Action[];

      // Filtro de búsqueda en memoria
      let filteredActions = actions;
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        filteredActions = actions.filter(
          action =>
            action.title.toLowerCase().includes(searchLower) ||
            action.description.toLowerCase().includes(searchLower) ||
            action.actionNumber.toLowerCase().includes(searchLower)
        );
      }

      return { actions: filteredActions };
    } catch (error) {
      console.error('Error listing actions:', error);
      throw new Error('Error al listar las acciones');
    }
  }

  // ============================================
  // ACTUALIZAR EJECUCIÓN (Formulario 2)
  // ============================================

  static async updateExecution(
    id: string,
    data: ActionExecutionFormData,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);

      const execution = {
        executionDate: Timestamp.fromDate(data.executionDate),
        comments: data.comments || null,
        completedBy: userId,
        completedByName: userName,
      };

      await updateDoc(docRef, {
        execution,
        status: 'ejecutada',
        currentPhase: 'executed',
        progress: 33,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
        updatedByName: userName,
      });
    } catch (error) {
      console.error('Error updating execution:', error);
      throw new Error('Error al actualizar la ejecución');
    }
  }

  // ============================================
  // ACTUALIZAR PLANIFICACIÓN DEL CONTROL (Formulario 3)
  // ============================================

  static async updateControlPlanning(
    id: string,
    data: ActionControlPlanningFormData,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);

      const controlPlanning = {
        responsiblePersonId: data.responsiblePersonId,
        responsiblePersonName: data.responsiblePersonName,
        plannedDate: Timestamp.fromDate(data.plannedDate),
        effectivenessCriteria: data.effectivenessCriteria,
        comments: data.comments || null,
      };

      await updateDoc(docRef, {
        controlPlanning,
        status: 'en_control',
        currentPhase: 'control_planning',
        progress: 66,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
        updatedByName: userName,
      });
    } catch (error) {
      console.error('Error updating control planning:', error);
      throw new Error('Error al actualizar la planificación del control');
    }
  }

  // ============================================
  // ACTUALIZAR EJECUCIÓN DEL CONTROL (Formulario 4)
  // ============================================

  static async updateControlExecution(
    id: string,
    data: ActionControlExecutionFormData,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);

      const controlExecution = {
        executionDate: Timestamp.fromDate(data.executionDate),
        verificationResult: data.verificationResult,
        isEffective: data.isEffective,
        comments: data.comments || null,
        verifiedBy: userId,
        verifiedByName: userName,
      };

      await updateDoc(docRef, {
        controlExecution,
        status: 'completada',
        currentPhase: 'completed',
        progress: 100,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
        updatedByName: userName,
      });
    } catch (error) {
      console.error('Error updating control execution:', error);
      throw new Error('Error al actualizar la ejecución del control');
    }
  }

  // ============================================
  // ELIMINAR (SOFT DELETE)
  // ============================================

  static async delete(
    id: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);

      await updateDoc(docRef, {
        isActive: false,
        updatedAt: Timestamp.now(),
        updatedBy: userId,
        updatedByName: userName,
      });
    } catch (error) {
      console.error('Error deleting action:', error);
      throw new Error('Error al eliminar la acción');
    }
  }

  // ============================================
  // ACTUALIZAR (GENÉRICO)
  // ============================================

  static async update(id: string, data: any): Promise<Action> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const now = Timestamp.now();

      const updateData = {
        ...data,
        updatedAt: now,
      };

      await updateDoc(docRef, updateData);

      const updated = await this.getById(id);
      if (!updated) throw new Error('Error al recuperar la acción actualizada');
      return updated;
    } catch (error) {
      console.error('Error updating action:', error);
      throw new Error('Error al actualizar la acción');
    }
  }

  // ============================================
  // OBTENER ESTADÍSTICAS
  // ============================================

  static async getStats(
    organizationId: string,
    filters?: ActionFilters
  ): Promise<ActionStats> {
    try {
      const { actions } = await this.list(organizationId, filters, 1000);

      const stats: ActionStats = {
        total: actions.length,
        byStatus: {
          planificada: 0,
          ejecutada: 0,
          en_control: 0,
          completada: 0,
          cancelada: 0,
        },
        byType: {
          correctiva: 0,
          preventiva: 0,
          mejora: 0,
        },
        byPriority: {
          baja: 0,
          media: 0,
          alta: 0,
          critica: 0,
        },
        byProcess: {},
        averageProgress: 0,
        verifiedCount: 0,
        effectiveCount: 0,
        overdueCount: 0,
      };

      let totalProgress = 0;
      const now = new Date();

      actions.forEach(action => {
        // Contar por estado
        stats.byStatus[action.status]++;

        // Contar por tipo
        stats.byType[action.actionType]++;

        // Contar por prioridad
        stats.byPriority[action.priority]++;

        // Contar por proceso
        if (action.processName) {
          stats.byProcess[action.processName] =
            (stats.byProcess[action.processName] || 0) + 1;
        }

        // Progreso total
        totalProgress += action.progress;

        // Verificadas y efectivas
        if (action.controlExecution) {
          stats.verifiedCount++;
          if (action.controlExecution.isEffective) {
            stats.effectiveCount++;
          }
        }

        // Vencidas
        const plannedDate = action.planning.plannedDate.toDate();
        if (
          plannedDate < now &&
          action.status !== 'completada' &&
          action.status !== 'cancelada'
        ) {
          stats.overdueCount++;
        }
      });

      stats.averageProgress =
        actions.length > 0 ? Math.round(totalProgress / actions.length) : 0;

      return stats;
    } catch (error) {
      console.error('Error getting action stats:', error);
      throw new Error('Error al obtener estadísticas');
    }
  }
}
