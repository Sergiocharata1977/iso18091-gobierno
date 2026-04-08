/**
 * Servicio para Planificación y Revisión por la Dirección
 * Gestiona registros versionados de configuración organizacional
 * Colección: planificacion_revision_direccion
 * Versionado: Múltiples documentos por fecha
 */

import { getAdminFirestore } from '@/lib/firebase/admin';
import type {
  CreatePlanificacionRevisionDireccionData,
  CreatePoliticaData,
  PlanificacionRevisionDireccion,
  Politica,
  UpdatePoliticaData,
  UpdateSectionData,
} from '@/types/planificacion-revision-direccion';

const COLLECTION = 'planificacion_revision_direccion';

export class PlanificacionRevisionDireccionService {
  /**
   * Obtener instancia de Firestore Admin lazy
   */
  private static getDb() {
    return getAdminFirestore();
  }

  /**
   * Obtener la revisión vigente más reciente
   */
  static async getLatest(): Promise<PlanificacionRevisionDireccion | null> {
    try {
      const snapshot = await this.getDb()
        .collection(COLLECTION)
        .where('estado', '==', 'vigente')
        .orderBy('fecha_revision', 'desc')
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as PlanificacionRevisionDireccion;
    } catch (error) {
      console.error('Error al obtener revisión vigente:', error);
      throw new Error('Error al obtener la revisión vigente');
    }
  }

  /**
   * Obtener todas las revisiones (historial)
   */
  static async getAll(): Promise<PlanificacionRevisionDireccion[]> {
    try {
      const snapshot = await this.getDb()
        .collection(COLLECTION)
        .orderBy('fecha_revision', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PlanificacionRevisionDireccion[];
    } catch (error) {
      console.error('Error al obtener revisiones:', error);
      throw new Error('Error al obtener el historial de revisiones');
    }
  }

  /**
   * Obtener revisión por ID
   */
  static async getById(
    id: string
  ): Promise<PlanificacionRevisionDireccion | null> {
    try {
      const doc = await this.getDb().collection(COLLECTION).doc(id).get();

      if (!doc.exists) {
        return null;
      }

      return { id: doc.id, ...doc.data() } as PlanificacionRevisionDireccion;
    } catch (error) {
      console.error('Error al obtener revisión:', error);
      throw new Error('Error al obtener la revisión');
    }
  }

  /**
   * Crear nueva revisión
   */
  static async createRevision(
    data: CreatePlanificacionRevisionDireccionData
  ): Promise<PlanificacionRevisionDireccion> {
    try {
      const now = new Date().toISOString();

      const docData: Omit<PlanificacionRevisionDireccion, 'id'> = {
        fecha_revision: data.fecha_revision,
        periodo: data.periodo,
        estado: 'borrador',
        completado: {
          identidad: false,
          alcance: false,
          contexto: false,
          estructura: false,
          politicas: false,
        },
        IdentidadOrganizacional: {
          NOMBRE_ORGANIZACION: '',
          SECTOR: '',
          DESCRIPCION: '',
          TOTAL_EMPLEADOS: 0,
          EMPLEADOS_CON_ACCESO: 0,
          MISION: '',
          VISION: '',
          ...(data.IdentidadOrganizacional || {}),
        },
        AlcanceSGC: {
          DESCRIPCION: '',
          LIMITES: '',
          PRODUCTOS_SERVICIOS: [],
          UBICACIONES: [],
          ...(data.AlcanceSGC || {}),
        },
        Contexto: {
          FECHA_ANALISIS: now.split('T')[0],
          FRECUENCIA_REVISION: 'semestral',
          CUESTIONES_EXTERNAS: [],
          CUESTIONES_INTERNAS: [],
          ...(data.Contexto || {}),
        },
        Estructura: data.Estructura || {
          ORGANIGRAMA_URL: '',
          OTROS_DATOS: '',
        },
        Politicas: data.Politicas || [],
        created_at: now,
        updated_at: now,
        created_by: data.created_by,
      };

      const docRef = await this.getDb().collection(COLLECTION).add(docData);
      const created = await docRef.get();

      return {
        id: created.id,
        ...created.data(),
      } as PlanificacionRevisionDireccion;
    } catch (error) {
      console.error('Error al crear revisión:', error);
      throw error;
    }
  }

  /**
   * Actualizar una sección específica
   */
  static async updateSection(
    id: string,
    updateData: UpdateSectionData
  ): Promise<PlanificacionRevisionDireccion> {
    try {
      const docRef = this.getDb().collection(COLLECTION).doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('La revisión no existe');
      }

      const now = new Date().toISOString();

      // Actualizar la sección correspondiente
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any = {
        [updateData.section]: updateData.data,
        updated_at: now,
        updated_by: updateData.updated_by,
      };

      // Actualizar tracking de completado
      const sectionKey = updateData.section
        .toLowerCase()
        .replace('organizacional', '')
        .replace('sgc', '');
      if (sectionKey === 'identidad') {
        updates['completado.identidad'] = this.isSectionComplete(
          updateData.section,
          updateData.data
        );
      } else if (sectionKey === 'alcance') {
        updates['completado.alcance'] = this.isSectionComplete(
          updateData.section,
          updateData.data
        );
      } else if (sectionKey === 'contexto') {
        updates['completado.contexto'] = this.isSectionComplete(
          updateData.section,
          updateData.data
        );
      } else if (sectionKey === 'estructura') {
        updates['completado.estructura'] = this.isSectionComplete(
          updateData.section,
          updateData.data
        );
      } else if (sectionKey === 'politicas') {
        updates['completado.politicas'] =
          Array.isArray(updateData.data) && updateData.data.length > 0;
      }

      await docRef.update(updates);

      const updated = await docRef.get();
      return {
        id: updated.id,
        ...updated.data(),
      } as PlanificacionRevisionDireccion;
    } catch (error) {
      console.error('Error al actualizar sección:', error);
      throw error;
    }
  }

