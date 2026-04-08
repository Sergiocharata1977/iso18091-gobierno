import { db } from '@/lib/firebase';
import {
  Personnel,
  Position,
  PositionAssignmentsFormData,
  PositionFormData,
  PositionWithAssignments,
} from '@/types/rrhh';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const COLLECTION_NAME = 'positions';
const PERSONNEL_COLLECTION = 'personnel';

export class PositionService {
  /**
   * Obtener todos los puestos ordenados por nombre
   */
  static async getAll(organizationId: string): Promise<Position[]> {
    try {
      // Remove orderBy from Firestore query to avoid index requirement
      const q = query(
        collection(db, COLLECTION_NAME),
        where('organization_id', '==', organizationId)
      );
      const querySnapshot = await getDocs(q);

      const positions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as Position[];

      // Sort in memory by name (default behavior)
      return positions.sort((a, b) =>
        (a.nombre || '').localeCompare(b.nombre || '')
      );
    } catch (error) {
      console.error('Error getting positions:', error);
      throw new Error('Error al obtener puestos');
    }
  }

  /**
   * Obtener todos los puestos con conteo de personal
   */
  static async getAllWithPersonnelCount(
    organizationId: string
  ): Promise<PositionWithAssignments[]> {
    try {
      const positions = await this.getAll(organizationId);

      // Obtener conteo de personnel para cada position
      const positionsWithCount = await Promise.all(
        positions.map(async position => {
          const count = await this.getPersonnelCountInPosition(position.id);
          return {
            ...position,
            personnel_count: count,
          } as PositionWithAssignments;
        })
      );

      return positionsWithCount;
    } catch (error) {
      console.error('Error getting positions with personnel count:', error);
      throw new Error('Error al obtener puestos con conteo');
    }
  }

