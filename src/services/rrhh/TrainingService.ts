import { getAdminFirestore } from '@/lib/firebase/admin';
import { EventPublisher } from '@/services/calendar/EventPublisher';
import {
  PaginatedResponse,
  PaginationParams,
  PerformanceEvaluation,
  Training,
  TrainingFilters,
} from '@/types/rrhh';
import { Timestamp } from 'firebase-admin/firestore';

const COLLECTION_NAME = 'trainings';

// Get Firestore instance from Admin SDK
const getDb = () => getAdminFirestore();

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp.toDate) return timestamp.toDate();
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
};

// Helper to convert Date to Firestore Timestamp
const toTimestamp = (
  date: Date | string | undefined
): Timestamp | undefined => {
  if (!date) return undefined;
  if (date instanceof Date) return Timestamp.fromDate(date);
  return Timestamp.fromDate(new Date(date));
};

export class TrainingService {
  static async getAll(organizationId: string): Promise<Training[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_inicio: toDate(doc.data().fecha_inicio),
        fecha_fin: toDate(doc.data().fecha_fin),
        created_at: toDate(doc.data().created_at),
        updated_at: toDate(doc.data().updated_at),
      })) as Training[];
    } catch (error) {
      console.error('Error getting trainings:', error);
      throw new Error('Error al obtener capacitaciones');
    }
  }

  static async getById(id: string): Promise<Training | null> {
    try {
      const db = getDb();
      const docSnap = await db.collection(COLLECTION_NAME).doc(id).get();

      if (docSnap.exists) {
        const data = docSnap.data()!;
        return {
          id: docSnap.id,
          ...data,
          fecha_inicio: toDate(data.fecha_inicio),
          fecha_fin: toDate(data.fecha_fin),
          created_at: toDate(data.created_at),
          updated_at: toDate(data.updated_at),
        } as Training;
      }
      return null;
    } catch (error) {
      console.error('Error getting training:', error);
      throw new Error('Error al obtener capacitación');
    }
  }

  static async getPaginated(
    organizationId: string,
    filters: TrainingFilters = {},
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<PaginatedResponse<Training>> {
    try {
      const db = getDb();

      // Get all and filter in memory (simpler, no composite index needed)
      // Filter by organization_id at DB level
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId)
        .get();

      let trainings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_inicio: toDate(doc.data().fecha_inicio),
        fecha_fin: toDate(doc.data().fecha_fin),
        created_at: toDate(doc.data().created_at),
        updated_at: toDate(doc.data().updated_at),
      })) as Training[];

      // Apply filters in memory
      if (filters.estado) {
        trainings = trainings.filter(t => t.estado === filters.estado);
      }
      if (filters.modalidad) {
        trainings = trainings.filter(t => t.modalidad === filters.modalidad);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        trainings = trainings.filter(
          t =>
            t.tema?.toLowerCase().includes(searchLower) ||
            t.descripcion?.toLowerCase().includes(searchLower)
        );
      }

      // Sort by created_at desc
      trainings.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Apply pagination
      const total = trainings.length;
      const offset = (pagination.page - 1) * pagination.limit;
      const data = trainings.slice(offset, offset + pagination.limit);

      return {
        data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
          hasNext: offset + pagination.limit < total,
          hasPrev: pagination.page > 1,
        },
      };
    } catch (error) {
      console.error('Error getting paginated trainings:', error);
      throw new Error('Error al obtener capacitaciones paginadas');
    }
  }

  static async create(
    data: Omit<Training, 'id' | 'created_at' | 'updated_at'>,
    organizationId: string
  ): Promise<Training> {
    try {
      const db = getDb();
      const now = Timestamp.now();

      const docData = {
        ...data,
        organization_id: organizationId,
        fecha_inicio: toTimestamp(data.fecha_inicio),
        fecha_fin: toTimestamp(data.fecha_fin),
        created_at: now,
        updated_at: now,
      };

      const docRef = await db.collection(COLLECTION_NAME).add(docData);

      const trainingId = docRef.id;
      const training: Training = {
        id: trainingId,
        ...data,
        created_at: now.toDate(),
        updated_at: now.toDate(),
      };

      // Publicar evento en el calendario
      try {
        await EventPublisher.publishEvent('trainings', {
          title: `Capacitación: ${data.tema}`,
          description: data.descripcion || '',
          date: data.fecha_inicio,
          endDate: data.fecha_fin,
          type: 'training',
          sourceRecordId: trainingId,
          sourceRecordType: 'training',
          priority: 'medium',
          participantIds: data.participantes || [],
          metadata: {
            trainingId,
            modalidad: data.modalidad,
            horas: data.horas,
            proveedor: data.proveedor,
            estado: data.estado,
          },
        });
      } catch (error) {
        console.error('Error publishing training event:', error);
      }

      return training;
    } catch (error) {
      console.error('Error creating training:', error);
      throw new Error('Error al crear capacitación');
    }
  }

  static async update(
    id: string,
    data: Partial<Omit<Training, 'id' | 'created_at'>>
  ): Promise<Training> {
    try {
      const db = getDb();
      const updateData: Record<string, any> = {
        ...data,
        updated_at: Timestamp.now(),
      };

      // Convert dates to Timestamps if present
      if (data.fecha_inicio) {
        updateData.fecha_inicio = toTimestamp(data.fecha_inicio);
      }
      if (data.fecha_fin) {
        updateData.fecha_fin = toTimestamp(data.fecha_fin);
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      await db.collection(COLLECTION_NAME).doc(id).update(updateData);

      const updated = await this.getById(id);
      if (!updated) {
        throw new Error('Capacitación no encontrada después de actualizar');
      }

      // Actualizar evento en el calendario si cambió fecha o estado
      if (data.fecha_inicio || data.fecha_fin || data.estado) {
        try {
          await EventPublisher.updatePublishedEvent('trainings', id, {
            date: data.fecha_inicio,
            endDate: data.fecha_fin,
            metadata: {
              estado: data.estado,
            },
          });
        } catch (error) {
          console.error('Error updating training event:', error);
        }
      }

      return updated;
    } catch (error) {
      console.error('Error updating training:', error);
      throw new Error('Error al actualizar capacitación');
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const db = getDb();
      await db.collection(COLLECTION_NAME).doc(id).delete();

      // Eliminar evento del calendario
      try {
        await EventPublisher.deletePublishedEvent('trainings', id);
      } catch (error) {
        console.error('Error deleting training event:', error);
      }
    } catch (error) {
      console.error('Error deleting training:', error);
      throw new Error('Error al eliminar capacitación');
    }
  }

  static async updateStatus(
    id: string,
    status: Training['estado']
  ): Promise<Training> {
    try {
      return await this.update(id, { estado: status });
    } catch (error) {
      console.error('Error updating training status:', error);
      throw new Error('Error al actualizar estado de capacitación');
    }
  }

  static async addParticipant(
    trainingId: string,
    participantId: string
  ): Promise<Training> {
    try {
      const training = await this.getById(trainingId);
      if (!training) {
        throw new Error('Capacitación no encontrada');
      }

      const participants = training.participantes || [];
      if (!participants.includes(participantId)) {
        participants.push(participantId);
        return await this.update(trainingId, { participantes: participants });
      }

      return training;
    } catch (error) {
      console.error('Error adding participant:', error);
      throw new Error('Error al agregar participante');
    }
  }

  static async removeParticipant(
    trainingId: string,
    participantId: string
  ): Promise<Training> {
    try {
      const training = await this.getById(trainingId);
      if (!training) {
        throw new Error('Capacitación no encontrada');
      }

      const participants = training.participantes || [];
      const updatedParticipants = participants.filter(
        id => id !== participantId
      );

      return await this.update(trainingId, {
        participantes: updatedParticipants,
      });
    } catch (error) {
      console.error('Error removing participant:', error);
      throw new Error('Error al remover participante');
    }
  }

  static async getByParticipant(participantId: string): Promise<Training[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('participantes', 'array-contains', participantId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_inicio: toDate(doc.data().fecha_inicio),
        fecha_fin: toDate(doc.data().fecha_fin),
        created_at: toDate(doc.data().created_at),
        updated_at: toDate(doc.data().updated_at),
      })) as Training[];
    } catch (error) {
      console.error('Error getting trainings by participant:', error);
      throw new Error('Error al obtener capacitaciones por participante');
    }
  }

  static async getActive(organizationId: string): Promise<Training[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId)
        .where('estado', 'in', ['planificada', 'en_curso'])
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_inicio: toDate(doc.data().fecha_inicio),
        fecha_fin: toDate(doc.data().fecha_fin),
        created_at: toDate(doc.data().created_at),
        updated_at: toDate(doc.data().updated_at),
      })) as Training[];
    } catch (error) {
      console.error('Error getting active trainings:', error);
      throw new Error('Error al obtener capacitaciones activas');
    }
  }

  // ===== MÉTODOS PARA VINCULACIÓN CON COMPETENCIAS =====

  static async linkCompetences(
    trainingId: string,
    competenceIds: string[]
  ): Promise<void> {
    try {
      await this.update(trainingId, {
        competenciasDesarrolladas: competenceIds,
      });
    } catch (error) {
      console.error('Error linking competences to training:', error);
      throw new Error('Error al vincular competencias a la capacitación');
    }
  }

  static async getByCompetence(competenceId: string): Promise<Training[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('competenciasDesarrolladas', 'array-contains', competenceId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_inicio: toDate(doc.data().fecha_inicio),
        fecha_fin: toDate(doc.data().fecha_fin),
        created_at: toDate(doc.data().created_at),
        updated_at: toDate(doc.data().updated_at),
      })) as Training[];
    } catch (error) {
      console.error('Error getting trainings by competence:', error);
      throw new Error('Error al obtener capacitaciones por competencia');
    }
  }

  static async updateEmployeeCompetences(
    personnelId: string,
    trainingId: string
  ): Promise<void> {
    try {
      const db = getDb();

      // Obtener la capacitación
      const training = await this.getById(trainingId);
      if (!training) {
        throw new Error('Capacitación no encontrada');
      }

      // Verificar que el empleado participó en la capacitación
      if (!training.participantes?.includes(personnelId)) {
        throw new Error('El empleado no participó en esta capacitación');
      }

      // Obtener competencias desarrolladas por la capacitación
      const competenceIds = training.competenciasDesarrolladas || [];
      if (competenceIds.length === 0) {
        return;
      }

      // Obtener empleado actual
      const personnelDoc = await db
        .collection('personnel')
        .doc(personnelId)
        .get();
      if (!personnelDoc.exists) {
        throw new Error('Empleado no encontrado');
      }
      const personnel = personnelDoc.data()!;

      // Actualizar competencias del empleado
      const currentCompetences = personnel.competenciasActuales || [];
      const now = new Date();

      for (const competenceId of competenceIds) {
        const competenceDoc = await db
          .collection('competencias')
          .doc(competenceId)
          .get();
        if (!competenceDoc.exists) continue;

        const competence = competenceDoc.data()!;
        const nivelDesarrollado = competence.nivelRequerido || 3;

        const existingIndex = currentCompetences.findIndex(
          (c: Record<string, unknown>) => c.competenciaId === competenceId
        );

        if (existingIndex >= 0) {
          if (
            nivelDesarrollado > currentCompetences[existingIndex].nivelAlcanzado
          ) {
            currentCompetences[existingIndex] = {
              ...currentCompetences[existingIndex],
              nivelAlcanzado: nivelDesarrollado,
              fechaUltimaEvaluacion: now,
            };
          }
        } else {
          currentCompetences.push({
            competenciaId: competenceId,
            nivelAlcanzado: nivelDesarrollado,
            fechaUltimaEvaluacion: now,
          });
        }
      }

      // Actualizar empleado
      await db
        .collection('personnel')
        .doc(personnelId)
        .update({
          competenciasActuales: currentCompetences,
          capacitacionesRealizadas: [
            ...(personnel.capacitacionesRealizadas || []),
            trainingId,
          ],
          updated_at: Timestamp.now(),
        });
    } catch (error) {
      console.error('Error updating employee competences:', error);
      throw error instanceof Error
        ? error
        : new Error('Error al actualizar competencias del empleado');
    }
  }

  static async createPostEvaluation(trainingId: string): Promise<string> {
    try {
      const training = await this.getById(trainingId);
      if (!training) {
        throw new Error('Capacitación no encontrada');
      }

      if (!training.evaluacionPosterior) {
        throw new Error('Esta capacitación no requiere evaluación posterior');
      }

      if (training.evaluacionPosteriorId) {
        return training.evaluacionPosteriorId;
      }

      const participants = training.participantes || [];
      if (participants.length === 0) {
        throw new Error('La capacitación no tiene participantes');
      }

      const evaluationIds: string[] = [];

      for (const participantId of participants) {
        try {
          const evaluation = await this.createPostEvaluationForParticipant(
            participantId,
            trainingId,
            training.competenciasDesarrolladas || []
          );
          evaluationIds.push(evaluation.id);
        } catch (error) {
          console.error(
            `Error creando evaluación para participante ${participantId}:`,
            error
          );
        }
      }

      await this.update(trainingId, {
        evaluacionPosteriorId: evaluationIds[0],
      });

      return evaluationIds[0];
    } catch (error) {
      console.error('Error creating post evaluation:', error);
      throw error instanceof Error
        ? error
        : new Error('Error al crear evaluación posterior');
    }
  }

  private static async createPostEvaluationForParticipant(
    personnelId: string,
    trainingId: string,
    competenceIds: string[]
  ): Promise<any> {
    try {
      const db = getDb();

      const personnelDoc = await db
        .collection('personnel')
        .doc(personnelId)
        .get();
      if (!personnelDoc.exists) {
        throw new Error('Empleado no encontrado');
      }
      const personnel = personnelDoc.data()!;

      if (!personnel.puestoId) {
        throw new Error('Empleado sin puesto asignado');
      }

      const competenceEvaluations = [];

      for (const competenceId of competenceIds) {
        const compDoc = await db
          .collection('competencias')
          .doc(competenceId)
          .get();
        if (compDoc.exists) {
          const competence = compDoc.data()!;
          competenceEvaluations.push({
            competenciaId: competenceId,
            nombreCompetencia: competence.nombre || '',
            nivelRequerido: competence.nivelRequerido || 3,
            nivelEvaluado: 0,
            observaciones: `Evaluación post-capacitación: ${trainingId}`,
            brecha: competence.nivelRequerido || 3,
          });
        }
      }

      const evaluationData = {
        personnel_id: personnelId,
        puestoId: personnel.puestoId,
        periodo: `Post-capacitación ${trainingId}`,
        fecha_evaluacion: new Date(),
        evaluador_id: '',
        competencias: competenceEvaluations,
        resultado_global: 'Requiere Capacitación' as const,
        fechaProximaEvaluacion: new Date(),
        comentarios_generales: `Evaluación posterior a capacitación ${trainingId}`,
        plan_mejora: '',
        estado: 'borrador' as const,
      };

      return await this.createEvaluation(evaluationData);
    } catch (error) {
      console.error('Error creating post evaluation for participant:', error);
      throw error;
    }
  }

  private static async createEvaluation(
    data: Omit<PerformanceEvaluation, 'id' | 'created_at' | 'updated_at'>
  ): Promise<unknown> {
    const { EvaluationService } = await import('./EvaluationService');
    return await EvaluationService.create(data);
  }
}