  /**
   * Marcar revisión como vigente (y otras como históricas)
   */
  static async markAsVigente(
    id: string
  ): Promise<PlanificacionRevisionDireccion> {
    try {
      const db = this.getDb();
      // Marcar todas las vigentes actuales como históricas
      const vigentesSnapshot = await db
        .collection(COLLECTION)
        .where('estado', '==', 'vigente')
        .get();

      const batch = db.batch();
      vigentesSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { estado: 'historico' });
      });

      // Marcar la nueva como vigente
      const docRef = db.collection(COLLECTION).doc(id);
      batch.update(docRef, {
        estado: 'vigente',
        updated_at: new Date().toISOString(),
      });

      await batch.commit();

      const updated = await docRef.get();
      return {
        id: updated.id,
        ...updated.data(),
      } as PlanificacionRevisionDireccion;
    } catch (error) {
      console.error('Error al marcar como vigente:', error);
      throw error;
    }
  }

  /**
   * Marcar revisión como histórica
   */
  static async markAsHistoric(id: string): Promise<void> {
    try {
      await this.getDb().collection(COLLECTION).doc(id).update({
        estado: 'historico',
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error al marcar como histórica:', error);
      throw error;
    }
  }

  /**
   * Agregar política a una revisión
   */
  static async addPolitica(
    revisionId: string,
    politicaData: CreatePoliticaData
  ): Promise<PlanificacionRevisionDireccion> {
    try {
      const db = this.getDb();
      const docRef = db.collection(COLLECTION).doc(revisionId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('La revisión no existe');
      }

      const currentData = doc.data() as Omit<
        PlanificacionRevisionDireccion,
        'id'
      >;
      const newPolitica: Politica = {
        id: db.collection('temp').doc().id, // Generate unique ID
        ...politicaData,
        version: politicaData.version || '1.0',
      };

      const updatedPoliticas = [...(currentData.Politicas || []), newPolitica];

      await docRef.update({
        Politicas: updatedPoliticas,
        'completado.politicas': updatedPoliticas.length > 0,
        updated_at: new Date().toISOString(),
      });

      const updated = await docRef.get();
      return {
        id: updated.id,
        ...updated.data(),
      } as PlanificacionRevisionDireccion;
    } catch (error) {
      console.error('Error al agregar política:', error);
      throw error;
    }
  }

  /**
   * Actualizar política en una revisión
   */
  static async updatePolitica(
    revisionId: string,
    politicaData: UpdatePoliticaData
  ): Promise<PlanificacionRevisionDireccion> {
    try {
      const docRef = this.getDb().collection(COLLECTION).doc(revisionId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('La revisión no existe');
      }

      const currentData = doc.data() as Omit<
        PlanificacionRevisionDireccion,
        'id'
      >;
      const updatedPoliticas = currentData.Politicas.map(p =>
        p.id === politicaData.id ? { ...p, ...politicaData } : p
      );

      await docRef.update({
        Politicas: updatedPoliticas,
        updated_at: new Date().toISOString(),
      });

      const updated = await docRef.get();
      return {
        id: updated.id,
        ...updated.data(),
      } as PlanificacionRevisionDireccion;
    } catch (error) {
      console.error('Error al actualizar política:', error);
      throw error;
    }
  }

  /**
   * Eliminar política de una revisión
   */
  static async deletePolitica(
    revisionId: string,
    politicaId: string
  ): Promise<PlanificacionRevisionDireccion> {
    try {
      const docRef = this.getDb().collection(COLLECTION).doc(revisionId);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('La revisión no existe');
      }

      const currentData = doc.data() as Omit<
        PlanificacionRevisionDireccion,
        'id'
      >;
      const updatedPoliticas = currentData.Politicas.filter(
        p => p.id !== politicaId
      );

      await docRef.update({
        Politicas: updatedPoliticas,
        'completado.politicas': updatedPoliticas.length > 0,
        updated_at: new Date().toISOString(),
      });

      const updated = await docRef.get();
      return {
        id: updated.id,
        ...updated.data(),
      } as PlanificacionRevisionDireccion;
    } catch (error) {
      console.error('Error al eliminar política:', error);
      throw error;
    }
  }

  /**
   * Eliminar revisión
   */
  static async delete(id: string): Promise<void> {
    try {
      await this.getDb().collection(COLLECTION).doc(id).delete();
    } catch (error) {
      console.error('Error al eliminar revisión:', error);
      throw new Error('Error al eliminar la revisión');
    }
  }

  /**
   * Verificar si una sección está completa
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static isSectionComplete(section: string, data: any): boolean {
    if (!data) return false;

    switch (section) {
      case 'IdentidadOrganizacional':
        return !!(
          data.NOMBRE_ORGANIZACION &&
          data.SECTOR &&
          data.DESCRIPCION &&
          data.MISION &&
          data.VISION
        );
      case 'AlcanceSGC':
        return !!(
          data.DESCRIPCION &&
          data.LIMITES &&
          data.PRODUCTOS_SERVICIOS?.length > 0 &&
          data.UBICACIONES?.length > 0
        );
      case 'Contexto':
        return !!(
          data.FECHA_ANALISIS &&
          data.CUESTIONES_EXTERNAS?.length > 0 &&
          data.CUESTIONES_INTERNAS?.length > 0
        );
      case 'Estructura':
        return !!(data.ORGANIGRAMA_URL || data.OTROS_DATOS);
      default:
        return false;
    }
  }
}