  /**
   * Obtener un puesto por ID
   */
  static async getById(id: string): Promise<Position | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data(),
          created_at: docSnap.data().created_at?.toDate() || new Date(),
          updated_at: docSnap.data().updated_at?.toDate() || new Date(),
        } as Position;
      }

      return null;
    } catch (error) {
      console.error('Error getting position by id:', error);
      throw new Error('Error al obtener puesto');
    }
  }

  /**
   * Obtener un puesto por ID con asignaciones expandidas
   * @deprecated Las asignaciones ahora están en Personnel, no en Position
   */
  static async getByIdWithAssignments(
    id: string
  ): Promise<PositionWithAssignments | null> {
    try {
      const position = await this.getById(id);

      if (!position) {
        return null;
      }

      // Asignaciones ahora están en Personnel - retornar vacío
      const personnel_count = await this.getPersonnelCountInPosition(id);

      return {
        ...position,
        procesos_details: [],
        objetivos_details: [],
        indicadores_details: [],
        personnel_count,
      } as PositionWithAssignments;
    } catch (error) {
      console.error('Error getting position with assignments:', error);
      throw new Error('Error al obtener puesto con asignaciones');
    }
  }

  /**
   * Crear un nuevo puesto
   */
  static async create(
    data: PositionFormData,
    organizationId: string
  ): Promise<string> {
    try {
      // Validar datos requeridos
      if (!data.nombre || data.nombre.trim() === '') {
        throw new Error('El nombre del puesto es requerido');
      }

      const now = Timestamp.now();
      const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        organization_id: organizationId,
        // Asignaciones eliminadas - ahora solo en Personnel
        created_at: now,
        updated_at: now,
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating position:', error);
      throw error instanceof Error ? error : new Error('Error al crear puesto');
    }
  }

  /**
   * Actualizar información básica del puesto
   */
  static async update(
    id: string,
    data: Partial<PositionFormData>
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('El puesto no existe');
      }

      await updateDoc(docRef, {
        ...data,
        updated_at: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating position:', error);
      throw error instanceof Error
        ? error
        : new Error('Error al actualizar puesto');
    }
  }

  /**
   * Eliminar un puesto (con validación de personnel activo)
   */
  static async delete(id: string): Promise<void> {
    try {
      // Verificar que no haya personnel activo con este puesto
      const personnelInPosition = await this.getPersonnelInPosition(id);
      const activePersonnel = personnelInPosition.filter(
        p => p.estado === 'Activo'
      );

      if (activePersonnel.length > 0) {
        throw new Error(
          `No se puede eliminar. Hay ${activePersonnel.length} persona(s) activa(s) en este puesto`
        );
      }

      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting position:', error);
      throw error instanceof Error
        ? error
        : new Error('Error al eliminar puesto');
    }
  }

  /**
   * Obtener personal en un puesto
   */
  static async getPersonnelInPosition(
    positionId: string
  ): Promise<Personnel[]> {
    try {
      const q = query(
        collection(db, PERSONNEL_COLLECTION),
        where('puesto', '==', positionId)
        // orderBy('apellidos', 'asc') // Comentado temporalmente - requiere índice
      );
      const querySnapshot = await getDocs(q);

      // Ordenar en memoria
      const personnel = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fecha_nacimiento: doc.data().fecha_nacimiento?.toDate(),
        fecha_contratacion: doc.data().fecha_contratacion?.toDate(),
        fecha_inicio_ventas: doc.data().fecha_inicio_ventas?.toDate(),
        created_at: doc.data().created_at?.toDate() || new Date(),
        updated_at: doc.data().updated_at?.toDate() || new Date(),
      })) as Personnel[];

      // Ordenar por apellidos en memoria
      return personnel.sort((a, b) =>
        (a.apellidos || '').localeCompare(b.apellidos || '')
      );
    } catch (error) {
      console.error('Error getting personnel in position:', error);
      throw new Error('Error al obtener personal del puesto');
    }
  }

  /**
   * Obtener conteo de personnel en un puesto
   */
  private static async getPersonnelCountInPosition(
    positionId: string
  ): Promise<number> {
    try {
      const q = query(
        collection(db, PERSONNEL_COLLECTION),
        where('puesto', '==', positionId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error counting personnel in position:', error);
      return 0;
    }
  }

  /**
   * Expandir IDs de procesos a objetos completos
   */
  private static async expandProcesses(
    processIds: string[]
  ): Promise<unknown[]> {
    if (processIds.length === 0) return [];

    try {
      const processes = await Promise.all(
        processIds.map(async id => {
          const docRef = doc(db, 'processDefinitions', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
          }
          return null;
        })
      );

      return processes.filter(p => p !== null);
    } catch (error) {
      console.error('Error expanding processes:', error);
      return [];
    }
  }

  /**
   * Expandir IDs de objetivos a objetos completos
   */
  private static async expandObjectives(
    objectiveIds: string[]
  ): Promise<unknown[]> {
    if (objectiveIds.length === 0) return [];

    try {
      const objectives = await Promise.all(
        objectiveIds.map(async id => {
          const docRef = doc(db, 'qualityObjectives', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
          }
          return null;
        })
      );

      return objectives.filter(o => o !== null);
    } catch (error) {
      console.error('Error expanding objectives:', error);
      return [];
    }
  }

  /**
   * Expandir IDs de indicadores a objetos completos
   */
  private static async expandIndicators(
    indicatorIds: string[]
  ): Promise<unknown[]> {
    if (indicatorIds.length === 0) return [];

    try {
      const indicators = await Promise.all(
        indicatorIds.map(async id => {
          const docRef = doc(db, 'qualityIndicators', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
          }
          return null;
        })
      );

      return indicators.filter(i => i !== null);
    } catch (error) {
      console.error('Error expanding indicators:', error);
      return [];
    }
  }

  /**
   * Actualizar asignaciones de contexto de un puesto
   */
  static async updateAssignments(
    id: string,
    assignments: PositionAssignmentsFormData
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error('El puesto no existe');
      }

      // Validar que los IDs existen
      await this.validateAssignments(assignments);

      // Actualizar asignaciones
      await updateDoc(docRef, {
        procesos_asignados: assignments.procesos_asignados,
        objetivos_asignados: assignments.objetivos_asignados,
        indicadores_asignados: assignments.indicadores_asignados,
        updated_at: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating position assignments:', error);
      throw error instanceof Error
        ? error
        : new Error('Error al actualizar asignaciones');
    }
  }

  /**
   * Propagar asignaciones del puesto a todo su personal
   * @deprecated Las asignaciones ahora se manejan directamente en Personnel
   */
  static async propagateAssignmentsToPersonnel(
    positionId: string
  ): Promise<number> {
    console.warn(
      'propagateAssignmentsToPersonnel is deprecated. Assignments are now managed directly on Personnel.'
    );
    return 0;
  }

  /**
   * Validar que los IDs de asignaciones existen
   */
  private static async validateAssignments(
    assignments: PositionAssignmentsFormData
  ): Promise<void> {
    const errors: string[] = [];

    // Validar procesos
    for (const processId of assignments.procesos_asignados) {
      const docRef = doc(db, 'processDefinitions', processId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        errors.push(`Proceso no encontrado: ${processId}`);
      }
    }

    // Validar objetivos
    for (const objectiveId of assignments.objetivos_asignados) {
      const docRef = doc(db, 'qualityObjectives', objectiveId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        errors.push(`Objetivo no encontrado: ${objectiveId}`);
      }
    }

    // Validar indicadores
    for (const indicatorId of assignments.indicadores_asignados) {
      const docRef = doc(db, 'qualityIndicators', indicatorId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        errors.push(`Indicador no encontrado: ${indicatorId}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
  }

  /**
   * Asignar una competencia a un puesto con nivel requerido
   */
  static async addCompetence(
    positionId: string,
    competenceId: string,
    nivelRequerido: number = 3
  ): Promise<void> {
    try {
      const position = await this.getById(positionId);
      if (!position) {
        throw new Error('Puesto no encontrado');
      }

      // Verificar que la competencia existe
      const competenceDoc = await getDoc(doc(db, 'competencias', competenceId));
      if (!competenceDoc.exists()) {
        throw new Error('Competencia no encontrada');
      }

      const competenceData = competenceDoc.data();

      // Crear estructura PositionCompetence
      const newCompetence = {
        competenciaId: competenceId,
        nombreCompetencia: competenceData.nombre || 'Sin nombre',
        nivelRequerido: nivelRequerido,
        esCritica: false,
      };

      // Agregar competencia si no está ya asignada
      const currentCompetences = position.competenciasRequeridas || [];
      const existingIndex = currentCompetences.findIndex(
        (c: any) => c.competenciaId === competenceId || c === competenceId
      );

      if (existingIndex === -1) {
        await updateDoc(doc(db, COLLECTION_NAME, positionId), {
          competenciasRequeridas: [...currentCompetences, newCompetence],
          updated_at: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Error adding competence to position:', error);
      throw error instanceof Error
        ? error
        : new Error('Error al asignar competencia');
    }
  }

  /**
   * Quitar una competencia de un puesto
   */
  static async removeCompetence(
    positionId: string,
    competenceId: string
  ): Promise<void> {
    try {
      const position = await this.getById(positionId);
      if (!position) {
        throw new Error('Puesto no encontrado');
      }

      // Remover competencia (soporta tanto PositionCompetence como string ID)
      const currentCompetences = position.competenciasRequeridas || [];
      const updatedCompetences = currentCompetences.filter((c: any) => {
        if (typeof c === 'string') {
          return c !== competenceId;
        }
        return c.competenciaId !== competenceId;
      });

      await updateDoc(doc(db, COLLECTION_NAME, positionId), {
        competenciasRequeridas: updatedCompetences,
        updated_at: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error removing competence from position:', error);
      throw error instanceof Error
        ? error
        : new Error('Error al quitar competencia');
    }
  }

  /**
   * Obtener competencias requeridas de un puesto (devuelve PositionCompetence[])
   */
  static async getCompetencesRequired(
    positionId: string
  ): Promise<import('@/types/rrhh').PositionCompetence[]> {
    try {
      const position = await this.getById(positionId);
      if (!position || !position.competenciasRequeridas) {
        return [];
      }

      // Si ya son objetos PositionCompetence, devolverlos directamente
      const competences = position.competenciasRequeridas;
      if (competences.length > 0 && typeof competences[0] === 'object') {
        return competences as import('@/types/rrhh').PositionCompetence[];
      }

      // Migración: si son strings, convertir a PositionCompetence
      const migratedCompetences = await Promise.all(
        competences.map(async (competenceId: any) => {
          const id =
            typeof competenceId === 'string'
              ? competenceId
              : competenceId.competenciaId;
          const docRef = doc(db, 'competencias', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return {
              competenciaId: docSnap.id,
              nombreCompetencia: docSnap.data().nombre || 'Sin nombre',
              nivelRequerido: 3, // Default
              esCritica: false,
            } as import('@/types/rrhh').PositionCompetence;
          }
          return null;
        })
      );

      return migratedCompetences.filter(
        (c): c is import('@/types/rrhh').PositionCompetence => c !== null
      );
    } catch (error) {
      console.error('Error getting competences for position:', error);
      throw new Error('Error al obtener competencias del puesto');
    }
  }

  /**
   * Actualizar frecuencia de evaluación de un puesto
   */
  static async updateFrecuenciaEvaluacion(
    positionId: string,
    meses: number
  ): Promise<void> {
    try {
      if (meses < 1 || meses > 60) {
        throw new Error('La frecuencia debe estar entre 1 y 60 meses');
      }

      await updateDoc(doc(db, COLLECTION_NAME, positionId), {
        frecuenciaEvaluacion: meses,
        updated_at: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating evaluation frequency:', error);
      throw error instanceof Error
        ? error
        : new Error('Error al actualizar frecuencia');
    }
  }

  /**
   * Validar que las competencias existen antes de asignar
   */
  static async validateCompetences(competenceIds: string[]): Promise<boolean> {
    try {
      for (const competenceId of competenceIds) {
        const docRef = doc(db, 'competencias', competenceId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error validating competences:', error);
      return false;
    }
  }
}
