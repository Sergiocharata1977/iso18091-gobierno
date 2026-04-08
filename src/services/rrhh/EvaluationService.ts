import { getAdminFirestore } from '@/lib/firebase/admin';
import { EventPublisher } from '@/services/calendar/EventPublisher';
import {
  CompetenceEvaluation,
  PaginatedResponse,
  PaginationParams,
  PerformanceEvaluation,
  PerformanceEvaluationFilters,
} from '@/types/rrhh';
import { Timestamp } from 'firebase-admin/firestore';

const COLLECTION_NAME = 'evaluations';

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

export class EvaluationService {
  static async getAll(
    organizationId: string
  ): Promise<PerformanceEvaluation[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_evaluacion: toDate(doc.data().fecha_evaluacion),
        fechaProximaEvaluacion: toDate(doc.data().fechaProximaEvaluacion),
        created_at: toDate(doc.data().created_at),
        updated_at: toDate(doc.data().updated_at),
      })) as PerformanceEvaluation[];
    } catch (error) {
      console.error('Error getting evaluations:', error);
      throw new Error('Error al obtener evaluaciones');
    }
  }

  static async getById(id: string): Promise<PerformanceEvaluation | null> {
    try {
      const db = getDb();
      const docSnap = await db.collection(COLLECTION_NAME).doc(id).get();

      if (docSnap.exists) {
        const data = docSnap.data()!;
        return {
          id: docSnap.id,
          ...data,
          fecha_evaluacion: toDate(data.fecha_evaluacion),
          fechaProximaEvaluacion: toDate(data.fechaProximaEvaluacion),
          created_at: toDate(data.created_at),
          updated_at: toDate(data.updated_at),
        } as PerformanceEvaluation;
      }
      return null;
    } catch (error) {
      console.error('Error getting evaluation:', error);
      throw new Error('Error al obtener evaluación');
    }
  }

  static async getPaginated(
    organizationId: string,
    filters: PerformanceEvaluationFilters = {},
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<PaginatedResponse<PerformanceEvaluation>> {
    try {
      const db = getDb();

      // Get all and filter in memory (simpler, no composite index needed)
      // Filter by organization_id at DB level
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId)
        .get();

      let evaluations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_evaluacion: toDate(doc.data().fecha_evaluacion),
        fechaProximaEvaluacion: toDate(doc.data().fechaProximaEvaluacion),
        created_at: toDate(doc.data().created_at),
        updated_at: toDate(doc.data().updated_at),
      })) as PerformanceEvaluation[];

      // Apply filters in memory
      if (filters.estado) {
        evaluations = evaluations.filter(e => e.estado === filters.estado);
      }
      if (filters.periodo) {
        evaluations = evaluations.filter(e => e.periodo === filters.periodo);
      }
      if (filters.personnel_id) {
        evaluations = evaluations.filter(
          e => e.personnel_id === filters.personnel_id
        );
      }
      if (filters.evaluador_id) {
        evaluations = evaluations.filter(
          e => e.evaluador_id === filters.evaluador_id
        );
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        evaluations = evaluations.filter(
          e =>
            e.periodo?.toLowerCase().includes(searchLower) ||
            e.personnel_id?.toLowerCase().includes(searchLower)
        );
      }

      // Sort by created_at desc
      evaluations.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Apply pagination
      const total = evaluations.length;
      const offset = (pagination.page - 1) * pagination.limit;
      const data = evaluations.slice(offset, offset + pagination.limit);

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
      console.error('Error getting paginated evaluations:', error);
      throw new Error('Error al obtener evaluaciones paginadas');
    }
  }

  static async create(
    data: Omit<PerformanceEvaluation, 'id' | 'created_at' | 'updated_at'>,
    organizationId?: string
  ): Promise<PerformanceEvaluation> {
    try {
      const db = getDb();
      const now = Timestamp.now();

      const docData = {
        ...data,
        organization_id: organizationId || data.organization_id,
        // Ensure defaults for optional fields
        estado: data.estado || 'borrador',
        resultado_global: data.resultado_global || 'Requiere Capacitación',
        competencias: data.competencias || [],
        fecha_evaluacion: toTimestamp(data.fecha_evaluacion),
        fechaProximaEvaluacion: data.fechaProximaEvaluacion
          ? toTimestamp(data.fechaProximaEvaluacion)
          : null,
        created_at: now,
        updated_at: now,
      };

      const docRef = await db.collection(COLLECTION_NAME).add(docData);

      const evaluationId = docRef.id;
      const evaluation: PerformanceEvaluation = {
        id: evaluationId,
        ...data,
        estado: data.estado || 'borrador',
        resultado_global: data.resultado_global || 'Requiere Capacitación',
        competencias: data.competencias || [],
        created_at: now.toDate(),
        updated_at: now.toDate(),
      };

      // Publicar evento en el calendario (solo si hay datos suficientes)
      if (data.titulo || data.periodo) {
        try {
          await EventPublisher.publishEvent('evaluations', {
            title: `Evaluación: ${data.titulo || data.periodo || 'Nueva'}`,
            description: data.personnel_id
              ? `Evaluación de desempeño - ${data.personnel_id}`
              : 'Nueva evaluación',
            date: data.fecha_evaluacion,
            type: 'evaluation',
            sourceRecordId: evaluationId,
            sourceRecordType: 'evaluation',
            priority: 'medium',
            responsibleUserId: data.evaluador_id || undefined,
            metadata: {
              evaluationId,
              personnelId: data.personnel_id || null,
              titulo: data.titulo || null,
              periodo: data.periodo || null,
              estado: data.estado || 'borrador',
            },
          });
        } catch (error) {
          console.error('Error publishing evaluation event:', error);
        }
      }

      return evaluation;
    } catch (error) {
      console.error('Error creating evaluation:', error);
      throw new Error('Error al crear evaluación');
    }
  }

  static async update(
    id: string,
    data: Partial<Omit<PerformanceEvaluation, 'id' | 'created_at'>>
  ): Promise<PerformanceEvaluation> {
    try {
      const db = getDb();
      const updateData: Record<string, any> = {
        ...data,
        updated_at: Timestamp.now(),
      };

      // Convert dates to Timestamps if present
      if (data.fecha_evaluacion) {
        updateData.fecha_evaluacion = toTimestamp(data.fecha_evaluacion);
      }
      if (data.fechaProximaEvaluacion) {
        updateData.fechaProximaEvaluacion = toTimestamp(
          data.fechaProximaEvaluacion
        );
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
        throw new Error('Evaluación no encontrada después de actualizar');
      }

      return updated;
    } catch (error) {
      console.error('Error updating evaluation:', error);
      throw new Error('Error al actualizar evaluación');
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      const db = getDb();
      await db.collection(COLLECTION_NAME).doc(id).delete();

      // Eliminar evento del calendario
      try {
        await EventPublisher.deletePublishedEvent('evaluations', id);
      } catch (error) {
        console.error('Error deleting evaluation event:', error);
      }
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      throw new Error('Error al eliminar evaluación');
    }
  }

  static async updateStatus(
    id: string,
    status: PerformanceEvaluation['estado']
  ): Promise<PerformanceEvaluation> {
    try {
      return await this.update(id, { estado: status });
    } catch (error) {
      console.error('Error updating evaluation status:', error);
      throw new Error('Error al actualizar estado de evaluación');
    }
  }

  static async getByPersonnel(
    personnelId: string
  ): Promise<PerformanceEvaluation[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('personnel_id', '==', personnelId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_evaluacion: toDate(doc.data().fecha_evaluacion),
        fechaProximaEvaluacion: toDate(doc.data().fechaProximaEvaluacion),
        created_at: toDate(doc.data().created_at),
        updated_at: toDate(doc.data().updated_at),
      })) as PerformanceEvaluation[];
    } catch (error) {
      console.error('Error getting evaluations by personnel:', error);
      throw new Error('Error al obtener evaluaciones por personal');
    }
  }

  static async getByEvaluator(
    evaluatorId: string
  ): Promise<PerformanceEvaluation[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('evaluador_id', '==', evaluatorId)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_evaluacion: toDate(doc.data().fecha_evaluacion),
        fechaProximaEvaluacion: toDate(doc.data().fechaProximaEvaluacion),
        created_at: toDate(doc.data().created_at),
        updated_at: toDate(doc.data().updated_at),
      })) as PerformanceEvaluation[];
    } catch (error) {
      console.error('Error getting evaluations by evaluator:', error);
      throw new Error('Error al obtener evaluaciones por evaluador');
    }
  }

  static async getByPeriod(period: string): Promise<PerformanceEvaluation[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('periodo', '==', period)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_evaluacion: toDate(doc.data().fecha_evaluacion),
        fechaProximaEvaluacion: toDate(doc.data().fechaProximaEvaluacion),
        created_at: toDate(doc.data().created_at),
        updated_at: toDate(doc.data().updated_at),
      })) as PerformanceEvaluation[];
    } catch (error) {
      console.error('Error getting evaluations by period:', error);
      throw new Error('Error al obtener evaluaciones por período');
    }
  }

  static async getPending(
    organizationId: string
  ): Promise<PerformanceEvaluation[]> {
    try {
      const db = getDb();
      const snapshot = await db
        .collection(COLLECTION_NAME)
        .where('organization_id', '==', organizationId)
        .where('estado', 'in', ['borrador', 'publicado'])
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_evaluacion: toDate(doc.data().fecha_evaluacion),
        fechaProximaEvaluacion: toDate(doc.data().fechaProximaEvaluacion),
        created_at: toDate(doc.data().created_at),
        updated_at: toDate(doc.data().updated_at),
      })) as PerformanceEvaluation[];
    } catch (error) {
      console.error('Error getting pending evaluations:', error);
      throw new Error('Error al obtener evaluaciones pendientes');
    }
  }

  // ===== MÉTODOS PARA ANÁLISIS DE BRECHAS =====

  /**
   * Crear evaluación desde plantilla del puesto
   */
  static async createFromPositionTemplate(
    personnelId: string
  ): Promise<PerformanceEvaluation> {
    try {
      const db = getDb();

      // Obtener empleado
      const personnelDoc = await db
        .collection('personnel')
        .doc(personnelId)
        .get();
      if (!personnelDoc.exists) {
        throw new Error('Empleado no encontrado');
      }
      const personnel = personnelDoc.data()!;

      if (!personnel.puestoId) {
        throw new Error('El empleado no tiene un puesto asignado');
      }

      // Obtener puesto
      const positionDoc = await db
        .collection('positions')
        .doc(personnel.puestoId)
        .get();
      if (!positionDoc.exists) {
        throw new Error('Puesto no encontrado');
      }
      const position = positionDoc.data()!;

      // Obtener competencias requeridas del puesto
      const competenceIds = position.competenciasRequeridas || [];
      if (competenceIds.length === 0) {
        throw new Error('El puesto no tiene competencias definidas');
      }

      // Crear estructura de competencias para la evaluación
      const competencePromises = competenceIds.map(
        async (competenceId: string) => {
          const compDoc = await db
            .collection('competencias')
            .doc(competenceId)
            .get();
          if (compDoc.exists) {
            const competence = compDoc.data()!;
            return {
              competenciaId: competenceId,
              nombreCompetencia: competence.nombre || '',
              nivelRequerido: 3,
              nivelEvaluado: 0,
              observaciones: '',
              brecha: 3,
            };
          }
          return null;
        }
      );

      const competenceEvaluations = (
        await Promise.all(competencePromises)
      ).filter(Boolean);

      // Crear evaluación
      const evaluationData = {
        personnel_id: personnelId,
        puestoId: personnel.puestoId,
        periodo: new Date().toISOString().slice(0, 7),
        fecha_evaluacion: new Date(),
        evaluador_id: '',
        competencias: competenceEvaluations,
        resultado_global: 'Requiere Capacitación' as const,
        fechaProximaEvaluacion:
          this.calculateNextEvaluationDateFromPosition(position),
        comentarios_generales: '',
        plan_mejora: '',
        estado: 'borrador' as const,
      };

      return await this.create(evaluationData);
    } catch (error) {
      console.error('Error creating evaluation from position template:', error);
      throw error instanceof Error
        ? error
        : new Error('Error al crear evaluación desde plantilla');
    }
  }

  /**
   * Calcular brechas de competencias para un empleado
   */
  static async calculateGaps(
    personnelId: string
  ): Promise<import('@/types/rrhh').CompetenceGap[]> {
    try {
      const db = getDb();

      // 1. Obtener empleado y su puesto
      const personnelDoc = await db
        .collection('personnel')
        .doc(personnelId)
        .get();
      if (!personnelDoc.exists) {
        throw new Error('Empleado no encontrado');
      }
      const personnel = personnelDoc.data()!;

      if (!personnel.puestoId) {
        return [];
      }

      // 2. Obtener competencias requeridas del puesto
      const positionDoc = await db
        .collection('positions')
        .doc(personnel.puestoId)
        .get();
      if (!positionDoc.exists) {
        return [];
      }
      const position = positionDoc.data()!;
      const competenceIds = position.competenciasRequeridas || [];

      if (competenceIds.length === 0) {
        return [];
      }

      // 3. Obtener última evaluación del empleado
      const evaluations = await this.getByPersonnel(personnelId);
      const lastEvaluation = evaluations
        .filter(e => e.estado === 'publicado')
        .sort(
          (a, b) => b.fecha_evaluacion.getTime() - a.fecha_evaluacion.getTime()
        )[0];

      // 4. Comparar competencias evaluadas vs requeridas
      const gaps: import('@/types/rrhh').CompetenceGap[] = [];

      for (const requiredCompId of competenceIds) {
        const compDoc = await db
          .collection('competencias')
          .doc(requiredCompId)
          .get();
        if (!compDoc.exists) continue;

        const competence = compDoc.data()!;
        const evaluatedComp = lastEvaluation?.competencias?.find(
          (c: CompetenceEvaluation) => c.competenciaId === requiredCompId
        );

        if (
          !evaluatedComp ||
          evaluatedComp.nivelEvaluado < evaluatedComp.nivelRequerido
        ) {
          const brecha = evaluatedComp
            ? evaluatedComp.nivelRequerido - evaluatedComp.nivelEvaluado
            : 3;

          gaps.push({
            personnelId,
            personnelName: `${personnel.nombres} ${personnel.apellidos}`,
            puestoId: personnel.puestoId,
            puestoName: position.nombre || '',
            competenciaId: requiredCompId,
            competenciaNombre: competence.nombre || '',
            nivelRequerido: evaluatedComp?.nivelRequerido || 3,
            nivelActual: evaluatedComp?.nivelEvaluado || 0,
            brecha,
            severidad: brecha >= 3 ? 'critica' : brecha >= 2 ? 'media' : 'baja',
            capacitacionesSugeridas: [],
            fechaUltimaEvaluacion: lastEvaluation?.fecha_evaluacion,
          });
        }
      }

      // 5. Buscar capacitaciones sugeridas para cada brecha
      for (const gap of gaps) {
        const trainings = await this.getSuggestedTrainings(gap.competenciaId);
        gap.capacitacionesSugeridas = trainings.map(t => t.id);
      }

      return gaps;
    } catch (error) {
      console.error('Error calculating gaps:', error);
      throw error instanceof Error
        ? error
        : new Error('Error al calcular brechas');
    }
  }

  /**
   * Obtener capacitaciones sugeridas para una competencia
   */
  private static async getSuggestedTrainings(
    competenceId: string
  ): Promise<any[]> {
    try {
      const db = getDb();
      // Simplified query - just get trainings that develop this competence
      const snapshot = await db
        .collection('trainings')
        .where('competenciasDesarrolladas', 'array-contains', competenceId)
        .get();

      // Filter completed trainings in memory
      return snapshot.docs
        .filter(doc => doc.data().estado === 'completada')
        .map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting suggested trainings:', error);
      return [];
    }
  }

  /**
   * Calcular fecha de próxima evaluación desde posición
   */
  private static calculateNextEvaluationDateFromPosition(
    position: Record<string, unknown>
  ): Date {
    const frecuencia = position?.frecuenciaEvaluacion || 12;
    const now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth() + Number(frecuencia || 0),
      now.getDate()
    );
  }

  /**
   * Obtener historial de evolución de una competencia
   */
  static async getCompetenceHistory(
    personnelId: string,
    competenceId: string
  ): Promise<any[]> {
    try {
      const evaluations = await this.getByPersonnel(personnelId);
      const history = [];

      for (const evaluation of evaluations) {
        if (evaluation.estado === 'publicado' && evaluation.competencias) {
          const competenceEval = evaluation.competencias.find(
            (c: CompetenceEvaluation) => c.competenciaId === competenceId
          );
          if (competenceEval) {
            history.push({
              fecha: evaluation.fecha_evaluacion,
              nivelEvaluado: competenceEval.nivelEvaluado,
              nivelRequerido: competenceEval.nivelRequerido,
              evaluador: evaluation.evaluador_id,
              periodo: evaluation.periodo,
            });
          }
        }
      }

      return history.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    } catch (error) {
      console.error('Error getting competence history:', error);
      throw new Error('Error al obtener historial de competencia');
    }
  }

  /**
   * Calcular fecha de próxima evaluación para un empleado
   */
  static async calculateNextEvaluationDate(personnelId: string): Promise<Date> {
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

      const positionDoc = await db
        .collection('positions')
        .doc(personnel.puestoId)
        .get();
      if (!positionDoc.exists) {
        throw new Error('Puesto no encontrado');
      }
      const position = positionDoc.data()!;

      return this.calculateNextEvaluationDateFromPosition(position);
    } catch (error) {
      console.error('Error calculating next evaluation date:', error);
      throw error instanceof Error
        ? error
        : new Error('Error al calcular próxima evaluación');
    }
  }
}
